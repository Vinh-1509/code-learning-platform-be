import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

import app from '../../src/app';
import { ENV } from '../../src/config/env';
import { ExerciseTag } from '../../src/models/exercise_tag.model';
import { UserTagStats } from '../../src/models/user_tag_stats.model';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

// ─── DB Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(userId: string): string {
  return jwt.sign({ userId, email: 'student@test.com' }, ENV.JWT_SECRET);
}

/**
 * Seed one ExerciseTag and return it together with a token for a fresh user.
 */
async function seedTagAndUser(
  tagName = 'Pointers',
  tagDescription = 'Pointer usage',
) {
  const userId = new Types.ObjectId().toString();
  const token = generateToken(userId);
  const tag = await ExerciseTag.create({
    name: tagName,
    description: tagDescription,
  });
  return { userId, token, tag };
}

/**
 * Create a UserTagStats document directly, bypassing the service so we can
 * control totalAttempts / failAttempts / isWeak precisely.
 *
 * isWeak thresholds from tag_stats.ts:
 *   MIN_ATTEMPTS_FOR_WEAK_TAG = 3
 *   WEAK_FAILURE_RATE         = 60   (i.e. failAttempts / totalAttempts * 100 >= 60)
 */
async function seedTagStats(
  userId: string,
  tagId: Types.ObjectId,
  totalAttempts: number,
  failAttempts: number,
  isWeak: boolean,
) {
  return UserTagStats.create({
    userId,
    tagId,
    totalAttempts,
    failAttempts,
    isWeak,
  });
}

async function authedGet(token: string, url: string) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}

// ─── GET /api/tags/weakness ───────────────────────────────────────────────────

