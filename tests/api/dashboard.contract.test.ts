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
import app from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';
import { ENV } from '../../src/config/env';
import User from '../../src/models/user.model';
import {
  Roadmap,
  Milestone,
  Lesson,
  Block,
  UserMilestoneProgress,
  UserLessonProgress,
} from '../../src/models/learning_system.model';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';
import { UserTagStats } from '../../src/models/user_tag_stats.model';
import { ExerciseTag } from '../../src/models/exercise_tag.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_LANGUAGE = 'Java';

function generateTestToken(userId: string) {
  return jwt.sign({ userId, email: 'dash@test.com' }, ENV.JWT_SECRET);
}

const createTestUser = async (withLanguage = true) => {
  return User.create({
    username: 'dashuser',
    email: 'dash@test.com',
    password: 'hashed-password',
    fullName: 'Dash User',
    selectedLanguage: withLanguage ? [TEST_LANGUAGE] : [],
  });
};

/**
 * Minimal DB structure for a valid 200:
 *   roadmap → milestone → lesson → block
 * Returns all created documents for tests that build on top.
 */
const seedDashboardData = async (userId: string) => {
  const roadmap = await Roadmap.create({
    language: TEST_LANGUAGE,
    title: 'Java Roadmap',
    description: 'Test roadmap',
  });

  const milestone = await Milestone.create({
    roadmapId: roadmap._id,
    title: 'Java Basics',
    order: 1,
    description: 'First milestone',
  });

  const lesson = await Lesson.create({
    milestoneId: milestone._id,
    title: 'Variables',
    order: 1,
    blocks: [],
  });

  const block = await Block.create({
    lessonId: lesson._id,
    title: 'What is a Variable?',
    description: 'Intro block',
    content: [
      { type: 'theory', data: { order: 1, text: 'A variable stores data.' } },
    ],
    feynmanQuestion: 'Explain a variable in your own words.',
  });

  lesson.blocks = [block._id];
  await lesson.save();

  // Seed active milestone progress so the controller can aggregate percentages.
  await UserMilestoneProgress.create({
    userId,
    milestoneId: milestone._id,
    completionPercentage: 0,
    status: 'active',
  });

  await UserLessonProgress.create({
    userId,
    lessonId: lesson._id,
    status: 'active',
    blockProgress: [
      {
        blockId: block._id,
        isFeynmanPassed: false,
        status: 'active',
        chatHistory: [],
      },
    ],
    completionPercentage: 0,
    isCompleted: false,
    lastAccessed: new Date(),
  });

  return { roadmap, milestone, lesson, block };
};

// ─── Contract Tests ──────────────────────────────────────────────────────────

