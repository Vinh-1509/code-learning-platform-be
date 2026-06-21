import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import app from '../../src/app';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;

function makeToken(userId: string = new Types.ObjectId().toString()): string {
  return jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const INVALID_OBJECT_ID = 'not-a-valid-id';

async function createExercise(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return Exercise.create({
    title: 'Test Exercise',
    instruction: 'Fill in the blank',
    language: 'C++',
    type: 'fill_blank',
    level: 'easy',
    data: {
      template: ['int ', ' = 10;'],
      placeholders: { input_1: 'x' },
    },
    correctAnswer: { input_1: 'x' },
    explanation: 'x is the variable name.',
    order: 1,
    ...overrides,
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── GET /api/practice/exercises ─────────────────────────────────────────────

describe('GET /api/practice/exercises', () => {
  const ENDPOINT = '/api/practice/exercises';

  describe('Authentication', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app).get(ENDPOINT);
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    test('returns 401 when the token is invalid', async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Success', () => {
    test('returns 200 with paginated shape when authenticated', async () => {
      const token = makeToken();
      await createExercise();

      const res = await request(app).get(ENDPOINT).set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('returns 200 with empty data when no exercises exist', async () => {
      const token = makeToken();
      const res = await request(app).get(ENDPOINT).set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.data).toHaveLength(0);
    });

    test('each item has required fields', async () => {
      const token = makeToken();
      await createExercise();

      const res = await request(app).get(ENDPOINT).set(authHeader(token));

      expect(res.status).toBe(200);
      const item = res.body.data[0];
      expect(item).toHaveProperty('_id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('instruction');
      expect(item).toHaveProperty('language');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('level');
      expect(item).toHaveProperty('status');
    });

    test('does not expose correctAnswer or explanation in list items', async () => {
      const token = makeToken();
      await createExercise();

      const res = await request(app).get(ENDPOINT).set(authHeader(token));

      const item = res.body.data[0];
      expect(item).not.toHaveProperty('correctAnswer');
      expect(item).not.toHaveProperty('explanation');
    });
  });

  describe('Pagination', () => {
    test('defaults to page=1 and limit=15', async () => {
      const token = makeToken();
      const res = await request(app).get(ENDPOINT).set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(15);
    });

    test('respects page and limit query params', async () => {
      const token = makeToken();
      const res = await request(app)
        .get(`${ENDPOINT}?page=2&limit=5`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(5);
    });

    test('clamps limit to MAX_LIMIT (50)', async () => {
      const token = makeToken();
      const res = await request(app)
        .get(`${ENDPOINT}?limit=999`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(50);
    });

    test('ignores non-positive page values and falls back to default', async () => {
      const token = makeToken();
      const res = await request(app)
        .get(`${ENDPOINT}?page=0`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
    });
  });

  describe('Filtering', () => {
    test('filters by language', async () => {
      const token = makeToken();
      await createExercise({ language: 'C++' });
      await createExercise({ language: 'Java', title: 'Java Exercise' });

      const res = await request(app)
        .get(`${ENDPOINT}?language=Java`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((e: { language: string }) => e.language === 'Java'),
      ).toBe(true);
    });

    test('ignores unsupported language filter values', async () => {
      const token = makeToken();
      await createExercise({ language: 'C++' });

      const res = await request(app)
        .get(`${ENDPOINT}?language=Python`)
        .set(authHeader(token));

      // Falls back to unfiltered
      expect(res.status).toBe(200);
    });

    test('filters by difficulty level', async () => {
      const token = makeToken();
      await createExercise({ level: 'easy' });
      await createExercise({ level: 'hard', title: 'Hard Exercise' });

      const res = await request(app)
        .get(`${ENDPOINT}?difficulty=easy`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((e: { level: string }) => e.level === 'easy'),
      ).toBe(true);
    });

    test('filters by search query q (title match)', async () => {
      const token = makeToken();
      await createExercise({ title: 'Unique Unicorn Title' });
      await createExercise({ title: 'Other Exercise' });

      const res = await request(app)
        .get(`${ENDPOINT}?q=Unicorn`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toMatch(/Unicorn/i);
    });

    test('filters by tagId — ignores invalid ObjectId tagId silently', async () => {
      const token = makeToken();
      await createExercise();

      const res = await request(app)
        .get(`${ENDPOINT}?tagId=not-an-objectid`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
    });

    test('filters by valid tagId', async () => {
      const token = makeToken();
      const tagId = new Types.ObjectId();
      await createExercise({ tagId: [tagId] });
      await createExercise({ title: 'No Tag Exercise' });

      const res = await request(app)
        .get(`${ENDPOINT}?tagId=${tagId.toString()}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });
  });
});

// ─── GET /api/practice/exercises/:exerciseId ─────────────────────────────────

describe('GET /api/practice/exercises/:exerciseId', () => {
  describe('validateObjectId middleware', () => {
    test('returns 400 for an invalid ObjectId', async () => {
      const token = makeToken();
      const res = await request(app)
        .get(`/api/practice/exercises/${INVALID_OBJECT_ID}`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/exerciseId/i);
    });
  });

  describe('Authentication', () => {
    test('returns 401 without a token', async () => {
      const id = new Types.ObjectId().toString();
      const res = await request(app).get(`/api/practice/exercises/${id}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Not found', () => {
    test('returns 404 for a valid but non-existent exerciseId', async () => {
      const token = makeToken();
      const id = new Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/practice/exercises/${id}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Success', () => {
    test('returns 200 with detail shape including data and hints fields', async () => {
      const token = makeToken();
      const exercise = await createExercise({
        hints: { '1': 'First hint' },
      });

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('instruction');
      expect(res.body).toHaveProperty('language');
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('level');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('hints');
    });

    test('does not expose correctAnswer in the detail response', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('correctAnswer');
    });
  });
});

// ─── POST /api/practice/exercises/:exerciseId/submit ─────────────────────────

describe('POST /api/practice/exercises/:exerciseId/submit', () => {
  describe('validateObjectId middleware', () => {
    test('returns 400 for an invalid ObjectId', async () => {
      const token = makeToken();
      const res = await request(app)
        .post(`/api/practice/exercises/${INVALID_OBJECT_ID}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exerciseId/i);
    });
  });

  describe('Authentication', () => {
    test('returns 401 without a token', async () => {
      const id = new Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/practice/exercises/${id}/submit`)
        .send({ answer: { input_1: 'x' } });
      expect(res.status).toBe(401);
    });
  });

  describe('Request body validation', () => {
    test('returns 400 when answer is missing', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    test('returns 400 when answer is a string instead of an object', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: 'wrong-type' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    test('returns 400 when answer is an array instead of an object', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: ['a', 'b'] });

      expect(res.status).toBe(400);
    });
  });

  describe('Not found', () => {
    test('returns 404 for non-existent exercise', async () => {
      const token = makeToken();
      const id = new Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/practice/exercises/${id}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      expect(res.status).toBe(404);
    });
  });

  describe('Success', () => {
    test('returns 200 with correct response shape on correct answer', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('correct');
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('attemptNumber');
      expect(typeof res.body.correct).toBe('boolean');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.attemptNumber).toBe('number');
    });

    test('returns correct: true for a matching answer', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(true);
    });

    test('returns correct: false for a wrong answer', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'wrong' } });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
    });

    test('items array contains field and isCorrect for each graded field', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      expect(res.status).toBe(200);
      const item = res.body.items[0];
      expect(item).toHaveProperty('field');
      expect(item).toHaveProperty('isCorrect');
      expect(typeof item.field).toBe('string');
      expect(typeof item.isCorrect).toBe('boolean');
    });

    test('increments attemptNumber on repeated submissions', async () => {
      const token = makeToken();
      const userId = new Types.ObjectId().toString();
      const token2 = jwt.sign({ userId, email: 'user@test.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const exercise = await createExercise();

      const res1 = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token2))
        .send({ answer: { input_1: 'wrong' } });

      const res2 = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token2))
        .send({ answer: { input_1: 'wrong' } });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res2.body.attemptNumber).toBe(res1.body.attemptNumber + 1);
    });

    test('does not expose correctAnswer in submit response', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      expect(res.body).not.toHaveProperty('correctAnswer');
    });
  });
});

// ─── POST /api/practice/exercises/:exerciseId/hint ───────────────────────────

describe('POST /api/practice/exercises/:exerciseId/hint', () => {
  describe('validateObjectId middleware', () => {
    test('returns 400 for an invalid ObjectId', async () => {
      const token = makeToken();
      const res = await request(app)
        .post(`/api/practice/exercises/${INVALID_OBJECT_ID}/hint`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exerciseId/i);
    });
  });

  describe('Authentication', () => {
    test('returns 401 without a token', async () => {
      const id = new Types.ObjectId().toString();
      const res = await request(app).post(`/api/practice/exercises/${id}/hint`);
      expect(res.status).toBe(401);
    });
  });

  describe('Not found', () => {
    test('returns 404 for non-existent exercise', async () => {
      const token = makeToken();
      const id = new Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/practice/exercises/${id}/hint`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  describe('Success', () => {
    test('returns 200 with hintLevel and hint fields', async () => {
      const token = makeToken();
      const exercise = await createExercise({
        hints: { '1': 'Try using the variable name from the instruction.' },
      });

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/hint`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hintLevel');
      expect(res.body).toHaveProperty('hint');
      expect(typeof res.body.hintLevel).toBe('number');
    });

    test('returns hintLevel 1 and the first hint on first request', async () => {
      const userId = new Types.ObjectId().toString();
      const token = jwt.sign({ userId, email: 'hint@test.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const exercise = await createExercise({
        hints: { '1': 'Hint one', '2': 'Hint two' },
      });

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/hint`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.hintLevel).toBe(1);
      expect(res.body.hint).toBe('Hint one');
    });

    test('does not advance hintLevel beyond available hints', async () => {
      const userId = new Types.ObjectId().toString();
      const token = jwt.sign({ userId, email: 'hint2@test.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const exercise = await createExercise({
        hints: { '1': 'Only hint' },
      });

      // First hint request — advances to level 1
      await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/hint`)
        .set(authHeader(token));

      // Second hint request — no level 2 hint exists
      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/hint`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.hintLevel).toBe(1);
    });

    test('returns "No hints available" when exercise has no hints', async () => {
      const token = makeToken();
      const exercise = await createExercise({ hints: undefined });

      const res = await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/hint`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.hint).toBe('No hints available');
    });
  });
});

