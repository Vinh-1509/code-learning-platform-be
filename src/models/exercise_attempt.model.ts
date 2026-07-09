import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExerciseAttempt extends Document {
  userId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  isPassed: boolean;
  items: Array<{
    field: string;
    isCorrect: boolean;
  }>;
  hintLevel: number;
  userAnswer?: Record<string, unknown>;
  attemptNumber: number;
  attemptedAt: Date;
  lastRewardAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const exerciseAttemptSchema = new Schema<IExerciseAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    exerciseId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Exercise',
    },
    isPassed: {
      type: Boolean,
      required: true,
      default: false,
    },
    items: {
      type: [
        new Schema(
          {
            field: { type: String, required: true },
            isCorrect: { type: Boolean, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    hintLevel: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    userAnswer: {
      type: Schema.Types.Mixed,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    lastRewardAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Keep one latest attempt per user and exercise; attemptNumber tracks repeat submits.
exerciseAttemptSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

export const ExerciseAttempt = mongoose.model<IExerciseAttempt>(
  'ExerciseAttempt',
  exerciseAttemptSchema,
  'exercise_attempt',
);
