import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import mongoose, { Types } from 'mongoose';
import {
  UserMilestoneProgress,
  Milestone,
  Lesson,
  UserLessonProgress,
  Block,
} from '../models/learning_system.model';
import { isFirstMilestoneInRoadmap } from '../utils/learning_progress';

// ─── Middleware: Validate ObjectId ───────────────────────────────────────────

/**
 * Validates a route param is a valid MongoDB ObjectId.
 * Usage: validateObjectId('milestoneId')
 */
export const validateObjectId =
  (paramName: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName] as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: `Invalid ${paramName}` });
      return;
    }
    next();
  };

// ─── Middleware: Require Language Selected ───────────────────────────────────

/**
 * Ensures the authenticated user has a selectedLanguage before
 * accessing any learning route that depends on it.
 */
export const requireLanguageSelected = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    if (!user.selectedLanguage?.[0]) {
      res.status(400).json({ message: 'No language selected' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Middleware: Verify Lesson Access ─────────────────────────────────

async function verifyLessonAccess(
  userId: string,
  lessonId: Types.ObjectId | string,
  milestoneId: Types.ObjectId | string,
): Promise<{ allowed: boolean; reason?: string }> {
  const milestoneProgress = await UserMilestoneProgress.findOne({
    userId,
    milestoneId,
  }).lean();

  // Create first-milestone progress on demand; all later milestones stay locked.
  if (!milestoneProgress) {
    const milestone = await Milestone.findById(milestoneId).lean();

    if (!milestone) {
      return {
        allowed: false,
        reason: 'Milestone not found',
      };
    }

    const isFirst = await isFirstMilestoneInRoadmap(
      milestoneId.toString(),
      milestone.roadmapId,
    );

    if (isFirst) {
      await UserMilestoneProgress.create({
        userId,
        milestoneId,
        completionPercentage: 0,
        status: 'active',
      });
    } else {
      return {
        allowed: false,
        reason: 'Milestone is locked',
      };
    }
  } else if (milestoneProgress.status === 'locked') {
    return {
      allowed: false,
      reason: 'Milestone is locked',
    };
  }

  // Lessons after the first require the previous lesson to be completed.
  const allLessons = await Lesson.find({ milestoneId })
    .sort({ order: 1 })
    .select('_id')
    .lean();

  const lessonIndex = allLessons.findIndex(
    (lesson) => lesson._id.toString() === lessonId.toString(),
  );

  if (lessonIndex > 0) {
    const previousLessonId = allLessons[lessonIndex - 1]._id;

    const previousLessonProgress = await UserLessonProgress.findOne({
      userId,
      lessonId: previousLessonId,
    }).lean();

    if (!previousLessonProgress?.isCompleted) {
      return {
        allowed: false,
        reason: 'Previous lesson is not completed',
      };
    }
  }

  return {
    allowed: true,
  };
}

// ─── Middleware: Require Lesson Access ───────────────────────────────────────

/**
 * Ensures:
 * - Milestone is unlocked
 * - Previous lesson is completed
 */
export const requireLessonAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lessonId = req.params.lessonId as string;

    const lesson = await Lesson.findById(lessonId).lean();

    if (!lesson) {
      res.status(404).json({
        message: 'Lesson not found',
      });
      return;
    }

    const access = await verifyLessonAccess(
      req.user!.id,
      lesson._id,
      lesson.milestoneId,
    );

    if (!access.allowed) {
      res.status(403).json({
        message: `Forbidden: ${access.reason}`,
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      message: 'Internal server error',
    });
  }
};

// ─── Middleware: Require Block Access ────────────────────────────────────────

export const requireBlockAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Block completion uses lesson-level access rules before checking block status.
    const blockId = req.params.blockId as string;

    const block = await Block.findById(blockId).lean();

    if (!block) {
      res.status(404).json({
        message: 'Block not found',
      });
      return;
    }

    const lesson = await Lesson.findById(block.lessonId).lean();

    if (!lesson) {
      res.status(404).json({
        message: 'Lesson not found',
      });
      return;
    }

    const access = await verifyLessonAccess(
      req.user!.id,
      lesson._id,
      lesson.milestoneId,
    );

    if (!access.allowed) {
      res.status(403).json({
        message: `Forbidden: ${access.reason}`,
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      message: 'Internal server error',
    });
  }
};