// ─── GET /api/practice/exercises/:exerciseId/history ─────────────────────────

describe('GET /api/practice/exercises/:exerciseId/history', () => {
  describe('validateObjectId middleware', () => {
    test('returns 400 for an invalid ObjectId', async () => {
      const token = makeToken();
      const res = await request(app)
        .get(`/api/practice/exercises/${INVALID_OBJECT_ID}/history`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exerciseId/i);
    });
  });

  describe('Authentication', () => {
    test('returns 401 without a token', async () => {
      const id = new Types.ObjectId().toString();
      const res = await request(app).get(
        `/api/practice/exercises/${id}/history`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('Not found', () => {
    test('returns 404 when exercise does not exist', async () => {
      const token = makeToken();
      const id = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/practice/exercises/${id}/history`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  describe('Success', () => {
    test('returns 200 with an empty array when no attempt exists', async () => {
      const token = makeToken();
      const exercise = await createExercise();

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}/history`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    test('returns 200 with an array of one attempt after a submission', async () => {
      const userId = new Types.ObjectId().toString();
      const token = jwt.sign({ userId, email: 'hist@test.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const exercise = await createExercise();

      await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}/history`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });

    test('history item has required fields', async () => {
      const userId = new Types.ObjectId().toString();
      const token = jwt.sign({ userId, email: 'hist2@test.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const exercise = await createExercise();

      await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}/history`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      const attempt = res.body[0];
      expect(attempt).toHaveProperty('_id');
      expect(attempt).toHaveProperty('exerciseId');
      expect(attempt).toHaveProperty('isPassed');
      expect(attempt).toHaveProperty('items');
      expect(attempt).toHaveProperty('hintLevel');
      expect(attempt).toHaveProperty('attemptNumber');
      expect(attempt).toHaveProperty('attemptedAt');
    });

    test('history is scoped to the requesting user — another user sees empty array', async () => {
      const userA = new Types.ObjectId().toString();
      const tokenA = jwt.sign(
        { userId: userA, email: 'a@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );
      const userB = new Types.ObjectId().toString();
      const tokenB = jwt.sign(
        { userId: userB, email: 'b@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      const exercise = await createExercise();

      await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(tokenA))
        .send({ answer: { input_1: 'x' } });

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}/history`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    test('history reflects latest attempt state after multiple submissions', async () => {
      const userId = new Types.ObjectId().toString();
      const token = jwt.sign({ userId, email: 'multi@test.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const exercise = await createExercise();

      await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'wrong' } });

      await request(app)
        .post(`/api/practice/exercises/${exercise._id.toString()}/submit`)
        .set(authHeader(token))
        .send({ answer: { input_1: 'x' } });

      const res = await request(app)
        .get(`/api/practice/exercises/${exercise._id.toString()}/history`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].attemptNumber).toBe(2);
      expect(res.body[0].isPassed).toBe(true);
    });
  });
});
