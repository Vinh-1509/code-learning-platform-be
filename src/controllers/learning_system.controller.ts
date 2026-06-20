import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Roadmap,
  Milestone,
  Lesson,
  UserMilestoneProgress,
  UserLessonProgress,
} from '../models/learning_system.model';
import { LanguageInfo } from '../models/language_info.model';
import { ILanguageInfoResponse } from '../interfaces/learning_system.interface';
import User from '../models/user.model';
import {
  SUPPORTED_LANGUAGES,
  getOrCreateLessonProgress,
  isFirstMilestoneInRoadmap,
} from '../utils/learning_progress';

function authUserId(req: Request): string {
  return req.user!.id;
}

// Enrich roadmaps with language_info data in one query to avoid per-language lookups.
async function enrichLanguagesWithDetails(
  roadmaps: Array<{
    _id: Types.ObjectId;
    language: string;
    description?: string;
  }>,
) {
  const languages = roadmaps.map((r) => r.language);

  const languageInfos = (await LanguageInfo.find({
    language: { $in: languages },
  }).lean()) as unknown as ILanguageInfoResponse[];

  const infoMap: Record<string, ILanguageInfoResponse> = Object.fromEntries(
    languageInfos.map((li) => [li.language, li]),
  );

  return roadmaps.map((r) => ({
    _id: r._id,
    language: r.language,
    info: infoMap[r.language]?.info ?? r.description ?? '',
    strengths: infoMap[r.language]?.strengths ?? [],
    challenges: infoMap[r.language]?.challenges ?? [],
    useCases: infoMap[r.language]?.useCases ?? [],
  }));
}

// ─── Languages APIs ──────────────────────────────────────────────────────────

export const getAllLanguages = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const roadmaps = await Roadmap.find(
      { language: { $in: SUPPORTED_LANGUAGES } },
      { language: 1, description: 1 },
    )
      .sort({ language: 1 })
      .lean();
    const languagesWithDetails = await enrichLanguagesWithDetails(roadmaps);
    res.json(languagesWithDetails);
  } catch {
    res.status(500).json({ message: 'Failed to fetch languages' });
  }
};

export const getLanguageById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const roadmap = await Roadmap.findById(req.params.languageId)
      .select('language description')
      .lean();
    if (!roadmap) {
      res.status(404).json({ message: 'Language not found' });
      return;
    }
    const enriched = await enrichLanguagesWithDetails([roadmap]);
    res.json(enriched[0]);
  } catch {
    res.status(500).json({ message: 'Failed to fetch language' });
  }
};

export const selectLanguage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { language } = req.body as { language: string };
    if (!language || typeof language !== 'string') {
      res.status(400).json({ message: 'Language is required' });
      return;
    }
    if (
      !SUPPORTED_LANGUAGES.includes(
        language as (typeof SUPPORTED_LANGUAGES)[number],
      )
    ) {
      res.status(400).json({ message: 'Language must be C++ or Java' });
      return;
    }
    const roadmap = await Roadmap.findOne({ language }).lean();
    if (!roadmap) {
      res.status(404).json({ message: 'Language not found' });
      return;
    }
    const user = await User.findByIdAndUpdate(
      authUserId(req),
      { selectedLanguage: [language] },
      { new: true },
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({
      message: 'Language updated successfully',
      selectedLanguage: user.selectedLanguage ?? [],
    });
  } catch {
    res.status(500).json({ message: 'Failed to select language' });
  }
};

// ─── Learning APIs ────────────────────────────────────────────────────────────

export const getMilestones = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = await User.findById(authUserId(req)).lean();
    const roadmap = await Roadmap.findOne({
      language: user!.selectedLanguage![0],
    }).lean();
    if (!roadmap) {
      res
        .status(404)
        .json({ message: 'Roadmap not found for selected language' });
      return;
    }
    const milestones = await Milestone.find({ roadmapId: roadmap._id })
      .sort({ order: 1 })
      .lean();
    const milestonesWithProgress = await Promise.all(
      milestones.map(async (milestone, index) => {
        let progress = await UserMilestoneProgress.findOne({
          userId: authUserId(req),
          milestoneId: milestone._id,
        });

        if (!progress) {
          // Progress is initialized lazily; only the first milestone starts active.
          progress = await UserMilestoneProgress.create({
            userId: authUserId(req),
            milestoneId: milestone._id,
            completionPercentage: 0,
            status: index === 0 ? 'active' : 'locked',
          });
        }

        return {
          _id: milestone._id,
          title: milestone.title,
          description: milestone.description,
          order: milestone.order,
          progress: {
            status: progress.status,
            completionPercentage: progress.completionPercentage,
          },
        };
      }),
    );
    res.json(milestonesWithProgress);
  } catch {
    res.status(500).json({ message: 'Failed to fetch milestones' });
  }
};

