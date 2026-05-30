import { Types } from 'mongoose';
import {
  Lesson,
  Milestone,
  UserLessonProgress,
  UserMilestoneProgress,
} from '../models/learning_system.model';
import type {
  IUserLessonProgress,
  ProgressStatus,
} from '../interfaces/learning_system.interface';

export type BlockProgressEntry = {
  blockId: Types.ObjectId;
  isFeynmanPassed: boolean;
  status: ProgressStatus;
};

export const SUPPORTED_LANGUAGES = ['C++', 'Java'] as const;

export function buildDefaultBlockProgress(
  blockIds: Types.ObjectId[],
): BlockProgressEntry[] {
  // A new lesson starts with only the first block available.
  return blockIds.map((blockId, index) => ({
    blockId,
    isFeynmanPassed: false,
    status: index === 0 ? 'active' : 'locked',
  }));
}

export function recalcLessonCompletion(
  blockProgress: BlockProgressEntry[],
  totalBlocks: number,
): { completionPercentage: number; isCompleted: boolean } {
  if (totalBlocks === 0) {
    return { completionPercentage: 0, isCompleted: false };
  }
  const completed = blockProgress.filter(
    (bp) => bp.status === 'completed',
  ).length;
  const completionPercentage = (completed / totalBlocks) * 100;
  return {
    completionPercentage,
    isCompleted: completionPercentage === 100,
  };
}

// A milestone is initially available only when it is the first one in its roadmap.
export async function isFirstMilestoneInRoadmap(
  milestoneId: Types.ObjectId | string,
  roadmapId: Types.ObjectId,
): Promise<boolean> {
  const first = await Milestone.findOne({ roadmapId })
    .sort({ order: 1 })
    .select('_id')
    .lean();
  return first?._id.toString() === milestoneId.toString();
}

export async function averageMilestoneLessonCompletion(
  userId: string,
  milestoneId: Types.ObjectId,
): Promise<number> {
  const allLessons = await Lesson.find({ milestoneId }).lean();
  if (allLessons.length === 0) return 0;

  const percentages = await Promise.all(
    allLessons.map(async (lesson) => {
      const progress = await UserLessonProgress.findOne({
        userId,
        lessonId: lesson._id,
      }).lean();
      return progress?.completionPercentage ?? 0;
    }),
  );

  return percentages.reduce((sum, p) => sum + p, 0) / allLessons.length;
}

export async function unlockNextMilestoneIfCompleted(
  userId: string,
  milestoneId: Types.ObjectId,
): Promise<void> {
  const milestoneProgress = await UserMilestoneProgress.findOne({
    userId,
    milestoneId,
  });
  if (milestoneProgress?.status !== 'completed') return;

  const currentMilestone = await Milestone.findById(milestoneId).lean();
  if (!currentMilestone) return;

  const nextMilestone = await Milestone.findOne({
    roadmapId: currentMilestone.roadmapId,
    order: currentMilestone.order + 1,
  }).lean();

  if (!nextMilestone) return;

  const nextProgress = await UserMilestoneProgress.findOne({
    userId,
    milestoneId: nextMilestone._id,
  });

  if (!nextProgress) {
    await UserMilestoneProgress.create({
      userId,
      milestoneId: nextMilestone._id,
      completionPercentage: 0,
      status: 'active',
    });
  } else if (nextProgress.status === 'locked') {
    nextProgress.status = 'active';
    await nextProgress.save();
  }
}

export async function getOrCreateLessonProgress(
  userId: string,
  lessonId: Types.ObjectId,
  blockIds: Types.ObjectId[],
  initialStatus: ProgressStatus = 'active',
): Promise<IUserLessonProgress> {
  let progress = await UserLessonProgress.findOne({ userId, lessonId });

  if (!progress) {
    // Create progress lazily when the user first opens or completes a lesson.
    progress = await UserLessonProgress.create({
      userId,
      lessonId,
      status: initialStatus,
      blockProgress: buildDefaultBlockProgress(blockIds),
      chatHistory: [],
      completionPercentage: 0,
      isCompleted: false,
      lastAccessed: new Date(),
    });
    return progress;
  }

  if (!progress.status) {
    // Backfill old progress records created before lesson status existed.
    progress.status = progress.isCompleted ? 'completed' : initialStatus;
    await progress.save();
  }

  if (!progress.blockProgress?.length && blockIds.length > 0) {
    // Backfill block progress for older records or newly attached blocks.
    progress.blockProgress = buildDefaultBlockProgress(blockIds);
    await progress.save();
  }

  return progress;
}
