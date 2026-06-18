import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

import app from '../../src/app';
import authRoutes from '../../src/routes/auth.routes';
import practiceRoutes from '../../src/routes/practice.routes';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';
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
    it('returns paginated exercises with total, page, and limit', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        total: 2,
        page: 1,
        limit: 15,
      });
      expect(res.body.data).toHaveLength(2);
    });

    it('each exercise item has required list fields', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises');

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

  describe('pagination', () => {
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

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(2);
    });

    it('caps limit at 50', async () => {
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises?limit=999');

      expect(res.body.limit).toBe(50);
    });
  });

  describe('filtering', () => {
    it('filters by language', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises?language=C%2B%2B',
      );

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].language).toBe('C++');
    });

    it('filters by difficulty', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises?difficulty=easy',
      );

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].level).toBe('easy');
    });

    it('filters by search query (title match)', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises?q=Declare');

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toBe('Declare a Variable');
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

    it('ignores unsupported language values', async () => {
      await seedExercises();
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises?language=Python',
      );

      // Unsupported language is ignored — all exercises are returned
      expect(res.body.total).toBe(2);
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

    it('status becomes completed after a correct submission', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });

      const res = await authedGet(
        token,
        `/api/practice/exercises/${exerciseId}`,
      );

      expect(res.body.status).toBe('completed');
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
      expect(res.body.message).toBe('Exercise not found');
    });

    it('returns 400 for an invalid ObjectId', async () => {
      const token = await getValidToken();
      const res = await authedGet(token, '/api/practice/exercises/bad-id');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid exerciseId');
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
  describe('correct answer', () => {
    it('returns correct: true with per-field items', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/submit`,
        { answer: { input_1: 'age' } },
      );

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual({ field: 'input_1', isCorrect: true });
      expect(res.body.attemptNumber).toBe(1);
    });

    it('marks the exercise as completed after a correct answer', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });

      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt?.isPassed).toBe(true);
    });
  });

  describe('incorrect answer', () => {
    it('returns correct: false with per-field items', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/submit`,
        { answer: { input_1: 'wrongAnswer' } },
      );

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
      expect(res.body.items[0]).toEqual({
        field: 'input_1',
        isCorrect: false,
      });
    });

    it('isPassed stays true after a wrong re-submit', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      // First submit correct
      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });

      // Then submit wrong
      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'wrong' },
      });

      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt?.isPassed).toBe(true);
    });
  });

  describe('attempt tracking', () => {
    it('increments attemptNumber on each submission', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();
      const url = `/api/practice/exercises/${exerciseId}/submit`;
      const body = { answer: { input_1: 'wrong' } };

      const first = await authedPost(token, url, body);
      const second = await authedPost(token, url, body);
      const third = await authedPost(token, url, body);

      expect(first.body.attemptNumber).toBe(1);
      expect(second.body.attemptNumber).toBe(2);
      expect(third.body.attemptNumber).toBe(3);
    });

    it('keeps only one attempt document per user+exercise (upsert)', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();
      const url = `/api/practice/exercises/${exerciseId}/submit`;

      await authedPost(token, url, { answer: { input_1: 'wrong' } });
      await authedPost(token, url, { answer: { input_1: 'wrong' } });
      await authedPost(token, url, { answer: { input_1: 'age' } });

      const count = await ExerciseAttempt.countDocuments({ exerciseId });
      expect(count).toBe(1);
    });

    it('stores the latest user answer in the attempt document', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'first' },
      });
      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });

      const attempt = await ExerciseAttempt.findOne({ exerciseId }).lean();
      expect(attempt?.userAnswer).toEqual({ input_1: 'age' });
    });
  });

  describe('drag_drop grading', () => {
    it('grades a drag_drop exercise correctly', async () => {
      const { drag } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${drag._id.toString()}/submit`,
        { answer: { '1': 'block-1', '2': 'block-0' } },
      );

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(true);
      expect(res.body.items).toHaveLength(2);
    });

    it('returns partial correctness for a partially correct drag_drop answer', async () => {
      const { drag } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${drag._id.toString()}/submit`,
        { answer: { '1': 'block-1', '2': 'block-2' } },
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
    it('returns 400 when answer is not an object', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/submit`,
        { answer: 'just a string' },
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Answer must be an object');
    });

    it('returns 400 when answer is an array', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/submit`,
        { answer: ['a', 'b'] },
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Answer must be an object');
    });

    it('returns 400 when answer field is missing entirely', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${fill._id.toString()}/submit`,
        {},
      );

      expect(res.status).toBe(400);
    });

    it('returns 404 for a non-existent exercise', async () => {
      const token = await getValidToken();
      const res = await authedPost(
        token,
        `/api/practice/exercises/${validObjectId}/submit`,
        { answer: { input_1: 'age' } },
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Exercise not found');
    });

    it('returns 400 for an invalid ObjectId', async () => {
      const token = await getValidToken();
      const res = await authedPost(
        token,
        '/api/practice/exercises/bad-id/submit',
        { answer: { input_1: 'age' } },
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid exerciseId');
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

    it('advances to hint level 2 on second request', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);
      const res = await authedPost(
        token,
        `/api/practice/exercises/${exerciseId}/hint`,
      );

      expect(res.body.hintLevel).toBe(2);
      expect(res.body.hint).toBe(fillBlankFixture.hints['2']);
    });

    it('does not advance beyond the last available hint', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      // Exhaust both hints
      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);
      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);

      // Request a third time — no hint 3 exists
      const res = await authedPost(
        token,
        `/api/practice/exercises/${exerciseId}/hint`,
      );

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

    it('returns 400 for an invalid ObjectId', async () => {
      const token = await getValidToken();
      const res = await authedPost(
        token,
        '/api/practice/exercises/bad-id/hint',
      );

      expect(res.status).toBe(400);
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

    it('returns the latest attempt after a submission', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

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
        attemptNumber: 1,
        hintLevel: 0,
      });
    });

    it('reflects the latest state after multiple submissions', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'wrong' },
      });
      await authedPost(token, `/api/practice/exercises/${exerciseId}/submit`, {
        answer: { input_1: 'age' },
      });

      const res = await authedGet(
        token,
        `/api/practice/exercises/${exerciseId}/history`,
      );

      // Still only one document due to upsert
      expect(res.body).toHaveLength(1);
      expect(res.body[0].attemptNumber).toBe(2);
      expect(res.body[0].isPassed).toBe(true);
    });

    it('history includes hintLevel when hints were requested', async () => {
      const { fill } = await seedExercises();
      const token = await getValidToken();
      const exerciseId = fill._id.toString();

      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);
      await authedPost(token, `/api/practice/exercises/${exerciseId}/hint`);

      const res = await authedGet(
        token,
        `/api/practice/exercises/${exerciseId}/history`,
      );

      expect(res.body[0].hintLevel).toBe(2);
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

    it('returns 400 for an invalid ObjectId', async () => {
      const token = await getValidToken();
      const res = await authedGet(
        token,
        '/api/practice/exercises/bad-id/history',
      );

      expect(res.status).toBe(400);
    });

    it('returns 401 when no token is provided', async () => {
      const { fill } = await seedExercises();
      const res = await request(app).get(
        `/api/practice/exercises/${fill._id.toString()}/history`,
      );

      expect(res.status).toBe(401);
    });
  });
});
