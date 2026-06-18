import { Types } from 'mongoose';
import { UserTagStats } from '../models/user_tag_stats.model';

const MIN_ATTEMPTS_FOR_WEAK_TAG = 3;
const WEAK_FAILURE_RATE = 60;

type TagIdInput = string | Types.ObjectId;

function toObjectId(value: TagIdInput): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) return value;
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

export function calculateFailureRate(
  totalAttempts: number,
  failAttempts: number,
): number {
  if (totalAttempts <= 0) return 0;
  return Math.round((failAttempts / totalAttempts) * 100);
}

export function isWeakTag(
  totalAttempts: number,
  failAttempts: number,
): boolean {
  return (
    totalAttempts >= MIN_ATTEMPTS_FOR_WEAK_TAG &&
    calculateFailureRate(totalAttempts, failAttempts) >= WEAK_FAILURE_RATE
  );
}

export async function updateUserTagStats(
  userId: string,
  tagId: TagIdInput,
  isCorrect: boolean,
): Promise<void> {
  const normalizedTagId = toObjectId(tagId);
  if (!normalizedTagId) return;

  const stats = await UserTagStats.findOneAndUpdate(
    {
      userId,
      tagId: normalizedTagId,
    },
    {
      $inc: {
        totalAttempts: 1,
        failAttempts: isCorrect ? 0 : 1,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  stats.isWeak = isWeakTag(stats.totalAttempts, stats.failAttempts);
  await stats.save();
}

export async function updateUserTagStatsForExercise(
  userId: string,
  tagIds: TagIdInput[] | undefined,
  isCorrect: boolean,
): Promise<void> {
  if (!tagIds?.length) return;

  await Promise.all(
    tagIds.map((tagId) => updateUserTagStats(userId, tagId, isCorrect)),
  );
}
