import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Exercise, IExercise } from '../models/exercise.model';
import { ExerciseAttempt } from '../models/exercise_attempt.model';
import { gradeExerciseAnswer } from '../utils/exercise_grading';
import type {
  ExerciseAttemptResponse,
  ExerciseAttemptItem,
  HintResponse,
  PracticeExerciseDetailResponse,
  PracticeExerciseListItem,
  PracticeExerciseListResponse,
  PracticeExerciseQuery,
  SubmitExerciseRequestBody,
  SubmitExerciseResponse,
} from '../interfaces/practice.interface';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const SUPPORTED_LANGUAGES = ['C++', 'Java'] as const;
const SUPPORTED_LEVELS = ['easy', 'medium', 'hard'] as const;

function authUserId(req: Request): string {
  return req.user!.id;
}

function isAnswerPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max?: number,
): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return max ? Math.min(parsed, max) : parsed;
}

function isSupportedLanguage(
  value: string,
): value is (typeof SUPPORTED_LANGUAGES)[number] {
  return SUPPORTED_LANGUAGES.includes(
    value as (typeof SUPPORTED_LANGUAGES)[number],
  );
}

function isSupportedLevel(
  value: string,
): value is (typeof SUPPORTED_LEVELS)[number] {
  return SUPPORTED_LEVELS.includes(value as (typeof SUPPORTED_LEVELS)[number]);
}

function toListItem(exercise: IExercise): PracticeExerciseListItem {
  return {
    _id: exercise._id,
    title: exercise.title,
    instruction: exercise.instruction,
    language: exercise.language,
    type: exercise.type,
    level: exercise.level,
    order: exercise.order,
  };
}

function toDetailResponse(exercise: IExercise): PracticeExerciseDetailResponse {
  return {
    ...toListItem(exercise),
    data: exercise.data,
    hints: exercise.hints,
  };
}

async function getLatestAttemptState(
  userId: string,
  exerciseId: string,
): Promise<{ attemptNumber: number; hintLevel: number }> {
  const attempt = await ExerciseAttempt.findOne({ userId, exerciseId })
    .select('attemptNumber hintLevel')
    .lean();

  return {
    attemptNumber: attempt?.attemptNumber ?? 0,
    hintLevel: attempt?.hintLevel ?? 0,
  };
}

// GET /api/practice/exercises
export const getPracticeExercises = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = req.query as PracticeExerciseQuery;
    const page = parsePositiveInt(query.page, DEFAULT_PAGE);
    const limit = parsePositiveInt(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    // Calculate how many documents to skip based on the current page and limit
    const skip = (page - 1) * limit;
    const filter: mongoose.QueryFilter<IExercise> = {};

    if (query.q) {
      filter.$or = [
        { title: { $regex: query.q, $options: 'i' } },
        { instruction: { $regex: query.q, $options: 'i' } },
      ];
    }

    if (query.language && isSupportedLanguage(query.language)) {
      filter.language = query.language;
    }

    if (query.difficulty && isSupportedLevel(query.difficulty)) {
      filter.level = query.difficulty;
    }

    const [total, exercises] = await Promise.all([
      Exercise.countDocuments(filter),
      Exercise.find(filter)
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const response: PracticeExerciseListResponse = {
      total,
      page,
      limit,
      data: exercises.map(toListItem),
    };

    res.json(response);
  } catch (err) {
    console.error('Get practice exercises error:', err);
    res.status(500).json({ message: 'Failed to fetch exercises' });
  }
};

// GET /api/practice/exercises/:exerciseId
export const getPracticeExerciseById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exerciseId = String(req.params.exerciseId);
    const exercise = await Exercise.findById(exerciseId);

    if (!exercise) {
      res.status(404).json({ message: 'Exercise not found' });
      return;
    }

    res.json(toDetailResponse(exercise));
  } catch (err) {
    console.error('Get practice exercise error:', err);
    res.status(500).json({ message: 'Failed to fetch exercise' });
  }
};

