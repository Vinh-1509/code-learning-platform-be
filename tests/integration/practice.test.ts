import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose, { Types } from 'mongoose';

import app from '../../src/app';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';
import { ExerciseTag } from '../../src/models/exercise_tag.model';
import { UserTagStats } from '../../src/models/user_tag_stats.model';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

// ─── DB Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fillBlankFixture = {
  title: 'Declare a Variable',
  instruction: 'Fill in the correct variable name',
  language: 'C++' as const,
  type: 'fill_blank' as const,
  level: 'easy' as const,
  data: {
    template: ['int ', ' = 10;'],
    placeholders: { input_1: 'age' },
  },
  correctAnswer: { input_1: 'age' },
  explanation: 'age is an integer variable',
  hints: {
    '1': 'Think of a name that describes a persons age',
    '2': 'The variable stores how old someone is',
  },
  order: 1,
};

const dragDropFixture = {
  title: 'Access Modifiers',
  instruction: 'Drag the correct access modifiers',
  language: 'Java' as const,
  type: 'drag_drop' as const,
  level: 'medium' as const,
  data: {
    expectedSlots: 2,
    blocks: [
      { id: 'block-0', code: 'public', indent: 0 },
      { id: 'block-1', code: 'private', indent: 0 },
      { id: 'block-2', code: 'protected', indent: 0 },
    ],
  },
  correctAnswer: {
    '1': 'block-1',
    '2': 'block-0',
  },
  explanation: 'private hides fields, public exposes methods',
  order: 2,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validUser = {
  email: 'practice@example.com',
  password: 'Password1!',
};

async function getValidToken(): Promise<string> {
  await request(app).post('/api/auth/register').send(validUser);
  const res = await request(app).post('/api/auth/login').send(validUser);
  return res.body.access_token as string;
}

async function seedExercises() {
  const fill = await Exercise.create(fillBlankFixture);
  const drag = await Exercise.create(dragDropFixture);
  return { fill, drag };
}

async function authedGet(token: string, url: string) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}

async function authedPost(token: string, url: string, body = {}) {
  return request(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

const validObjectId = new mongoose.Types.ObjectId().toString();

// ─── GET /api/practice/exercises ─────────────────────────────────────────────

describe('GET /api/practice/exercises', () => {
  describe('success', () => {
    it('returns paginated exercises with correct structure and required list fields', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises');

      // Assert outer pagination structure
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        total: 2,
        page: 1,
        limit: 15,
      });
      expect(res.body.data).toHaveLength(2);

      // Assert inner item structure
      const item = res.body.data[0];
      expect(item).toHaveProperty('_id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('instruction');
      expect(item).toHaveProperty('language');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('level');
      expect(item).toHaveProperty('status');
    });

    it('standalone exercises (no lessonId) have status active', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises');

      res.body.data.forEach((item: { status: string }) => {
        expect(item.status).toBe('active');
      });
    });

    it('does not expose correctAnswer or explanation in list response', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises');

      res.body.data.forEach((item: Record<string, unknown>) => {
        expect(item).not.toHaveProperty('correctAnswer');
        expect(item).not.toHaveProperty('explanation');
      });
    });
  });

  describe('pagination & filtering', () => {
    it('respects the page and limit query params', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises?page=1&limit=1',
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(2);
    });

    it('returns an empty data array when page exceeds total', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises?page=999&limit=15',
      );

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(2);
    });

    it('caps limit at 50', async () => {
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises?limit=999');

      expect(res.body.limit).toBe(50);
    });

    it('filters by language, difficulty, and search query', async () => {
      await seedExercises();
      const token = await getValidToken();

      const langRes = await authedGet(
        token,
        '/api/practice/exercises?language=C%2B%2B',
      );
      expect(langRes.body.data[0].language).toBe('C++');

      const diffRes = await authedGet(
        token,
        '/api/practice/exercises?difficulty=easy',
      );
      expect(diffRes.body.data[0].level).toBe('easy');

      const searchRes = await authedGet(
        token,
        '/api/practice/exercises?q=Declare',
      );
      expect(searchRes.body.data[0].title).toBe('Declare a Variable');
    });

    it('returns empty when no exercises match the filter', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises?q=nonexistentxyz',
      );

      expect(res.body.total).toBe(0);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('authentication', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/practice/exercises');
      expect(res.status).toBe(401);
    });
  });
});

