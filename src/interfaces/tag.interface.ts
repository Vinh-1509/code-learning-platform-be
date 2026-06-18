import type { Types } from 'mongoose';

export interface TagStatsResponse {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  totalAttempts: number;
  failAttempts: number;
  failureRate: number;
  isWeak: boolean;
  updatedAt?: Date;
}
