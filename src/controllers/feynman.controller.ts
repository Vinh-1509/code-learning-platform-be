import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Block,
  Lesson,
  Milestone,
  UserMilestoneProgress,
} from '../models/learning_system.model';
import { ExerciseAttempt } from '../models/exercise_attempt.model';
import {
  averageMilestoneLessonCompletion,
  getOrCreateLessonProgress,
  isFirstMilestoneInRoadmap,
  recalcLessonCompletion,
  unlockNextMilestoneIfCompleted,
} from '../utils/learning_progress';
import { generateFeynmanFeedback } from '../services/feynman.service';
import type {
  IBlock,
  IBlockProgress,
  ILesson,
  IUserLessonProgress,
  ProgressStatus,
} from '../interfaces/learning_system.interface';
import type {
  FeynmanChatRequestBody,
  FeynmanChatResponse,
  FeynmanHistoryResponse,
  FeynmanQuestionResponse,
  FeynmanResetHistoryResponse,
  FeynmanStatsResponse,
} from '../interfaces/feynman.interface';

const FEYNMAN_MAX_CONSECUTIVE_FAILS = 10;
const FEYNMAN_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function authUserId(req: Request): string {
  return req.user!.id;
}

function isValidMessage(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getDefaultQuestion(): string {
  return 'Please explain the main idea of this block in your own words.';
}

function getBlockQuestion(block: { feynmanQuestion?: string }): string {
  return block.feynmanQuestion || getDefaultQuestion();
}

function compactContentItem(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== 'object') return null;

  const contentItem = item as Record<string, unknown>;
  const data =
    contentItem.data && typeof contentItem.data === 'object'
      ? (contentItem.data as Record<string, unknown>)
      : {};

  if (contentItem.type === 'theory') {
    return {
      type: 'theory',
      text: data.text,
    };
  }

  if (contentItem.type === 'code') {
    return {
      type: 'code',
      code: data.code,
      explanation: data.explanation,
    };
  }

  if (contentItem.type === 'practice') {
    return {
      type: 'practice',
      exerciseId: data.exerciseId,
      required: data.required,
    };
  }

  return null;
}

function getRequiredPracticeExerciseIds(content: unknown[]): string[] {
  return content.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const contentItem = item as Record<string, unknown>;
    if (contentItem.type !== 'practice') return [];
    if (!contentItem.data || typeof contentItem.data !== 'object') return [];

    const data = contentItem.data as Record<string, unknown>;
    if (data.required === false) return [];

    const exerciseId = data.exerciseId;
    if (exerciseId instanceof Types.ObjectId) {
      return [exerciseId.toString()];
    }
    if (typeof exerciseId === 'string') {
      return [exerciseId];
    }
    return [];
  });
}

function buildBlockContentSummary(block: {
  title: string;
  description?: string;
  content: unknown[];
  feynmanQuestion?: string;
}): string {
  return JSON.stringify(
    {
      title: block.title,
      description: block.description,
      feynmanQuestion: getBlockQuestion(block),
      content: block.content.map(compactContentItem).filter(Boolean),
    },
    null,
    2,
  );
}

function getFallbackBlockStatus(
  lessonBlockIds: Types.ObjectId[],
  blockId: string,
): ProgressStatus {
  const blockIndex = lessonBlockIds.findIndex(
    (lessonBlockId) => lessonBlockId.toString() === blockId,
  );

  return blockIndex === 0 ? 'active' : 'locked';
}

function getOrCreateBlockProgress(
  progress: IUserLessonProgress,
  lessonBlockIds: Types.ObjectId[],
  blockId: string,
  question: string,
): IBlockProgress {
  let blockProgress = progress.blockProgress.find(
    (bp) => bp.blockId.toString() === blockId,
  );

  if (!blockProgress) {
    blockProgress = {
      blockId: new Types.ObjectId(blockId),
      isFeynmanPassed: false,
      status: getFallbackBlockStatus(lessonBlockIds, blockId),
      chatHistory: [],
      feynmanFailCount: 0,
    };
    progress.blockProgress.push(blockProgress);
  }

  if (!Array.isArray(blockProgress.chatHistory)) {
    blockProgress.chatHistory = [];
  }

  if (blockProgress.chatHistory.length === 0) {
    blockProgress.chatHistory = [
      {
        role: 'assistant',
        content: question,
      },
    ];
  }

  return blockProgress;
}

