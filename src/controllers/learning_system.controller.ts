import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Roadmap,
  Milestone,
  Lesson,
  Block,
  UserMilestoneProgress,
  UserLessonProgress,
} from '../models/learning_system.model';
import { LanguageInfo } from '../models/language_info.model';
import { ILanguageInfoResponse } from '../interfaces/learning_system.interface';
import User from '../models/user.model';
import {
  SUPPORTED_LANGUAGES,
  getOrCreateLessonProgress,
  recalcLessonCompletion,
  isFirstMilestoneInRoadmap,
  averageMilestoneLessonCompletion,
  unlockNextMilestoneIfCompleted,
} from '../utils/learning_progress';

function authUserId(req: Request): string {
  return req.user!.id;
}

/**
 * Helper: Enrich roadmap data with language info details (batched query)
 */
async function enrichLanguagesWithDetails(
  roadmaps: Array<{
    _id: Types.ObjectId;
    language: string;
    description?: string;
  }>,
) {
  const languages = roadmaps.map((r) => r.language);

  // 1. Fetch and cast using your existing interface
  const languageInfos = (await LanguageInfo.find({
    language: { $in: languages },
  }).lean()) as unknown as ILanguageInfoResponse[];

  // 2. Strongly type the map so ESLint knows exactly what properties exist
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

/**
 * SECURITY HELPER: Verify if a user is legally allowed to access/modify a lesson.
 * Checks if the parent Milestone is unlocked AND if the previous Lesson is completed.
 */
async function verifyLessonAccess(
  userId: string,
  lessonId: Types.ObjectId | string,
  milestoneId: Types.ObjectId | string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Changed 'let' to 'const'
  const milestoneProgress = await UserMilestoneProgress.findOne({
    userId,
    milestoneId,
  }).lean();

  // 1. Enforce Milestone Lock
  if (!milestoneProgress) {
    const milestone = await Milestone.findById(milestoneId).lean();
    if (!milestone) return { allowed: false, reason: 'Milestone not found' };

    const isFirst = await isFirstMilestoneInRoadmap(
      milestoneId.toString(),
      milestone.roadmapId,
    );

    if (isFirst) {
      // Just create it in the DB; no need to assign it to a variable
      await UserMilestoneProgress.create({
        userId,
        milestoneId,
        completionPercentage: 0,
        status: 'Active',
      });
    } else {
      return { allowed: false, reason: 'Milestone is locked' };
    }
  } else if (milestoneProgress.status === 'Locked') {
    return { allowed: false, reason: 'Milestone is locked' };
  }

  // 2. Enforce Previous Lesson Lock
  const allLessons = await Lesson.find({ milestoneId })
    .sort({ order: 1 })
    .select('_id')
    .lean();

  const lessonIndex = allLessons.findIndex(
    (l) => l._id.toString() === lessonId.toString(),
  );

  if (lessonIndex > 0) {
    const prevLessonId = allLessons[lessonIndex - 1]._id;
    const prevLessonProgress = await UserLessonProgress.findOne({
      userId,
      lessonId: prevLessonId,
    }).lean();

    if (!prevLessonProgress || !prevLessonProgress.isCompleted) {
      return { allowed: false, reason: 'Previous lesson is not completed' };
    }
  }

  return { allowed: true };
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
      selectedLanguage: user.selectedLanguage,
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
    if (!user?.selectedLanguage?.[0]) {
      res.status(400).json({ message: 'No language selected' });
      return;
    }
    const roadmap = await Roadmap.findOne({
      language: user.selectedLanguage[0],
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
          progress = await UserMilestoneProgress.create({
            userId: authUserId(req),
            milestoneId: milestone._id,
            completionPercentage: 0,
            status: index === 0 ? 'Active' : 'Locked',
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
        status: isFirst ? 'Active' : 'Locked',
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
      if (progress?.isCompleted) {
        status = 'completed';
      } else if (milestoneProgress?.status === 'Active') {
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

    // --- SECURITY/LOGIC FIX START ---
    const access = await verifyLessonAccess(
      authUserId(req),
      lesson._id,
      lesson.milestoneId,
    );
    if (!access.allowed) {
      res.status(403).json({ message: `Forbidden: ${access.reason}` });
      return;
    }
    // --- SECURITY/LOGIC FIX END ---

    const populatedBlocks = lesson.blocks as unknown as {
      _id: Types.ObjectId;
      content: unknown[];
      feynmanQuestion?: string;
    }[];
    const blockIds = populatedBlocks.map((b) => b._id);
    const progress = await getOrCreateLessonProgress(
      authUserId(req),
      lesson._id,
      blockIds,
    );
    progress.lastAccessed = new Date();
    await progress.save();
    const blocksWithProgress = populatedBlocks.map((block) => {
      const blockProg = progress.blockProgress.find(
        (bp) => bp.blockId.toString() === String(block._id),
      );
      return {
        _id: block._id,
        content: block.content,
        feynmanQuestion: block.feynmanQuestion,
        state: blockProg?.state ?? 'locked',
        isFeynmanPassed: blockProg?.isFeynmanPassed ?? false,
      };
    });
    res.json({
      _id: lesson._id,
      title: lesson.title,
      order: lesson.order,
      blocks: blocksWithProgress,
      progress: {
        completionPercentage: progress.completionPercentage,
        isCompleted: progress.isCompleted,
        lastAccessed: progress.lastAccessed,
      },
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
};

export const completeBlock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const blockId = String(req.params.blockId);
    const block = await Block.findById(blockId).lean();
    if (!block) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }
    const lesson = await Lesson.findById(block.lessonId).lean();
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    // --- SECURITY/LOGIC FIX START ---
    const access = await verifyLessonAccess(
      authUserId(req),
      lesson._id,
      lesson.milestoneId,
    );
    if (!access.allowed) {
      res.status(403).json({ message: `Forbidden: ${access.reason}` });
      return;
    }
    // --- SECURITY/LOGIC FIX END ---

    const lessonProgress = await getOrCreateLessonProgress(
      authUserId(req),
      block.lessonId,
      lesson.blocks,
    );
    const blockIndex = lesson.blocks.findIndex(
      (bid) => bid.toString() === blockId,
    );
    if (blockIndex === -1) {
      res.status(404).json({ message: 'Block not found in lesson' });
      return;
    }

    let currentBp = lessonProgress.blockProgress.find(
      (bp) => bp.blockId.toString() === blockId,
    );

    if (!currentBp) {
      currentBp = {
        blockId: block._id,
        isFeynmanPassed: false,
        state: blockIndex === 0 ? 'active' : 'locked',
      };
      lessonProgress.blockProgress.push(currentBp);
    }

    if (currentBp.state === 'locked') {
      res.status(403).json({
        message:
          'Forbidden: Cannot complete a locked block. Complete previous blocks first.',
      });
      return;
    }

    if (currentBp.state === 'completed') {
      res.json({
        message: 'Block already completed',
        lessonProgress: {
          completionPercentage: lessonProgress.completionPercentage,
          isCompleted: lessonProgress.isCompleted,
        },
      });
      return;
    }

    currentBp.state = 'completed';

    if (blockIndex < lesson.blocks.length - 1) {
      const nextBlockId = lesson.blocks[blockIndex + 1];
      let nextBp = lessonProgress.blockProgress.find(
        (bp) => bp.blockId.toString() === nextBlockId.toString(),
      );
      if (!nextBp) {
        nextBp = {
          blockId: nextBlockId,
          isFeynmanPassed: false,
          state: 'locked',
        };
        lessonProgress.blockProgress.push(nextBp);
      }
      if (nextBp.state === 'locked') {
        nextBp.state = 'active';
      }
    }

    const { completionPercentage, isCompleted } = recalcLessonCompletion(
      lessonProgress.blockProgress,
      lesson.blocks.length,
    );
    lessonProgress.completionPercentage = completionPercentage;
    lessonProgress.isCompleted = isCompleted;
    await lessonProgress.save();

    const averageCompletion = await averageMilestoneLessonCompletion(
      authUserId(req),
      lesson.milestoneId,
    );
    const milestone = await Milestone.findById(lesson.milestoneId).lean();
    let milestoneProgress = await UserMilestoneProgress.findOne({
      userId: authUserId(req),
      milestoneId: lesson.milestoneId,
    });

    if (!milestoneProgress) {
      const isFirst =
        milestone &&
        (await isFirstMilestoneInRoadmap(
          lesson.milestoneId,
          milestone.roadmapId,
        ));
      milestoneProgress = await UserMilestoneProgress.create({
        userId: authUserId(req),
        milestoneId: lesson.milestoneId,
        completionPercentage: averageCompletion,
        status:
          averageCompletion === 100
            ? 'Completed'
            : isFirst
              ? 'Active'
              : 'Locked',
      });
    } else {
      milestoneProgress.completionPercentage = averageCompletion;
      if (averageCompletion === 100) {
        milestoneProgress.status = 'Completed';
      } else if (milestoneProgress.status !== 'Locked') {
        milestoneProgress.status = 'Active';
      }
      await milestoneProgress.save();
    }

    if (averageCompletion === 100) {
      await unlockNextMilestoneIfCompleted(authUserId(req), lesson.milestoneId);
    }

    res.json({
      message: 'Block marked as completed',
      lessonProgress: {
        completionPercentage: lessonProgress.completionPercentage,
        isCompleted: lessonProgress.isCompleted,
      },
    });
  } catch {
    res.status(500).json({ message: 'Failed to complete block' });
  }
};