export const getMilestoneById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const milestoneId = String(req.params.milestoneId);
    const milestone = await Milestone.findById(milestoneId).lean();
    if (!milestone) {
      res.status(404).json({ message: 'Milestone not found' });
      return;
    }
    const isFirst = await isFirstMilestoneInRoadmap(
      milestoneId,
      milestone.roadmapId,
    );
    let progress = await UserMilestoneProgress.findOne({
      userId: authUserId(req),
      milestoneId,
    });
    if (!progress) {
      progress = await UserMilestoneProgress.create({
        userId: authUserId(req),
        milestoneId,
        completionPercentage: 0,
        status: isFirst ? 'active' : 'locked',
      });
    }
    res.json({
      _id: milestone._id,
      title: milestone.title,
      description: milestone.description,
      order: milestone.order,
      progress: {
        status: progress.status,
        completionPercentage: progress.completionPercentage,
        updatedAt: progress.updatedAt ?? undefined,
      },
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch milestone' });
  }
};

export const getLessonsByMilestone = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const milestoneId = String(req.params.milestoneId);
    const userId = authUserId(req);
    const milestone = await Milestone.findById(milestoneId).lean();
    if (!milestone) {
      res.status(404).json({ message: 'Milestone not found' });
      return;
    }
    const milestoneProgress = await UserMilestoneProgress.findOne({
      userId,
      milestoneId,
    }).lean();
    const lessons = await Lesson.find({ milestoneId })
      .sort({ order: 1 })
      .lean();
    const allProgress = await UserLessonProgress.find({
      userId,
      lessonId: { $in: lessons.map((l) => l._id) },
    }).lean();
    const progressMap = Object.fromEntries(
      allProgress.map((p) => [p.lessonId.toString(), p]),
    );
    const lessonsWithProgress = lessons.map((lesson, index) => {
      const progress = progressMap[lesson._id.toString()];
      let status: 'completed' | 'active' | 'locked' = 'locked';
      // Lesson access is sequential inside an active milestone.
      if (progress?.isCompleted) {
        status = 'completed';
      } else if (milestoneProgress?.status === 'active') {
        if (index === 0) {
          status = 'active';
        } else {
          const previousLesson = lessons[index - 1];
          const previousProgress = progressMap[previousLesson._id.toString()];
          if (previousProgress?.isCompleted) {
            status = 'active';
          }
        }
      }
      return {
        _id: lesson._id,
        title: lesson.title,
        order: lesson.order,
        progress: {
          status,
          isCompleted: progress?.isCompleted ?? false,
          completionPercentage: progress?.completionPercentage ?? 0,
        },
      };
    });
    res.json(lessonsWithProgress);
  } catch {
    res.status(500).json({ message: 'Failed to fetch lessons' });
  }
};

export const getLessonById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const lessonId = String(req.params.lessonId);
    const lesson = await Lesson.findById(lessonId).populate('blocks').lean();
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const populatedBlocks = lesson.blocks as unknown as {
      _id: Types.ObjectId;
      title: string;
      description?: string;
      content: unknown[];
      feynmanQuestion?: string;
    }[];
    const blockIds = populatedBlocks.map((b) => b._id);
    const progress = await getOrCreateLessonProgress(
      authUserId(req),
      lesson._id,
      blockIds,
    );
    // Opening a lesson updates recency and creates missing block progress.
    progress.lastAccessed = new Date();
    await progress.save();
    const blocksWithProgress = populatedBlocks.map((block) => {
      const blockProg = progress.blockProgress.find(
        (bp) => bp.blockId.toString() === String(block._id),
      );
      return {
        _id: block._id,
        title: block.title,
        description: block.description,
        content: block.content,
        feynmanQuestion: block.feynmanQuestion,
        status: blockProg?.status ?? 'locked',
        isFeynmanPassed: blockProg?.isFeynmanPassed ?? false,
      };
    });
    res.json({
      _id: lesson._id,
      title: lesson.title,
      order: lesson.order,
      blocks: blocksWithProgress,
      progress: {
        status: progress.status,
        completionPercentage: progress.completionPercentage,
        isCompleted: progress.isCompleted,
        lastAccessed: progress.lastAccessed,
      },
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
};
