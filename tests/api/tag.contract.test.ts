import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import app from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';
import { ENV } from '../../src/config/env';
import User from '../../src/models/user.model';
import { ExerciseTag } from '../../src/models/exercise_tag.model';
import { UserTagStats } from '../../src/models/user_tag_stats.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTestToken(userId: string) {
  return jwt.sign({ userId, email: 'tag@test.com' }, ENV.JWT_SECRET);
}

const createTestUser = async () => {
  return User.create({
    username: 'taguser',
    email: 'tag@test.com',
    password: 'hashed-password',
    fullName: 'Tag User',
    selectedLanguage: ['Java'],
  });
};

// ─── Contract Tests ──────────────────────────────────────────────────────────

describe('Tag API Contract Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const user = await createTestUser();
    userId = user._id.toString();
    authToken = generateTestToken(userId);
  });

  // ─── GET /api/tags/weakness ───────────────────────────────────────────────

  describe('GET /api/tags/weakness', () => {
    const endpoint = '/api/tags/weakness';

    // ── Happy path ────────────────────────────────────────────────────────

    test('should return 200 with empty array when user has no weak tags', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should return 200 with only tags where isWeak is true', async () => {
      const weakTag = await ExerciseTag.create({
        name: 'Loops',
        description: 'Loop control',
      });
      const strongTag = await ExerciseTag.create({
        name: 'Variables',
        description: 'Variable usage',
      });

      // Weak: 4/5 failures → 80% failure rate, above the 60% threshold.
      await UserTagStats.create({
        userId,
        tagId: weakTag._id,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });

      // Not weak: 1/5 failures → 20% failure rate.
      await UserTagStats.create({
        userId,
        tagId: strongTag._id,
        totalAttempts: 5,
        failAttempts: 1,
        isWeak: false,
      });

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Loops');
    });

    test('should return correct TagStatsResponse shape for each item', async () => {
      const tag = await ExerciseTag.create({
        name: 'OOP',
        description: 'Object-oriented concepts',
      });

      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 5,
        failAttempts: 3,
        isWeak: true,
      });

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);

      const item = response.body[0];
      expect(item).toMatchObject({
        _id: expect.any(String),
        name: expect.any(String),
        totalAttempts: expect.any(Number),
        failAttempts: expect.any(Number),
        failureRate: expect.any(Number),
        isWeak: true,
      });

      // description and updatedAt are optional per interface.
      if (item.description !== undefined) {
        expect(typeof item.description).toBe('string');
      }
      if (item.updatedAt !== undefined) {
        expect(typeof item.updatedAt).toBe('string');
        expect(new Date(item.updatedAt).toString()).not.toBe('Invalid Date');
      }
    });

    test('should return correct failureRate calculation', async () => {
      const tag = await ExerciseTag.create({ name: 'Control Flow' });

      // 3 / 5 = 60% → isWeak threshold
      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 5,
        failAttempts: 3,
        isWeak: true,
      });

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].failureRate).toBe(60);
    });

    test('should return tags sorted by failureRate descending', async () => {
      const tagA = await ExerciseTag.create({ name: 'Tag A' });
      const tagB = await ExerciseTag.create({ name: 'Tag B' });
      const tagC = await ExerciseTag.create({ name: 'Tag C' });

      // failureRate: A=80%, B=100%, C=60% → sorted order: B, A, C
      await UserTagStats.insertMany([
        {
          userId,
          tagId: tagA._id,
          totalAttempts: 5,
          failAttempts: 4,
          isWeak: true,
        }, // 80%
        {
          userId,
          tagId: tagB._id,
          totalAttempts: 5,
          failAttempts: 5,
          isWeak: true,
        }, // 100%
        {
          userId,
          tagId: tagC._id,
          totalAttempts: 5,
          failAttempts: 3,
          isWeak: true,
        }, // 60%
      ]);

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      const rates = response.body.map((item: any) => item.failureRate);
      for (let i = 0; i < rates.length - 1; i++) {
        expect(rates[i]).toBeGreaterThanOrEqual(rates[i + 1]);
      }
    });

    test('should break failureRate ties by failAttempts descending', async () => {
      const tagA = await ExerciseTag.create({ name: 'Tied A' });
      const tagB = await ExerciseTag.create({ name: 'Tied B' });

      // Both 80% failure rate, but B has more failAttempts → B should come first.
      await UserTagStats.insertMany([
        {
          userId,
          tagId: tagA._id,
          totalAttempts: 5,
          failAttempts: 4,
          isWeak: true,
        }, // 80%, 4 fails
        {
          userId,
          tagId: tagB._id,
          totalAttempts: 10,
          failAttempts: 8,
          isWeak: true,
        }, // 80%, 8 fails
      ]);

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Tied B');
      expect(response.body[1].name).toBe('Tied A');
    });

    test('should only return weak tags for the authenticated user, not other users', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@test.com',
        password: 'hashed',
        selectedLanguage: ['Java'],
      });

      const tag = await ExerciseTag.create({ name: 'Shared Tag' });

      // Only other user has a weak tag — current user has none.
      await UserTagStats.create({
        userId: otherUser._id,
        tagId: tag._id,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    test('should return 200 with correct Content-Type', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should not use a success/data envelope', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Response is a bare array, not { success, data }.
      expect(Array.isArray(response.body)).toBe(true);
    });

    // ── Auth guard ────────────────────────────────────────────────────────

    test('should return 401 when no token is provided', async () => {
      const response = await request(app).get(endpoint);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No token provided');

      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 401 when an invalid token is provided', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid token');
    });

    test('should return 401 when Authorization header has wrong format', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', 'NoBearer');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No token provided');
    });
  });

  // ─── GET /api/tags/:tagId/info ────────────────────────────────────────────

  describe('GET /api/tags/:tagId/info', () => {
    const baseEndpoint = '/api/tags';

    // ── Happy path ────────────────────────────────────────────────────────

    test('should return 200 with zeroed stats when user has no attempts for that tag', async () => {
      const tag = await ExerciseTag.create({
        name: 'Variables',
        description: 'Variable declaration and usage',
      });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: expect.any(String),
        name: 'Variables',
        totalAttempts: 0,
        failAttempts: 0,
        failureRate: 0,
        isWeak: false,
      });
    });

    test('should return 200 with correct shape when user has stats for that tag', async () => {
      const tag = await ExerciseTag.create({
        name: 'OOP',
        description: 'Object-oriented concepts',
      });

      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 10,
        failAttempts: 7,
        isWeak: true,
      });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: expect.any(String),
        name: 'OOP',
        description: 'Object-oriented concepts',
        totalAttempts: 10,
        failAttempts: 7,
        failureRate: 70,
        isWeak: true,
      });
    });

    test('should return correct TagStatsResponse field types', async () => {
      const tag = await ExerciseTag.create({ name: 'Data Types' });

      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 4,
        failAttempts: 3,
        isWeak: true,
      });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const body = response.body;
      expect(typeof body._id).toBe('string');
      expect(typeof body.name).toBe('string');
      expect(typeof body.totalAttempts).toBe('number');
      expect(typeof body.failAttempts).toBe('number');
      expect(typeof body.failureRate).toBe('number');
      expect(typeof body.isWeak).toBe('boolean');

      if (body.description !== undefined) {
        expect(typeof body.description).toBe('string');
      }
      if (body.updatedAt !== undefined) {
        expect(typeof body.updatedAt).toBe('string');
        expect(new Date(body.updatedAt).toString()).not.toBe('Invalid Date');
      }
    });

    test('should return correct failureRate: Math.round(failAttempts / totalAttempts * 100)', async () => {
      const tag = await ExerciseTag.create({ name: 'Operators' });

      // 2 / 3 = 66.67% → rounds to 67
      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 3,
        failAttempts: 2,
        isWeak: false,
      });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.failureRate).toBe(67);
    });

    test('should return stats for the requesting user only, not another user', async () => {
      const otherUser = await User.create({
        username: 'other2',
        email: 'other2@test.com',
        password: 'hashed',
        selectedLanguage: ['Java'],
      });

      const tag = await ExerciseTag.create({ name: 'Loops' });

      // Other user has attempts; the requesting user does not.
      await UserTagStats.create({
        userId: otherUser._id,
        tagId: tag._id,
        totalAttempts: 8,
        failAttempts: 6,
        isWeak: true,
      });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Must reflect the requesting user's stats (zeroed), not the other user's.
      expect(response.body.totalAttempts).toBe(0);
      expect(response.body.failAttempts).toBe(0);
      expect(response.body.isWeak).toBe(false);
    });

    test('should return 200 with correct Content-Type', async () => {
      const tag = await ExerciseTag.create({ name: 'Control Flow' });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    // ── validateObjectId guard ────────────────────────────────────────────

    test('should return 400 for an invalid ObjectId format', async () => {
      const response = await request(app)
        .get(`${baseEndpoint}/not-a-valid-id/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ message: 'Invalid tagId' });

      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 400 for an ObjectId-like but short string', async () => {
      const response = await request(app)
        .get(`${baseEndpoint}/12345/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ message: 'Invalid tagId' });
    });

    // ── Not-found ─────────────────────────────────────────────────────────

    test('should return 404 when tag does not exist', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const response = await request(app)
        .get(`${baseEndpoint}/${nonExistentId}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ message: 'Tag not found' });

      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    // ── Auth guard ────────────────────────────────────────────────────────

    test('should return 401 when no token is provided', async () => {
      const tag = await ExerciseTag.create({ name: 'Auth Test Tag' });

      const response = await request(app).get(
        `${baseEndpoint}/${String(tag._id)}/info`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No token provided');

      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 401 when an invalid token is provided', async () => {
      const tag = await ExerciseTag.create({ name: 'Auth Test Tag 2' });

      const response = await request(app)
        .get(`${baseEndpoint}/${String(tag._id)}/info`)
        .set('Authorization', 'Bearer bad.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid token');
    });
  });

  // ─── Error Response Consistency ──────────────────────────────────────────

  describe('Error Response Consistency', () => {
    test('all 400 errors have a string message and no envelope', async () => {
      const response = await request(app)
        .get('/api/tags/bad-id/info')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('all 401 errors have a string message and no envelope', async () => {
      const response = await request(app).get('/api/tags/weakness');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('all 404 errors have a string message and no envelope', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/tags/${nonExistentId}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });
  });

  // ─── Response Headers ─────────────────────────────────────────────────────

  describe('Response Headers', () => {
    test('GET /api/tags/weakness should return application/json', async () => {
      const response = await request(app)
        .get('/api/tags/weakness')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('GET /api/tags/:tagId/info should return application/json', async () => {
      const tag = await ExerciseTag.create({ name: 'Header Test Tag' });

      const response = await request(app)
        .get(`/api/tags/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ─── Response Examples (Living Documentation) ─────────────────────────────

  describe('Response Examples', () => {
    test('GET /api/tags/weakness - success response example', async () => {
      const tag = await ExerciseTag.create({
        name: 'OOP',
        description: 'Object-oriented concepts',
      });

      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });

      const response = await request(app)
        .get('/api/tags/weakness')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      console.log('Example response for GET /api/tags/weakness:');
      console.log(JSON.stringify(response.body, null, 2));
    });

    test('GET /api/tags/:tagId/info - success response example', async () => {
      const tag = await ExerciseTag.create({
        name: 'Loops',
        description: 'Loop control and iteration',
      });

      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 8,
        failAttempts: 5,
        isWeak: true,
      });

      const response = await request(app)
        .get(`/api/tags/${String(tag._id)}/info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: expect.any(String),
        name: expect.any(String),
        totalAttempts: expect.any(Number),
        failAttempts: expect.any(Number),
        failureRate: expect.any(Number),
        isWeak: expect.any(Boolean),
      });

      console.log('Example response for GET /api/tags/:tagId/info:');
      console.log(JSON.stringify(response.body, null, 2));
    });
  });
});
