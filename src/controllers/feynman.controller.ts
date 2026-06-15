import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Block, Lesson } from '../models/learning_system.model';
import { getOrCreateLessonProgress } from '../utils/learning_progress';
import { generateFeynmanFeedback } from '../services/feynman.service';
import type {
  IBlockProgress,
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

function authUserId(req: Request): string {
  return req.user!.id;
}

function isValidMessage(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getDefaultQuestion(): string {
  return 'Hãy giải thích lại ý chính của block này bằng lời của bạn.';
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

function ensureBlockCompleted(
  blockProgress: IBlockProgress,
  res: Response,
): boolean {
  if (blockProgress.status === 'completed') return true;

  res.status(403).json({
    message: 'Feynman is available only after the block is completed',
  });
  return false;
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

    if (!ensureBlockCompleted(blockProgress, res)) return;

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

    if (!ensureBlockCompleted(blockProgress, res)) return;

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

    progress.markModified('blockProgress');
    await progress.save();

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

    if (!ensureBlockCompleted(blockProgress, res)) return;

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

    if (!ensureBlockCompleted(blockProgress, res)) return;

    blockProgress.chatHistory = [
      {
        role: 'assistant',
        content: question,
      },
    ];

    progress.markModified('blockProgress');
    await progress.save();

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

    if (!ensureBlockCompleted(blockProgress, res)) return;

    progress.markModified('blockProgress');
    await progress.save();

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
