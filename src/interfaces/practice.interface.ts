import type { Types } from 'mongoose';
import type { ExerciseAnswer } from './exercise.interface';

export type ExerciseStatus = 'locked' | 'active' | 'completed';

export interface PracticeExerciseQuery {
  q?: string;
  tagId?: string;
  difficulty?: string;
  language?: string;
  status?: ExerciseStatus;
  page?: string;
  limit?: string;
}

export interface PracticeExerciseListItem {
  _id: Types.ObjectId;
  title: string;
  instruction: string;
  language: 'C++' | 'Java';
  type: 'fill_blank' | 'drag_drop';
  level: 'easy' | 'medium' | 'hard';
  tagId?: Types.ObjectId[];
  status: ExerciseStatus;
  order?: number;
}

export interface PracticeExerciseListResponse {
  total: number;
  page: number;
  limit: number;
  data: PracticeExerciseListItem[];
}

export interface PracticeExerciseDetailResponse extends PracticeExerciseListItem {
  data: Record<string, unknown>;
  hints?: Record<string, string>;
}

export interface SubmitExerciseRequestBody {
  answer: ExerciseAnswer;
}

export interface SubmitExerciseResponse {
  correct: boolean;
  items: ExerciseAttemptItem[];
  attemptNumber: number;
  prizeType: 'coin' | 'attack' | 'no prize';
  amount: number;
  currentCoin: number;
  hasAttackSlot: boolean;
}

export interface ExerciseAttemptItem {
  field: string;
  isCorrect: boolean;
}

export interface HintResponse {
  hintLevel: number;
  hint: string | null;
}

export interface ExerciseAttemptResponse {
  _id: Types.ObjectId;
  exerciseId: Types.ObjectId;
  isPassed: boolean;
  items: ExerciseAttemptItem[];
  hintLevel: number;
  userAnswer?: Record<string, unknown>;
  attemptNumber: number;
  attemptedAt: Date;
}