describe('GET /api/tags/weakness', () => {
  describe('authentication', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/tags/weakness');
      expect(res.status).toBe(401);
    });

    it('returns 401 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/tags/weakness')
        .set('Authorization', 'Bearer this.is.garbage');
      expect(res.status).toBe(401);
    });
  });

  describe('empty state', () => {
    it('returns an empty array when the user has no weak tags', async () => {
      const { token } = await seedTagAndUser();
      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns an empty array when the user has stats but none are weak', async () => {
      const { userId, token, tag } = await seedTagAndUser();
      // 3 attempts, 1 failure → 33% — below the 60% threshold
      await seedTagStats(userId, tag._id, 3, 1, false);

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('success — single weak tag', () => {
    it('returns the weak tag with correct shape', async () => {
      const { userId, token, tag } = await seedTagAndUser(
        'Variables',
        'Variable usage',
      );
      // 5 attempts, 4 failures → 80% → weak
      await seedTagStats(userId, tag._id, 5, 4, true);

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);

      const item = res.body[0];
      expect(item._id).toBe(tag._id.toString());
      expect(item.name).toBe('Variables');
      expect(item.description).toBe('Variable usage');
      expect(item.totalAttempts).toBe(5);
      expect(item.failAttempts).toBe(4);
      expect(item.failureRate).toBe(80); // Math.round(4/5 * 100)
      expect(item.isWeak).toBe(true);
    });

    it('includes updatedAt in the response', async () => {
      const { userId, token, tag } = await seedTagAndUser();
      await seedTagStats(userId, tag._id, 3, 2, true);

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.body[0]).toHaveProperty('updatedAt');
    });
  });

  describe('success — multiple weak tags', () => {
    it('returns all weak tags for the user', async () => {
      const { userId, token } = await seedTagAndUser();
      const tag1 = await ExerciseTag.create({
        name: 'Loops',
        description: 'Loop constructs',
      });
      const tag2 = await ExerciseTag.create({
        name: 'OOP',
        description: 'OOP concepts',
      });
      const tag3 = await ExerciseTag.create({
        name: 'Types',
        description: 'Data types',
      });

      await seedTagStats(userId, tag1._id, 5, 4, true); // 80%
      await seedTagStats(userId, tag2._id, 4, 3, true); // 75%
      await seedTagStats(userId, tag3._id, 3, 1, false); // 33% — not weak

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      const names = res.body.map((item: { name: string }) => item.name);
      expect(names).toContain('Loops');
      expect(names).toContain('OOP');
      expect(names).not.toContain('Types');
    });

    it('sorts by failureRate descending', async () => {
      const userId = new Types.ObjectId().toString();
      const token = generateToken(userId);

      const tagA = await ExerciseTag.create({ name: 'TagA' });
      const tagB = await ExerciseTag.create({ name: 'TagB' });
      const tagC = await ExerciseTag.create({ name: 'TagC' });

      // Rates: A=100%, B=67%, C=80%  → expected order: A, C, B
      await seedTagStats(userId, tagA._id, 3, 3, true); // 100%
      await seedTagStats(userId, tagB._id, 3, 2, true); // 67%
      await seedTagStats(userId, tagC._id, 5, 4, true); // 80%

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].name).toBe('TagA'); // 100%
      expect(res.body[1].name).toBe('TagC'); // 80%
      expect(res.body[2].name).toBe('TagB'); // 67%
    });

    it('breaks failureRate ties by failAttempts descending', async () => {
      const userId = new Types.ObjectId().toString();
      const token = generateToken(userId);

      const tagX = await ExerciseTag.create({ name: 'TagX' });
      const tagY = await ExerciseTag.create({ name: 'TagY' });

      // Both 100% failure rate, but TagY has more absolute failures
      await seedTagStats(userId, tagX._id, 3, 3, true); // 100%, 3 fails
      await seedTagStats(userId, tagY._id, 5, 5, true); // 100%, 5 fails

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe('TagY'); // higher failAttempts wins
      expect(res.body[1].name).toBe('TagX');
    });
  });

  describe('data isolation', () => {
    it('does not return weak tags belonging to a different user', async () => {
      const tag = await ExerciseTag.create({ name: 'Shared Tag' });

      const userId1 = new Types.ObjectId().toString();
      const userId2 = new Types.ObjectId().toString();
      const token2 = generateToken(userId2);

      // user1 has a weak tag; user2 does not
      await seedTagStats(userId1, tag._id, 5, 4, true);

      const res = await authedGet(token2, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('skips stats entries whose tag no longer exists in ExerciseTag', async () => {
      const userId = new Types.ObjectId().toString();
      const token = generateToken(userId);
      const phantomTagId = new Types.ObjectId();

      // Insert stats referencing a tag that was never created
      await UserTagStats.create({
        userId,
        tagId: phantomTagId,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('calculates failureRate correctly (Math.round)', async () => {
      const { userId, token, tag } = await seedTagAndUser();
      // 3 attempts, 2 failures → 66.66…% → rounds to 67
      await seedTagStats(userId, tag._id, 3, 2, true);

      const res = await authedGet(token, '/api/tags/weakness');

      expect(res.body[0].failureRate).toBe(67);
    });
  });
});

// ─── GET /api/tags/:tagId/info ────────────────────────────────────────────────

describe('GET /api/tags/:tagId/info', () => {
  describe('authentication', () => {
    it('returns 401 when no token is provided', async () => {
      const fakeId = new Types.ObjectId().toString();
      const res = await request(app).get(`/api/tags/${fakeId}/info`);
      expect(res.status).toBe(401);
    });
  });

  describe('input validation', () => {
    it('returns 400 for an invalid ObjectId', async () => {
      const { token } = await seedTagAndUser();
      const res = await authedGet(token, '/api/tags/not-an-id/info');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid tagId');
    });
  });

  describe('not found', () => {
    it('returns 404 for a valid ObjectId that does not match any tag', async () => {
      const { token } = await seedTagAndUser();
      const fakeId = new Types.ObjectId().toString();
      const res = await authedGet(token, `/api/tags/${fakeId}/info`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Tag not found');
    });
  });

  describe('success — tag exists, no stats yet', () => {
    it('returns zero-value stats when user has no attempts for this tag', async () => {
      const { token, tag } = await seedTagAndUser('Control Flow', 'Branching');

      const res = await authedGet(
        token,
        `/api/tags/${tag._id.toString()}/info`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        _id: tag._id.toString(),
        name: 'Control Flow',
        description: 'Branching',
        totalAttempts: 0,
        failAttempts: 0,
        failureRate: 0,
        isWeak: false,
      });
    });

    it('does not include updatedAt when stats have never been written', async () => {
      const { token, tag } = await seedTagAndUser();
      const res = await authedGet(
        token,
        `/api/tags/${tag._id.toString()}/info`,
      );

      // updatedAt should be undefined/absent when there are no stats
      expect(res.body.updatedAt).toBeUndefined();
    });
  });

  describe('success — tag exists, stats present', () => {
    it('returns correct stats for a non-weak tag', async () => {
      const { userId, token, tag } = await seedTagAndUser('Operators');
      // 4 attempts, 1 failure → 25% → not weak
      await seedTagStats(userId, tag._id, 4, 1, false);

      const res = await authedGet(
        token,
        `/api/tags/${tag._id.toString()}/info`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Operators',
        totalAttempts: 4,
        failAttempts: 1,
        failureRate: 25,
        isWeak: false,
      });
    });

    it('returns correct stats for a weak tag', async () => {
      const { userId, token, tag } = await seedTagAndUser('OOP');
      // 5 attempts, 4 failures → 80% → weak
      await seedTagStats(userId, tag._id, 5, 4, true);

      const res = await authedGet(
        token,
        `/api/tags/${tag._id.toString()}/info`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'OOP',
        totalAttempts: 5,
        failAttempts: 4,
        failureRate: 80,
        isWeak: true,
      });
    });

    it('returns 0 failureRate when totalAttempts is 0 (no-divide-by-zero guard)', async () => {
      const { userId, token, tag } = await seedTagAndUser();
      await seedTagStats(userId, tag._id, 0, 0, false);

      const res = await authedGet(
        token,
        `/api/tags/${tag._id.toString()}/info`,
      );

      expect(res.status).toBe(200);
      expect(res.body.failureRate).toBe(0);
    });

    it('includes updatedAt when stats exist', async () => {
      const { userId, token, tag } = await seedTagAndUser();
      await seedTagStats(userId, tag._id, 3, 2, true);

      const res = await authedGet(
        token,
        `/api/tags/${tag._id.toString()}/info`,
      );

      expect(res.body).toHaveProperty('updatedAt');
    });
  });

  describe('data isolation', () => {
    it('returns zero-value stats when the tag exists but belongs to a different user', async () => {
      const tag = await ExerciseTag.create({
        name: 'Shared Tag',
        description: 'desc',
      });

      const userId1 = new Types.ObjectId().toString();
      const userId2 = new Types.ObjectId().toString();
      const token2 = generateToken(userId2);

      // user1 has stats for this tag
      await seedTagStats(userId1, tag._id, 5, 4, true);

      // user2 has no stats — should see zeros, not user1's data
      const res = await authedGet(
        token2,
        `/api/tags/${tag._id.toString()}/info`,
      );

      expect(res.status).toBe(200);
      expect(res.body.totalAttempts).toBe(0);
      expect(res.body.failAttempts).toBe(0);
      expect(res.body.isWeak).toBe(false);
    });
  });
});
