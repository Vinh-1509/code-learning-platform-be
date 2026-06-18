import mongoose, { Schema, Document } from 'mongoose';

export interface IExerciseTag extends Document {
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const exerciseTagSchema = new Schema<IExerciseTag>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
  },
  { timestamps: true },
);

export const ExerciseTag = mongoose.model<IExerciseTag>(
  'ExerciseTag',
  exerciseTagSchema,
  'exercise_tag',
);