function getRemainingCooldownMs(cooldownUntil: Date): number {
  return Math.max(0, cooldownUntil.getTime() - Date.now());
}

function formatRemainingCooldown(cooldownUntil: Date): string {
  const remainingMs = getRemainingCooldownMs(cooldownUntil);
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

  if (remainingMinutes < 60) {
    return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
  }

  const remainingHours = Math.ceil(remainingMinutes / 60);
  return `${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
}

function isCooldownActive(cooldownUntil: Date): boolean {
  const remainingMs = cooldownUntil.getTime() - Date.now();
  return remainingMs > 0;
}

function ensureFeynmanCooldownExpired(
  blockProgress: IBlockProgress,
  res: Response,
): boolean {
  if (blockProgress.status === 'completed') return true;

  const cooldownUntil = blockProgress.feynmanCooldownUntil;
  if (!cooldownUntil) return true;

  if (isCooldownActive(cooldownUntil)) {
    const remainingTime = formatRemainingCooldown(cooldownUntil);
    res.status(429).json({
      message: `You have failed many times. Try again after ${remainingTime}.`,
    });
    return false;
  }

  blockProgress.feynmanFailCount = 0;
  blockProgress.feynmanCooldownUntil = undefined;
  return true;
}

function ensureBlockUnlocked(
  blockProgress: IBlockProgress,
  res: Response,
): boolean {
  if (blockProgress.status !== 'locked') return true;

  res.status(403).json({
    message: 'Feynman is not available for a locked block',
  });
  return false;
}

async function areRequiredBlockExercisesPassed(
  userId: string,
  block: IBlock,
): Promise<boolean> {
  const requiredExerciseIds = getRequiredPracticeExerciseIds(block.content);
  if (requiredExerciseIds.length === 0) return true;

  const attempts = await ExerciseAttempt.find({
    userId,
    exerciseId: { $in: requiredExerciseIds },
    isPassed: true,
  })
    .select('exerciseId')
    .lean();
  const passedExerciseIds = new Set(
    attempts.map((attempt) => attempt.exerciseId.toString()),
  );

  return requiredExerciseIds.every((exerciseId) =>
    passedExerciseIds.has(exerciseId),
  );
}

async function ensureFeynmanReady(
  userId: string,
  block: IBlock,
  blockProgress: IBlockProgress,
  res: Response,
): Promise<boolean> {
  if (!ensureBlockUnlocked(blockProgress, res)) return false;
  if (blockProgress.status === 'completed') return true;

  const requiredExercisesPassed = await areRequiredBlockExercisesPassed(
    userId,
    block,
  );
  if (requiredExercisesPassed) return true;

  res.status(403).json({
    message: 'Complete all required exercises before starting Feynman',
  });
  return false;
}

async function updateMilestoneProgressAfterLessonChange(
  userId: string,
  lesson: ILesson,
): Promise<void> {
  const averageCompletion = await averageMilestoneLessonCompletion(
    userId,
    lesson.milestoneId,
  );
  const milestone = await Milestone.findById(lesson.milestoneId).lean();
  const milestoneProgress = await UserMilestoneProgress.findOne({
    userId,
    milestoneId: lesson.milestoneId,
  });

  if (!milestoneProgress) {
    const isFirst =
      milestone &&
      (await isFirstMilestoneInRoadmap(
        lesson.milestoneId,
        milestone.roadmapId,
      ));
    await UserMilestoneProgress.create({
      userId,
      milestoneId: lesson.milestoneId,
      completionPercentage: averageCompletion,
      status:
        averageCompletion === 100 ? 'completed' : isFirst ? 'active' : 'locked',
    });
  } else {
    milestoneProgress.completionPercentage = averageCompletion;
    if (averageCompletion === 100) {
      milestoneProgress.status = 'completed';
    } else if (milestoneProgress.status !== 'locked') {
      milestoneProgress.status = 'active';
    }
    await milestoneProgress.save();
  }

  if (averageCompletion === 100) {
    await unlockNextMilestoneIfCompleted(userId, lesson.milestoneId);
  }
}

async function completeBlockAfterFeynmanPass(
  userId: string,
  lesson: ILesson,
  block: IBlock,
  lessonProgress: IUserLessonProgress,
  blockProgress: IBlockProgress,
): Promise<void> {
  if (blockProgress.status === 'completed') {
    lessonProgress.markModified('blockProgress');
    await lessonProgress.save();
    return;
  }

  const blockIndex = lesson.blocks.findIndex(
    (blockId) => blockId.toString() === block._id.toString(),
  );
  if (blockIndex === -1 || blockProgress.status === 'locked') return;

  blockProgress.status = 'completed';

  if (blockIndex < lesson.blocks.length - 1) {
    const nextBlockId = lesson.blocks[blockIndex + 1];
    let nextBlockProgress = lessonProgress.blockProgress.find(
      (bp) => bp.blockId.toString() === nextBlockId.toString(),
    );

    if (!nextBlockProgress) {
      nextBlockProgress = {
        blockId: nextBlockId,
        isFeynmanPassed: false,
        status: 'locked',
        chatHistory: [],
        feynmanFailCount: 0,
      };
      lessonProgress.blockProgress.push(nextBlockProgress);
    }

    if (nextBlockProgress.status === 'locked') {
      nextBlockProgress.status = 'active';
    }
  }

  const { completionPercentage, isCompleted } = recalcLessonCompletion(
    lessonProgress.blockProgress,
    lesson.blocks.length,
  );
  lessonProgress.completionPercentage = completionPercentage;
  lessonProgress.isCompleted = isCompleted;
  lessonProgress.status = isCompleted ? 'completed' : 'active';
  lessonProgress.markModified('blockProgress');
  await lessonProgress.save();

  await updateMilestoneProgressAfterLessonChange(userId, lesson);
}

async function findBlockAndLesson(blockId: string) {
  const block = await Block.findById(blockId);
  if (!block) {
    return { block: null, lesson: null };
  }

  const lesson = await Lesson.findById(block.lessonId);
  return { block, lesson };
}

// api/feynman/block/:blockId/question
export const getBlockFeynmanQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const blockId = String(req.params.blockId);
    const { block, lesson } = await findBlockAndLesson(blockId);

    if (!block) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const progress = await getOrCreateLessonProgress(
      userId,
      lesson._id,
      lesson.blocks,
    );
    const blockProgress = getOrCreateBlockProgress(
      progress,
      lesson.blocks,
      blockId,
      getBlockQuestion(block),
    );

    if (!(await ensureFeynmanReady(userId, block, blockProgress, res))) return;

    const response: FeynmanQuestionResponse = {
      blockId,
      question: getBlockQuestion(block),
    };

    res.json(response);
  } catch (err) {
    console.error('Get Feynman question error:', err);
    res.status(500).json({ message: 'Failed to fetch Feynman question' });
  }
};

// api/feynman/block/:blockId/chat
export const postBlockFeynmanChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const blockId = String(req.params.blockId);
    const { message } = req.body as FeynmanChatRequestBody;

    if (!isValidMessage(message)) {
      res.status(400).json({ message: 'Message is required' });
      return;
    }

    const { block, lesson } = await findBlockAndLesson(blockId);
    if (!block) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const progress = await getOrCreateLessonProgress(
      userId,
      lesson._id,
      lesson.blocks,
    );
    const blockProgress = getOrCreateBlockProgress(
      progress,
      lesson.blocks,
      blockId,
      getBlockQuestion(block),
    );

    if (!(await ensureFeynmanReady(userId, block, blockProgress, res))) return;
    if (!ensureFeynmanCooldownExpired(blockProgress, res)) return;

    const aiResult = await generateFeynmanFeedback({
      contentSummary: buildBlockContentSummary(block),
      userMessage: message.trim(),
      chatHistory: blockProgress.chatHistory,
    });

    blockProgress.chatHistory.push({ role: 'user', content: message.trim() });
    blockProgress.chatHistory.push({
      role: 'assistant',
      content: aiResult.reply,
    });

    if (aiResult.isPassed && !blockProgress.isFeynmanPassed) {
      blockProgress.isFeynmanPassed = true;
    }

    if (aiResult.isPassed) {
      blockProgress.feynmanFailCount = 0;
      blockProgress.feynmanCooldownUntil = undefined;
      await completeBlockAfterFeynmanPass(
        userId,
        lesson,
        block,
        progress,
        blockProgress,
      );
    } else {
      blockProgress.feynmanFailCount =
        (blockProgress.feynmanFailCount ?? 0) + 1;

      if (blockProgress.feynmanFailCount >= FEYNMAN_MAX_CONSECUTIVE_FAILS) {
        blockProgress.feynmanCooldownUntil = new Date(
          Date.now() + FEYNMAN_COOLDOWN_MS,
        );
        progress.markModified('blockProgress');
        await progress.save();

        res.status(429).json({
          message: `You have failed many times. Try again after ${formatRemainingCooldown(
            blockProgress.feynmanCooldownUntil,
          )}.`,
        });
        return;
      }
      progress.markModified('blockProgress');
      await progress.save();
    }

    const response: FeynmanChatResponse = {
      blockId,
      reply: aiResult.reply,
      isPassed: aiResult.isPassed,
    };

    res.json(response);
  } catch (err) {
    console.error('Post Feynman chat error:', err);
    res.status(500).json({ message: 'Failed to process Feynman chat' });
  }
};

// api/feynman/block/:blockId/history
export const getBlockFeynmanHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const blockId = String(req.params.blockId);
    const { block, lesson } = await findBlockAndLesson(blockId);

    if (!block) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const progress = await getOrCreateLessonProgress(
      userId,
      lesson._id,
      lesson.blocks,
    );
    const blockProgress = getOrCreateBlockProgress(
      progress,
      lesson.blocks,
      blockId,
      getBlockQuestion(block),
    );

    if (!(await ensureFeynmanReady(userId, block, blockProgress, res))) return;

    progress.markModified('blockProgress');
    await progress.save();

    const response: FeynmanHistoryResponse = {
      blockId,
      chatHistory: blockProgress.chatHistory,
    };

    res.json(response);
  } catch (err) {
    console.error('Get Feynman history error:', err);
    res.status(500).json({ message: 'Failed to fetch Feynman history' });
  }
};

// api/feynman/block/:blockId/history/reset
export const resetBlockFeynmanHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const blockId = String(req.params.blockId);
    const { block, lesson } = await findBlockAndLesson(blockId);

    if (!block) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const progress = await getOrCreateLessonProgress(
      userId,
      lesson._id,
      lesson.blocks,
    );
    const question = getBlockQuestion(block);
    const blockProgress = getOrCreateBlockProgress(
      progress,
      lesson.blocks,
      blockId,
      question,
    );

    if (!(await ensureFeynmanReady(userId, block, blockProgress, res))) return;

    blockProgress.chatHistory = [
      {
        role: 'assistant',
        content: question,
      },
    ];

    const response: FeynmanResetHistoryResponse = {
      blockId,
      chatHistory: blockProgress.chatHistory,
      isFeynmanPassed: blockProgress.isFeynmanPassed,
    };

    res.json(response);
  } catch (err) {
    console.error('Reset Feynman history error:', err);
    res.status(500).json({ message: 'Failed to reset Feynman history' });
  }
};

// api/feynman/block/:blockId/stats
export const getBlockFeynmanStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const blockId = String(req.params.blockId);
    const { block, lesson } = await findBlockAndLesson(blockId);

    if (!block) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const progress = await getOrCreateLessonProgress(
      userId,
      lesson._id,
      lesson.blocks,
    );
    const blockProgress = getOrCreateBlockProgress(
      progress,
      lesson.blocks,
      blockId,
      getBlockQuestion(block),
    );

    if (!(await ensureFeynmanReady(userId, block, blockProgress, res))) return;

    const response: FeynmanStatsResponse = {
      blockId,
      isFeynmanPassed: blockProgress.isFeynmanPassed,
    };

    res.json(response);
  } catch (err) {
    console.error('Get Feynman stats error:', err);
    res.status(500).json({ message: 'Failed to fetch Feynman stats' });
  }
};