// ─── GET /api/practice/exercises/:exerciseId ─────────────────────────────────

describe('GET /api/practice/exercises/:exerciseId', () => {
  describe('success', () => {
    it('returns 200 with full exercise detail including data and hints', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        `/api/practice/exercises/${fill._id.toString()}`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        title: fillBlankFixture.title,
        language: 'C++',
        type: 'fill_blank',
        level: 'easy',
        status: 'active',
      });
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('hints');
    });
  });

  describe('failures', () => {
    it('returns 404 for a valid ObjectId that does not exist', async () => {
      const token = await getValidToken();
      const res = await authedGet(
        token,
        `/api/practice/exercises/${validObjectId}`,
      );
      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid ObjectId', async () => {
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises/bad-id');
      expect(res.status).toBe(400);
    });

    it('returns 401 when no token is provided', async () => {
      const { fill } = await seedExercises();
      const res = await request(app).get(
        `/api/practice/exercises/${fill._id.toString()}`,
      );
      expect(res.status).toBe(401);
    });
  });
});

// ─── POST /api/practice/exercises/:exerciseId/submit ─────────────────────────

describe('POST /api/practice/exercises/:exerciseId/submit', () => {
  describe('correct answer integration', () => {
    it('returns correct: true, updates the DB as passed, and reflects completion status on GET', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      // 1. Submit correct answer
      const postRes = await authedPost(
        token,
        `/api/practice/exercises/${exerciseId}/submit`,
        {
          answer: { input_1: 'age' },
        },
      );

      expect(postRes.status).toBe(200);
      expect(postRes.body.correct).toBe(true);
      expect(postRes.body.items[0]).toEqual({
        field: 'input_1',
        isCorrect: true,
      });

      // 2. Assert DB state was updated
      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt?.isPassed).toBe(true);

      // 3. Assert subsequent GET reflects 'completed' status
      const getRes = await authedGet(
        token,
        `/api/practice/exercises/${exerciseId}`,
      );
      expect(getRes.body.status).toBe('completed');
    });
  });

  describe('incorrect answer', () => {
    it('returns correct: false with per-field items', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/submit`,
        {
          answer: { input_1: 'wrongAnswer' },
        },
      );

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
      expect(res.body.items[0]).toEqual({ field: 'input_1', isCorrect: false });
    });

    it('isPassed stays true after a wrong re-submit', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });
      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'wrong' },
      });

      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt?.isPassed).toBe(true);
    });
  });

  describe('attempt tracking', () => {
    it('upserts a single document per user+exercise, preserving latest answer and attempt count', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();
      const url = `/api/practice/exercises/${exerciseId}/submit`;

      const first = await authedPost(token, url, {
        answer: { input_1: 'first_wrong' },
      });
      const second = await authedPost(token, url, {
        answer: { input_1: 'second_wrong' },
      });
      const third = await authedPost(token, url, {
        answer: { input_1: 'age' },
      }); // Correct

      // Assert API response counters
      expect(first.body.attemptNumber).toBe(1);
      expect(second.body.attemptNumber).toBe(2);
      expect(third.body.attemptNumber).toBe(3);

      // Assert DB state (upsert behavior + latest answer)
      const count = await ExerciseAttempt.countDocuments({ exerciseId });
      expect(count).toBe(1);

      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt?.userAnswer).toEqual({ input_1: 'age' });
    });
  });

  describe('drag_drop grading', () => {
    it('returns partial correctness for a partially correct drag_drop answer', async () => {
      const { drag } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${drag._id.toString()}/submit`,
        {
          answer: { '1': 'block-1', '2': 'block-2' },
        },
      );

      expect(res.body.correct).toBe(false);
      const slot1 = res.body.items.find(
        (i: { field: string }) => i.field === '1',
      );
      const slot2 = res.body.items.find(
        (i: { field: string }) => i.field === '2',
      );
      expect(slot1.isCorrect).toBe(true);
      expect(slot2.isCorrect).toBe(false);
    });
  });

  describe('failures', () => {
    it.each([
      {
        scenario: 'not an object',
        body: { answer: 'just a string' },
        expectedMsg: 'Answer must be an object',
      },
      {
        scenario: 'an array',
        body: { answer: ['a', 'b'] },
        expectedMsg: 'Answer must be an object',
      },
      { scenario: 'missing entirely', body: {} },
    ])(
      'returns 400 when answer is $scenario',
      async ({ body, expectedMsg }) => {
        const { fill } = await seedExercises();
        const token = await getValidToken();
        const res = await authedPost(
          token,
          `/api/practice/exercises/${fill._id.toString()}/submit`,
          body,
        );

        expect(res.status).toBe(400);
        if (expectedMsg) {
          expect(res.body.message).toBe(expectedMsg);
        }
      },
    );

    it('returns 404 for a non-existent exercise', async () => {
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${validObjectId}/submit`,
        {
          answer: { input_1: 'age' },
        },
      );
      expect(res.status).toBe(404);
    });

    it('returns 401 when no token is provided', async () => {
      const { fill } = await seedExercises();
      const res = await request(app)
        .post(`/api/practice/exercises/${fill._id.toString()}/submit`)
        .send({ answer: { input_1: 'age' } });
      expect(res.status).toBe(401);
    });
  });
});

// ─── POST /api/practice/exercises/:exerciseId/hint ───────────────────────────

describe('POST /api/practice/exercises/:exerciseId/hint', () => {
  describe('success', () => {
    it('returns the first hint and advances hintLevel to 1', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/hint`,
      );

      expect(res.status).toBe(200);
      expect(res.body.hintLevel).toBe(1);
      expect(res.body.hint).toBe(fillBlankFixture.hints['1']);
    });

    it('does not advance beyond the last available hint', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`); // level 1
      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`); // level 2
      const res = await authedPost(
        token,
        `/api/practice/exercises/${exerciseId}/hint`,
      ); // No level 3 exists

      expect(res.body.hintLevel).toBe(2);
      expect(res.body.hint).toBe(fillBlankFixture.hints['2']);
    });

    it('creates an attempt document with hintLevel when none exists', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);

      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt).not.toBeNull();
      expect(attempt?.hintLevel).toBe(1);
      expect(attempt?.isPassed).toBe(false);
    });

    it('preserves existing hintLevel when requesting hint on exercise with no more hints', async () => {
      const noHintExercise = await Exercise.create({
        ...fillBlankFixture,
        title: 'No Hints Exercise',
        hints: {},
      });
      const token = await getValidToken();

      const res = await authedPost(
        token,
        `/api/practice/exercises/${noHintExercise._id.toString()}/hint`,
      );

      expect(res.status).toBe(200);
      expect(res.body.hintLevel).toBe(0);
      expect(res.body.hint).toBe('No hints available');
    });
  });

  describe('failures', () => {
    it('returns 404 for a non-existent exercise', async () => {
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${validObjectId}/hint`,
      );
      expect(res.status).toBe(404);
    });
  });
});

// ─── GET /api/practice/exercises/:exerciseId/history ─────────────────────────

describe('GET /api/practice/exercises/:exerciseId/history', () => {
  describe('success', () => {
    it('returns an empty array when no attempts exist', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        `/api/practice/exercises/${fill._id.toString()}/history`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('reflects the latest state, including hintLevel, after multiple submissions and hint requests', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'wrong' },
      });
      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);
      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });

      const res = await authedGet(
        token,
        `/api/practice/exercises/${exerciseId}/history`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        isPassed: true,
        attemptNumber: 2,
        hintLevel: 1,
      });
    });
  });

  describe('failures', () => {
    it('returns 404 for a non-existent exercise', async () => {
      const token = await getValidToken();
      const res = await authedGet(
        token,
        `/api/practice/exercises/${validObjectId}/history`,
      );
      expect(res.status).toBe(404);
    });
  });
});

// ─── Tag stats side-effects (covers tag_stats.ts) ────────────────────────────

describe('POST submit — tag stats side-effects', () => {
  async function seedTaggedExercise(tagIds?: Types.ObjectId[]) {
    const tag = await ExerciseTag.create({
      name: 'Variables',
      description: 'Variable usage',
    });
    const resolvedTagIds = tagIds ?? [tag._id];
    const exercise = await Exercise.create({
      ...fillBlankFixture,
      title: 'Tagged Exercise',
      tagId: resolvedTagIds,
    });
    return { tag, exercise };
  }

  it('creates a UserTagStats document on first submission', async () => {
    const { tag, exercise } = await seedTaggedExercise();
    const token = await getValidToken();

    await authedPost(
      token,
      `/api/practice/exercises/${exercise._id.toString()}/submit`,
      {
        answer: { input_1: 'age' },
      },
    );

    const stats = await UserTagStats.findOne({ tagId: tag._id }).lean();
    expect(stats).not.toBeNull();
    expect(stats?.totalAttempts).toBe(1);
    expect(stats?.failAttempts).toBe(0);
    expect(stats?.isWeak).toBe(false);
  });

  it('increments failAttempts on a wrong answer', async () => {
    const { tag, exercise } = await seedTaggedExercise();
    const token = await getValidToken();

    await authedPost(
      token,
      `/api/practice/exercises/${exercise._id.toString()}/submit`,
      {
        answer: { input_1: 'wrong' },
      },
    );

    const stats = await UserTagStats.findOne({ tagId: tag._id }).lean();
    expect(stats?.totalAttempts).toBe(1);
    expect(stats?.failAttempts).toBe(1);
  });

  it('sets isWeak=true when failure rate crosses threshold (≥3 attempts, ≥60% fail)', async () => {
    const { tag, exercise } = await seedTaggedExercise();
    const token = await getValidToken();
    const exerciseId = exercise._id.toString();

    // 3 wrong answers → 3/3 = 100% fail rate, totalAttempts=3 → isWeak
    await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
      answer: { input_1: 'wrong' },
    });
    await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
      answer: { input_1: 'wrong' },
    });
    await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
      answer: { input_1: 'wrong' },
    });

    const stats = await UserTagStats.findOne({ tagId: tag._id }).lean();
    expect(stats?.totalAttempts).toBe(3);
    expect(stats?.failAttempts).toBe(3);
    expect(stats?.isWeak).toBe(true);
  });

  it('keeps isWeak=false when below the minimum attempt threshold', async () => {
    const { tag, exercise } = await seedTaggedExercise();
    const token = await getValidToken();
    const exerciseId = exercise._id.toString();

    // 2 wrong answers — below MIN_ATTEMPTS_FOR_WEAK_TAG (3)
    await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
      answer: { input_1: 'wrong' },
    });
    await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
      answer: { input_1: 'wrong' },
    });

    const stats = await UserTagStats.findOne({ tagId: tag._id }).lean();
    expect(stats?.totalAttempts).toBe(2);
    expect(stats?.isWeak).toBe(false);
  });

  it('updates stats for every tagId on an exercise with multiple tags', async () => {
    const tag1 = await ExerciseTag.create({ name: 'Loops' });
    const tag2 = await ExerciseTag.create({ name: 'OOP' });
    const { exercise } = await seedTaggedExercise([tag1._id, tag2._id]);
    const token = await getValidToken();

    await authedPost(
      token,
      `/api/practice/exercises/${exercise._id.toString()}/submit`,
      {
        answer: { input_1: 'wrong' },
      },
    );

    const stats1 = await UserTagStats.findOne({ tagId: tag1._id }).lean();
    const stats2 = await UserTagStats.findOne({ tagId: tag2._id }).lean();
    expect(stats1?.totalAttempts).toBe(1);
    expect(stats2?.totalAttempts).toBe(1);
  });

  it('does not throw when exercise has no tagId (empty array early-return)', async () => {
    const exercise = await Exercise.create({
      ...fillBlankFixture,
      title: 'No Tag',
      tagId: [],
    });
    const token = await getValidToken();

    const res = await authedPost(
      token,
      `/api/practice/exercises/${exercise._id.toString()}/submit`,
      {
        answer: { input_1: 'age' },
      },
    );

    expect(res.status).toBe(200);
    const count = await UserTagStats.countDocuments();
    expect(count).toBe(0);
  });
});
