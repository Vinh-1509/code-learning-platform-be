//import { Types} from 'mongoose';
import { IUser } from './auth.interface';
import { MilestoneResponse } from './learning_system.interface';

export type DashboardUser = Pick<
  IUser,
  '_id' | 'username' | 'selectedLanguage'
>;
export interface DashboardRoadmap {
  _id: string;
  title: string;
  language: string;
}

export interface DashboardStats {
  totalLearnedLessons: number;
  totalCompletedExercises: number;
  overallProgress: number;
  weakTagsCount: number;
}

export type DashboardMilestone = Pick<MilestoneResponse, '_id' | 'title'> & {
  status: MilestoneResponse['progress']['status'];
  completionPercentage: MilestoneResponse['progress']['completionPercentage'];
};

export interface DashboardDailyReview {
  pendingCount: number;
}

export interface IDashboardResponse {
  user: DashboardUser;
  roadmap: DashboardRoadmap;
  stats: DashboardStats;
  milestones: DashboardMilestone[];
  dailyReview: DashboardDailyReview;
}
