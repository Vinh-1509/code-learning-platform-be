import mongoose, { Schema } from 'mongoose';
import {
  IRoadmap,
  IMilestone,
  ILesson,
  IBlock,
  IUserMilestoneProgress,
  IUserLessonProgress,
} from '../interfaces/learning_system.interface';

// ─── Roadmap Schema ──────────────────────────────────────────────────────────

const roadmapSchema = new Schema<IRoadmap>(
  {
    language: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

// ─── Milestone Schema ────────────────────────────────────────────────────────

const milestoneSchema = new Schema<IMilestone>(
  {
    roadmapId: { type: Schema.Types.ObjectId, required: true, ref: 'Roadmap' },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

// ─── Lesson Schema ───────────────────────────────────────────────────────────

const lessonSchema = new Schema<ILesson>(
  {
    milestoneId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Milestone',
    },
    title: { type: String, required: true, trim: true },
    blocks: { type: [Schema.Types.ObjectId], ref: 'Block', default: [] },
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

// ─── Block Schema ────────────────────────────────────────────────────────────

const blockContentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['theory', 'code', 'practice'],
      required: true,
    },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const blockSchema = new Schema<IBlock>(
  {
    lessonId: { type: Schema.Types.ObjectId, required: true, ref: 'Lesson' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: [blockContentSchema], required: true, default: [] },
    feynmanQuestion: { type: String },
    feynmanPrompt: { type: String },
  },
  { timestamps: true },
);

// ─── User Milestone Progress Schema ──────────────────────────────────────────

const userMilestoneProgressSchema = new Schema<IUserMilestoneProgress>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    milestoneId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Milestone',
    },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['locked', 'active', 'completed'],
      default: 'locked',
    },
  },
  { timestamps: true }, // createdAt and updatedAt managed by Mongoose
);

// ─── User Lesson Progress Schema ─────────────────────────────────────────────

const chatMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const blockProgressSchema = new Schema(
  {
    blockId: { type: Schema.Types.ObjectId, required: true, ref: 'Block' },
    isFeynmanPassed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['locked', 'active', 'completed'],
      default: 'locked',
    },
    chatHistory: { type: [chatMessageSchema], default: [] },
    feynmanFailCount: { type: Number, default: 0, min: 0 },
    feynmanCooldownUntil: { type: Date },
  },
  { _id: false },
);

const userLessonProgressSchema = new Schema<IUserLessonProgress>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    lessonId: { type: Schema.Types.ObjectId, required: true, ref: 'Lesson' },
    status: {
      type: String,
      enum: ['locked', 'active', 'completed'],
      default: 'locked',
    },
    blockProgress: { type: [blockProgressSchema], default: [] },
    chatHistory: { type: [chatMessageSchema], default: [] },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    isCompleted: { type: Boolean, default: false },
    lastAccessed: { type: Date },
  },
  { timestamps: true },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

userMilestoneProgressSchema.index(
  { userId: 1, milestoneId: 1 },
  { unique: true },
);
userLessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
milestoneSchema.index({ roadmapId: 1, order: 1 });
lessonSchema.index({ milestoneId: 1, order: 1 });
blockSchema.index({ lessonId: 1 });

// ─── Models ──────────────────────────────────────────────────────────────────

export const Roadmap = mongoose.model<IRoadmap>('Roadmap', roadmapSchema);
export const Milestone = mongoose.model<IMilestone>(
  'Milestone',
  milestoneSchema,
);
export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
export const Block = mongoose.model<IBlock>('Block', blockSchema);
export const UserMilestoneProgress = mongoose.model<IUserMilestoneProgress>(
  'UserMilestoneProgress',
  userMilestoneProgressSchema,
);
export const UserLessonProgress = mongoose.model<IUserLessonProgress>(
  'UserLessonProgress',
  userLessonProgressSchema,
);
