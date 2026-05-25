import { Types, Document } from 'mongoose';

// ─── Roadmap & Language ──────────────────────────────────────────────────────

export interface IRoadmap extends Document {
  language: string;
  title: string;
  description?: string;
}

export interface IRoadmapResponse {
  _id: string;
  language: string;
}

export interface ILanguageInfoResponse {
  _id: string;
  language: string;
  info: string;
  strengths: string[];
  challenges: string[];
  useCases: string[];
}

// ─── Milestone ───────────────────────────────────────────────────────────────

export interface IMilestone extends Document {
  roadmapId: Types.ObjectId;
  title: string;
  order: number;
  description?: string;
}

export interface MilestoneResponse {
  _id: string;
  title: string;
  order: number;
  description?: string;
  progress: {
    status: 'Locked' | 'Active' | 'Completed';
    completionPercentage: number;
    updatedAt?: Date;
  };
}

// ─── Lesson & Block ──────────────────────────────────────────────────────────

export interface ITheoryContent {
  type: 'theory';
  data: {
    order: number;
    text: string;
    image?: string;
  };
}

export interface ICodeContent {
  type: 'code';
  data: {
    order: number;
    code: string;
    explanation: string;
  };
}

export interface IPracticeContent {
  type: 'practice';
  data: {
    order: number;
    exerciseId: Types.ObjectId;
    required: boolean;
  };
}

export type BlockContent = ITheoryContent | ICodeContent | IPracticeContent;

export interface IBlock extends Document {
  lessonId: Types.ObjectId;
  title: string;
  description?: string;
  content: BlockContent[];
  feynmanQuestion?: string;
  feynmanPrompt?: string;
}

export interface IBlockResponse {
  _id: string;
  title: string;
  description?: string;
  content: BlockContent[];
  feynmanQuestion?: string;
  state: 'locked' | 'active' | 'completed';
  isFeynmanPassed: boolean;
}

export interface ILesson extends Document {
  milestoneId: Types.ObjectId;
  title: string;
  blocks: Types.ObjectId[];
  order: number;
}

export interface ILessonResponse {
  _id: string;
  title: string;
  order: number;
  blocks: IBlockResponse[];
  progress: {
    completionPercentage: number;
    isCompleted: boolean;
    lastAccessed?: Date;
  };
}

export interface ILessonSummaryResponse {
  _id: string;
  title: string;
  order: number;
  progress: {
    isCompleted: boolean;
    completionPercentage: number;
  };
}

// ─── User Progress ───────────────────────────────────────────────────────────

export interface IBlockProgress {
  blockId: Types.ObjectId;
  isFeynmanPassed: boolean;
  state: 'locked' | 'active' | 'completed';
}

export interface IUserLessonProgress extends Document {
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  blockProgress: IBlockProgress[];
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
  completionPercentage: number;
  isCompleted: boolean;
  lastAccessed?: Date;
}

export interface IUserMilestoneProgress extends Document {
  userId: Types.ObjectId;
  milestoneId: Types.ObjectId;
  completionPercentage: number;
  status: 'Locked' | 'Active' | 'Completed';
  updatedAt?: Date;
}