// POST /api/practice/exercises/:exerciseId/submit
export const submitPracticeExercise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const exerciseId = String(req.params.exerciseId);
    const { answer } = req.body as SubmitExerciseRequestBody;

    if (!isAnswerPayload(answer)) {
      res.status(400).json({ message: 'Answer must be an object' });
      return;
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      res.status(404).json({ message: 'Exercise not found' });
      return;
    }

    const grading = gradeExerciseAnswer(answer, exercise.correctAnswer);
    const latestAttempt = await getLatestAttemptState(userId, exerciseId);
    const attemptNumber = latestAttempt.attemptNumber + 1;
    const items: ExerciseAttemptItem[] = grading.items.map(
      ({ field, isCorrect }) => ({
        field,
        isCorrect,
      }),
    );

    await ExerciseAttempt.findOneAndUpdate(
      { userId, exerciseId },
      {
        userId,
        exerciseId,
        isPassed: grading.isCorrect,
        items,
        hintLevel: latestAttempt.hintLevel,
        userAnswer: answer,
        attemptNumber,
        attemptedAt: new Date(),
      },
      { new: true, upsert: true },
    );

    const response: SubmitExerciseResponse = {
      correct: grading.isCorrect,
      items,
      attemptNumber,
    };

    res.json(response);
  } catch (err) {
    console.error('Submit practice exercise error:', err);
    res.status(500).json({ message: 'Failed to submit exercise' });
  }
};

// POST /api/practice/exercises/:exerciseId/hint
export const requestPracticeHint = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const exerciseId = String(req.params.exerciseId);
    const exercise = await Exercise.findById(exerciseId);

    if (!exercise) {
      res.status(404).json({ message: 'Exercise not found' });
      return;
    }

    const latestAttempt = await getLatestAttemptState(userId, exerciseId);
    const currentHintLevel = latestAttempt.hintLevel;
    const nextHintLevel = currentHintLevel + 1;
    const hint = exercise.hints?.[String(nextHintLevel)] ?? null;
    const hintLevel = hint ? nextHintLevel : currentHintLevel;

    await ExerciseAttempt.findOneAndUpdate(
      { userId, exerciseId },
      {
        $setOnInsert: {
          userId,
          exerciseId,
          isPassed: false,
          items: [],
          attemptNumber: 0,
        },
        hintLevel,
        attemptedAt: new Date(),
      },
      { new: true, upsert: true },
    );

    const response: HintResponse = {
      hintLevel,
      hint: hint
        ? hint
        : (exercise.hints?.[String(currentHintLevel)] ?? 'No hints available'),
    };

    res.json(response);
  } catch (err) {
    console.error('Request practice hint error:', err);
    res.status(500).json({ message: 'Failed to request hint' });
  }
};

// GET /api/practice/exercises/:exerciseId/history
export const getPracticeExerciseHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const exerciseId = String(req.params.exerciseId);
    const exercise = await Exercise.findById(exerciseId).select('_id').lean();

    if (!exercise) {
      res.status(404).json({ message: 'Exercise not found' });
      return;
    }

    const attempt = await ExerciseAttempt.findOne({
      userId,
      exerciseId,
    }).lean();
    const response: ExerciseAttemptResponse[] = attempt
      ? [
          {
            _id: attempt._id,
            exerciseId: attempt.exerciseId,
            isPassed: attempt.isPassed,
            items: attempt.items,
            hintLevel: attempt.hintLevel,
            userAnswer: attempt.userAnswer,
            attemptNumber: attempt.attemptNumber,
            attemptedAt: attempt.attemptedAt,
          },
        ]
      : [];

    res.json(response);
  } catch (err) {
    console.error('Get practice exercise history error:', err);
    res.status(500).json({ message: 'Failed to fetch exercise history' });
  }
};
