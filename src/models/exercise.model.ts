import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface IExercise extends Document {
  lessonId?: Types.ObjectId;
  title: string;
  instruction: string;
  language: 'C++' | 'Java';
  type: 'fill_blank' | 'drag_drop';
  level: 'easy' | 'medium' | 'hard';
  data: Record<string, unknown>;
  correctAnswer: Record<string, unknown>;
  explanation: string;
  hints?: Record<string, string>;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    title: { type: String, required: true, trim: true },
    instruction: { type: String, required: true, trim: true },
    language: {
      type: String,
      required: true,
      enum: ['C++', 'Java'], // Python removed — not in DB/API design
    },
    type: {
      type: String,
      required: true,
      enum: ['fill_blank', 'drag_drop'],
    },
    level: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
    },
    data: { type: Schema.Types.Mixed, required: true },
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String, required: true },
    hints: { type: Schema.Types.Mixed },
    order: { type: Number },
  },
  { timestamps: true },
);

export const Exercise = mongoose.model<IExercise>('Exercise', exerciseSchema);
