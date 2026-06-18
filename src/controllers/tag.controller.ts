import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ExerciseTag } from '../models/exercise_tag.model';
import { UserTagStats } from '../models/user_tag_stats.model';
import { calculateFailureRate } from '../utils/tag_stats';
import type { TagStatsResponse } from '../interfaces/tag.interface';

function authUserId(req: Request): string {
  return req.user!.id;
}

function buildTagStatsResponse(input: {
  tag: {
    _id: Types.ObjectId;
    name: string;
    description?: string;
  };
  totalAttempts: number;
  failAttempts: number;
  isWeak: boolean;
  updatedAt?: Date;
}): TagStatsResponse {
  return {
    _id: input.tag._id,
    name: input.tag.name,
    description: input.tag.description,
    totalAttempts: input.totalAttempts,
    failAttempts: input.failAttempts,
    failureRate: calculateFailureRate(input.totalAttempts, input.failAttempts),
    isWeak: input.isWeak,
    updatedAt: input.updatedAt,
  };
}

// GET /api/tags/weakness
export const getWeakTags = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const stats = await UserTagStats.find({
      userId: authUserId(req),
      isWeak: true,
    }).lean();
    const tagIds = stats.map((item) => item.tagId);
    const tags = await ExerciseTag.find({ _id: { $in: tagIds } }).lean();
    const tagMap = new Map(tags.map((tag) => [tag._id.toString(), tag]));

    const response: TagStatsResponse[] = stats
      .flatMap((item) => {
        const tag = tagMap.get(item.tagId.toString());
        if (!tag) return [];

        return [
          buildTagStatsResponse({
            tag,
            totalAttempts: item.totalAttempts,
            failAttempts: item.failAttempts,
            isWeak: item.isWeak,
            updatedAt: item.updatedAt,
          }),
        ];
      })
      .sort((a, b) => {
        if (b.failureRate !== a.failureRate) {
          return b.failureRate - a.failureRate;
        }
        return b.failAttempts - a.failAttempts;
      });

    res.json(response);
  } catch (err) {
    console.error('Get weak tags error:', err);
    res.status(500).json({ message: 'Failed to fetch weak tags' });
  }
};

// GET /api/tags/:tagId/info
export const getTagInfo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const tagId = String(req.params.tagId);
    const tag = await ExerciseTag.findById(tagId).lean();

    if (!tag) {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    const stats = await UserTagStats.findOne({
      userId: authUserId(req),
      tagId,
    }).lean();

    res.json(
      buildTagStatsResponse({
        tag,
        totalAttempts: stats?.totalAttempts ?? 0,
        failAttempts: stats?.failAttempts ?? 0,
        isWeak: stats?.isWeak ?? false,
        updatedAt: stats?.updatedAt,
      }),
    );
  } catch (err) {
    console.error('Get tag info error:', err);
    res.status(500).json({ message: 'Failed to fetch tag info' });
  }
};
