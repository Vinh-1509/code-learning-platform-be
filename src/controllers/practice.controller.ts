import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Exercise, IExercise } from '../models/exercise.model';
import { ExerciseAttempt } from '../models/exercise_attempt.model';
import { Block, UserLessonProgress } from '../models/learning_system.model';
import { gradeExerciseAnswer } from '../utils/exercise_grading';
import type {
  ExerciseAttemptResponse,
  ExerciseAttemptItem,
  ExerciseStatus,
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

function toListItem(
  exercise: IExercise,
  status: ExerciseStatus,
): PracticeExerciseListItem {
  return {
    _id: exercise._id,
    title: exercise.title,
    instruction: exercise.instruction,
    language: exercise.language,
    type: exercise.type,
    level: exercise.level,
    status,
    order: exercise.order,
  };
}

function toDetailResponse(
  exercise: IExercise,
  status: ExerciseStatus,
): PracticeExerciseDetailResponse {
  return {
    ...toListItem(exercise, status),
    data: exercise.data,
    hints: exercise.hints,
  };
}

function getPracticeExerciseIds(content: unknown[]): string[] {
  return content.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const contentItem = item as Record<string, unknown>;
    if (contentItem.type !== 'practice') return [];
    if (!contentItem.data || typeof contentItem.data !== 'object') return [];

    const data = contentItem.data as Record<string, unknown>;
    const exerciseId = data.exerciseId;
    if (exerciseId instanceof mongoose.Types.ObjectId) {
      return [exerciseId.toString()];
    }
    if (typeof exerciseId === 'string') {
      return [exerciseId];
    }
    return [];
  });
}

async function getExerciseStatusMap(
  userId: string,
  exercises: IExercise[],
): Promise<Map<string, ExerciseStatus>> {
  const statusMap = new Map<string, ExerciseStatus>();
  if (exercises.length === 0) return statusMap;

  const exerciseIds = exercises.map((exercise) => exercise._id);
  const attempts = await ExerciseAttempt.find({
    userId,
    exerciseId: { $in: exerciseIds },
  })
    .select('exerciseId isPassed')
    .lean();
  const passedExerciseIds = new Set(
    attempts
      .filter((attempt) => attempt.isPassed)
      .map((attempt) => attempt.exerciseId.toString()),
  );

  exercises.forEach((exercise) => {
    const exerciseId = exercise._id.toString();
    if (passedExerciseIds.has(exerciseId)) {
      statusMap.set(exerciseId, 'completed');
      return;
    }

    statusMap.set(exerciseId, exercise.lessonId ? 'locked' : 'active');
  });

  const lessonIds = exercises
    .map((exercise) => exercise.lessonId)
    .filter((lessonId): lessonId is mongoose.Types.ObjectId =>
      Boolean(lessonId),
    );
  if (lessonIds.length === 0) return statusMap;

  const [blocks, lessonProgresses] = await Promise.all([
    Block.find({ lessonId: { $in: lessonIds } })
      .select('_id lessonId content')
      .lean(),
    UserLessonProgress.find({ userId, lessonId: { $in: lessonIds } })
      .select('lessonId blockProgress status')
      .lean(),
  ]);

  const exerciseBlockMap = new Map<string, string>();
  blocks.forEach((block) => {
    getPracticeExerciseIds(block.content).forEach((exerciseId) => {
      exerciseBlockMap.set(exerciseId, block._id.toString());
    });
  });

  const progressMap = new Map(
    lessonProgresses.map((progress) => [
      progress.lessonId.toString(),
      progress,
    ]),
  );

  exercises.forEach((exercise) => {
    const exerciseId = exercise._id.toString();
    if (statusMap.get(exerciseId) === 'completed' || !exercise.lessonId) {
      return;
    }

    const progress = progressMap.get(exercise.lessonId.toString());
    if (!progress || progress.status === 'locked') {
      statusMap.set(exerciseId, 'locked');
      return;
    }

    const blockId = exerciseBlockMap.get(exerciseId);
    const blockProgress = progress.blockProgress?.find(
      (bp) => bp.blockId.toString() === blockId,
    );
    statusMap.set(
      exerciseId,
      blockProgress?.status === 'locked' ? 'locked' : 'active',
    );
  });

  return statusMap;
}

async function getLatestAttemptState(
  userId: string,
  exerciseId: string,
): Promise<{ attemptNumber: number; hintLevel: number; isPassed: boolean }> {
  // One document stores the latest attempt, while attemptNumber preserves total tries.
  const attempt = await ExerciseAttempt.findOne({ userId, exerciseId })
    .select('attemptNumber hintLevel isPassed')
    .lean();

  return {
    attemptNumber: attempt?.attemptNumber ?? 0,
    hintLevel: attempt?.hintLevel ?? 0,
    isPassed: attempt?.isPassed ?? false,
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
    const statusMap = await getExerciseStatusMap(authUserId(req), exercises);

    const response: PracticeExerciseListResponse = {
      total,
      page,
      limit,
      data: exercises.map((exercise) =>
        toListItem(
          exercise,
          statusMap.get(exercise._id.toString()) ?? 'active',
        ),
      ),
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

    const statusMap = await getExerciseStatusMap(authUserId(req), [exercise]);
    res.json(
      toDetailResponse(
        exercise,
        statusMap.get(exercise._id.toString()) ?? 'active',
      ),
    );
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
    const isPassed = latestAttempt.isPassed || grading.isCorrect;
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
        isPassed,
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
    // Hint levels advance only when another hint exists.
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