describe('Dashboard API Contract Tests', () => {
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
    await seedDashboardData(userId);
  });

  // ─── GET /api/dashboard ───────────────────────────────────────────────────

  describe('GET /api/dashboard', () => {
    const endpoint = '/api/dashboard';

    // ── 200 — response shape ──────────────────────────────────────────────

    test('should return 200 with correct Content-Type', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should return top-level user object with correct shape', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');

      const { user } = response.body;
      expect(user).toMatchObject({
        _id: expect.any(String),
        email: expect.any(String),
        selectedLanguage: expect.any(Array),
      });
      expect(user.email).toBe('dash@test.com');
      expect(user.selectedLanguage).toContain(TEST_LANGUAGE);
    });

    test('should return top-level roadmap object with correct shape', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('roadmap');

      const { roadmap } = response.body;
      expect(roadmap).toMatchObject({
        _id: expect.any(String),
        title: expect.any(String),
        language: TEST_LANGUAGE,
      });
    });

    test('should return stats object with all required numeric fields', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');

      const { stats } = response.body;
      expect(typeof stats.totalLessons).toBe('number');
      expect(typeof stats.totalLearnedLessons).toBe('number');
      expect(typeof stats.totalExercises).toBe('number');
      expect(typeof stats.totalCompletedExercises).toBe('number');
      expect(typeof stats.overallProgress).toBe('number');
      expect(typeof stats.weakTagsCount).toBe('number');

      // Non-negative invariants.
      expect(stats.totalLessons).toBeGreaterThanOrEqual(0);
      expect(stats.totalLearnedLessons).toBeGreaterThanOrEqual(0);
      expect(stats.totalExercises).toBeGreaterThanOrEqual(0);
      expect(stats.totalCompletedExercises).toBeGreaterThanOrEqual(0);
      expect(stats.weakTagsCount).toBeGreaterThanOrEqual(0);

      // Progress is a 0-100 percentage.
      expect(stats.overallProgress).toBeGreaterThanOrEqual(0);
      expect(stats.overallProgress).toBeLessThanOrEqual(100);
    });

    test('should return milestones array with correct item shape', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.milestones)).toBe(true);
      expect(response.body.milestones.length).toBeGreaterThan(0);

      // Dashboard milestones are flat — no nested progress sub-object.
      const milestone = response.body.milestones[0];
      expect(milestone).toMatchObject({
        _id: expect.any(String),
        title: expect.any(String),
        status: expect.stringMatching(/^(locked|active|completed)$/),
        completionPercentage: expect.any(Number),
      });
      expect(milestone.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(milestone.completionPercentage).toBeLessThanOrEqual(100);

      // Dashboard milestones must NOT nest status/completionPercentage inside a progress key.
      expect(milestone).not.toHaveProperty('progress');
    });

    test('should return dailyReview object with pendingCount', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dailyReview');
      expect(typeof response.body.dailyReview.pendingCount).toBe('number');
      expect(response.body.dailyReview.pendingCount).toBeGreaterThanOrEqual(0);
    });

    // ── 200 — stat accuracy ───────────────────────────────────────────────

    test('totalLessons should match count of seeded lessons', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // seedDashboardData creates exactly 1 lesson.
      expect(response.body.stats.totalLessons).toBe(1);
    });

    test('totalExercises should be zero when no exercises exist', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.totalExercises).toBe(0);
    });

    test('totalCompletedExercises should be zero when user has no passing attempts', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.totalCompletedExercises).toBe(0);
    });

    test('totalCompletedExercises should count only isPassed:true attempts', async () => {
      // Create a lesson-linked exercise and two attempts: one passing, one not.
      const { lesson } = await Lesson.findOne({ title: 'Variables' }).then(
        (l) => ({ lesson: l! }),
      );

      const exercisePassed = await Exercise.create({
        lessonId: lesson._id,
        title: 'Passed Exercise',
        instruction: 'Fill in the blank',
        language: TEST_LANGUAGE,
        type: 'fill_blank',
        level: 'easy',
        data: { template: ['int ', ' = 1;'], placeholders: { input_1: 'x' } },
        correctAnswer: { input_1: 'x' },
        explanation: 'x is the variable name.',
      });

      const exerciseFailed = await Exercise.create({
        lessonId: lesson._id,
        title: 'Failed Exercise',
        instruction: 'Fill in the blank',
        language: TEST_LANGUAGE,
        type: 'fill_blank',
        level: 'easy',
        data: { template: ['int ', ' = 2;'], placeholders: { input_1: 'y' } },
        correctAnswer: { input_1: 'y' },
        explanation: 'y is the variable name.',
      });

      await ExerciseAttempt.create({
        userId,
        exerciseId: exercisePassed._id,
        isPassed: true,
        items: [{ field: 'input_1', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      await ExerciseAttempt.create({
        userId,
        exerciseId: exerciseFailed._id,
        isPassed: false,
        items: [{ field: 'input_1', isCorrect: false }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Only the passing attempt counts.
      expect(response.body.stats.totalCompletedExercises).toBe(1);
      expect(response.body.stats.totalExercises).toBe(2);
    });

    test('weakTagsCount should reflect UserTagStats entries with isWeak:true', async () => {
      const tag = await ExerciseTag.create({
        name: 'Variables',
        description: 'Variable usage',
      });

      await UserTagStats.create({
        userId,
        tagId: tag._id,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.weakTagsCount).toBe(1);
    });

    test('completed exercises must not exceed total exercises', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.totalCompletedExercises).toBeLessThanOrEqual(
        response.body.stats.totalExercises,
      );
    });

    // ── Error response shape ──────────────────────────────────────────────

    test('response must not contain sensitive user fields', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Top-level must not leak password or version key.
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('__v');
      // The nested user object must also not expose password.
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('response must not use a success/data envelope', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    // ── Auth guard ────────────────────────────────────────────────────────

    test('should return 401 with message when no token is provided', async () => {
      const response = await request(app).get(endpoint);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No token provided');

      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 401 with message when an invalid token is provided', async () => {
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
        .set('Authorization', 'BadFormatNoBearer');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No token provided');
    });

    // ── requireLanguageSelected guard ─────────────────────────────────────

    test('should return 400 when user has no language selected', async () => {
      await clearTestDB();
      const noLangUser = await createTestUser(false);
      const noLangToken = generateTestToken(noLangUser._id.toString());

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${noLangToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No language selected');

      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 404 when the token user no longer exists in DB', async () => {
      // JWT is valid but requireLanguageSelected does a DB lookup and 404s first.
      await User.findByIdAndDelete(userId);

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User not found');
    });

    test('should return 404 when roadmap for selected language no longer exists', async () => {
      await Roadmap.deleteMany({});

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe(
        'Roadmap not found for selected language',
      );
    });
  });

  // ─── Error Response Consistency ──────────────────────────────────────────

  describe('Error Response Consistency', () => {
    const endpoint = '/api/dashboard';

    test('all error responses should have a string message and no envelope fields', async () => {
      const cases = [
        // 401 — no token
        await request(app).get(endpoint),
        // 401 — bad token
        await request(app)
          .get(endpoint)
          .set('Authorization', 'Bearer bad.token'),
      ];

      for (const response of cases) {
        expect([400, 401, 404]).toContain(response.status);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
        expect(response.body).not.toHaveProperty('success');
        expect(response.body).not.toHaveProperty('data');
      }
    });
  });

  // ─── Response Headers ─────────────────────────────────────────────────────

  describe('Response Headers', () => {
    test('success response should be application/json', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('error response should also be application/json', async () => {
      const response = await request(app).get('/api/dashboard');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ─── Response Example (Living Documentation) ─────────────────────────────

  describe('Response Example', () => {
    test('GET /api/dashboard - full success response shape', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Exact top-level keys the DashboardResponse interface requires.
      expect(response.body).toMatchObject({
        user: {
          _id: expect.any(String),
          email: expect.any(String),
          selectedLanguage: expect.any(Array),
        },
        roadmap: {
          _id: expect.any(String),
          title: expect.any(String),
          language: expect.any(String),
        },
        stats: {
          totalLessons: expect.any(Number),
          totalLearnedLessons: expect.any(Number),
          totalExercises: expect.any(Number),
          totalCompletedExercises: expect.any(Number),
          overallProgress: expect.any(Number),
          weakTagsCount: expect.any(Number),
        },
        milestones: expect.any(Array),
        dailyReview: {
          pendingCount: expect.any(Number),
        },
      });

      console.log('Example response for GET /api/dashboard:');
      console.log(JSON.stringify(response.body, null, 2));
    });
  });
});
