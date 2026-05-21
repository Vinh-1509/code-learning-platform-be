import { Types } from 'mongoose';
import {
  Lesson,
  Milestone,
  UserLessonProgress,
  UserMilestoneProgress,
} from '../models/learning_system.model';
import type { IUserLessonProgress } from '../interfaces/learning_system.interface';

export type BlockProgressEntry = {
  blockId: Types.ObjectId;
  isFeynmanPassed: boolean;
  state: 'locked' | 'active' | 'completed';
};

export const SUPPORTED_LANGUAGES = ['C++', 'Java'] as const;

export function buildDefaultBlockProgress(
  blockIds: Types.ObjectId[],
): BlockProgressEntry[] {
  return blockIds.map((blockId, index) => ({
    blockId,
    isFeynmanPassed: false,
    state: index === 0 ? 'active' : 'locked',
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
    (bp) => bp.state === 'completed',
  ).length;
  const completionPercentage = (completed / totalBlocks) * 100;
  return {
    completionPercentage,
    isCompleted: completionPercentage === 100,
  };
}

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
  if (milestoneProgress?.status !== 'Completed') return;

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
      status: 'Active',
    });
  } else if (nextProgress.status === 'Locked') {
    nextProgress.status = 'Active';
    await nextProgress.save();
  }
}

export async function getOrCreateLessonProgress(
  userId: string,
  lessonId: Types.ObjectId,
  blockIds: Types.ObjectId[],
): Promise<IUserLessonProgress> {
  let progress = await UserLessonProgress.findOne({ userId, lessonId });

  if (!progress) {
    progress = await UserLessonProgress.create({
      userId,
      lessonId,
      blockProgress: buildDefaultBlockProgress(blockIds),
      chatHistory: [],
      completionPercentage: 0,
      isCompleted: false,
      lastAccessed: new Date(),
    });
    return progress;
  }

  if (!progress.blockProgress?.length && blockIds.length > 0) {
    progress.blockProgress = buildDefaultBlockProgress(blockIds);
    await progress.save();
  }

  return progress;
}
