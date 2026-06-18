import type { Types } from 'mongoose';
import type { ProgressStatus } from './learning_system.interface';

export interface DashboardResponse {
  user: {
    _id: Types.ObjectId;
    email: string;
    username?: string;
    fullName?: string;
    selectedLanguage: string[];
  };
  roadmap: {
    _id: Types.ObjectId;
    title: string;
    language: string;
  };
  stats: {
    totalLearnedLessons: number;
    totalCompletedExercises: number;
    overallProgress: number;
    weakTagsCount: number;
  };
  milestones: Array<{
    _id: Types.ObjectId;
    title: string;
    status: ProgressStatus;
    completionPercentage: number;
  }>;
  dailyReview: {
    pendingCount: number;
  };
}
