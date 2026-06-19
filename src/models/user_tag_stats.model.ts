import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTagStats extends Document {
  userId: mongoose.Types.ObjectId;
  tagId: mongoose.Types.ObjectId;
  totalAttempts: number;
  failAttempts: number;
  isWeak: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const userTagStatsSchema = new Schema<IUserTagStats>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    tagId: { type: Schema.Types.ObjectId, required: true, ref: 'ExerciseTag' },
    totalAttempts: { type: Number, required: true, default: 0 },
    failAttempts: { type: Number, required: true, default: 0 },
    isWeak: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

userTagStatsSchema.index({ userId: 1, tagId: 1 }, { unique: true });

export const UserTagStats = mongoose.model<IUserTagStats>(
  'UserTagStats',
  userTagStatsSchema,
  'user_tag_stats',
);
