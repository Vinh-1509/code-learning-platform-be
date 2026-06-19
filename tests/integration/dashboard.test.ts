import request from 'supertest';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import app from '../../src/app';

import User from '../../src/models/user.model';
import {
  Roadmap,
  Milestone,
  Lesson,
  UserMilestoneProgress,
  UserLessonProgress,
} from '../../src/models/learning_system.model';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';
import { ExerciseTag } from '../../src/models/exercise_tag.model';
import { UserTagStats } from '../../src/models/user_tag_stats.model';

import jwt from 'jsonwebtoken';
import { ENV } from '../../src/config/env';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

// ─── DB Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(userId: string) {
  return jwt.sign({ userId, email: 'user@test.com' }, ENV.JWT_SECRET);
}

async function seedBaseData(overrides: { selectedLanguage?: string[] } = {}) {
  const user = await User.create({
    username: 'dashuser',
    email: 'user@test.com',
    password: 'hashed-password',
    selectedLanguage: overrides.selectedLanguage ?? ['Java'],
  });

  const roadmap = await Roadmap.create({
    language: 'Java',
    title: 'Java Roadmap',
    description: 'Java',
  });

  const milestone1 = await Milestone.create({
    roadmapId: roadmap._id,
    title: 'Fundamentals',
    order: 1,
  });

  const milestone2 = await Milestone.create({
    roadmapId: roadmap._id,
    title: 'OOP',
    order: 2,
  });

  return { user, roadmap, milestone1, milestone2 };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  // ─── Auth & language guard ────────────────────────────────────────────────

  describe('auth and middleware guards', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(401);
    });

    it('returns 400 when user has no selected language', async () => {
      const user = await User.create({
        username: 'nolang',
        email: 'nolang@test.com',
        password: 'hashed',
        selectedLanguage: [],
      });
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No language selected');
    });

    it('returns 404 when roadmap is not found for selected language', async () => {
      // User has a language selected but no roadmap exists for it.
      const user = await User.create({
        username: 'noroadmap',
        email: 'noroadmap@test.com',
        password: 'hashed',
        selectedLanguage: ['Java'],
      });
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/roadmap not found/i);
    });
  });

  // ─── Response shape ───────────────────────────────────────────────────────

  describe('response shape', () => {
    it('returns 200 with all top-level keys', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('roadmap');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('milestones');
      expect(res.body).toHaveProperty('dailyReview');
    });

    it('returns the correct user sub-object (no password)', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.user).toMatchObject({
        email: 'user@test.com',
        username: 'dashuser',
        selectedLanguage: ['Java'],
      });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('returns the correct roadmap sub-object', async () => {
      const { user, roadmap } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.roadmap).toMatchObject({
        title: 'Java Roadmap',
        language: 'Java',
      });
      expect(res.body.roadmap._id).toBe(roadmap._id.toString());
    });

    it('returns a milestones array sorted by order', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.milestones).toHaveLength(2);

      const [first, second] = res.body.milestones;
      expect(first.title).toBe('Fundamentals');
      expect(second.title).toBe('OOP');
    });

    it('each milestone item has _id, title, status, and completionPercentage', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      for (const m of res.body.milestones) {
        expect(m).toHaveProperty('_id');
        expect(m).toHaveProperty('title');
        expect(m).toHaveProperty('status');
        expect(m).toHaveProperty('completionPercentage');
      }
    });

    it('returns dailyReview.pendingCount as 0', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.dailyReview.pendingCount).toBe(0);
    });
  });

  // ─── Milestone statuses ───────────────────────────────────────────────────

  describe('milestone status fallback', () => {
    it('defaults first milestone to active and rest to locked when no progress exists', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.milestones[0].status).toBe('active');
      expect(res.body.milestones[1].status).toBe('locked');
    });

    it('reflects stored milestone progress when it exists', async () => {
      const { user, milestone1, milestone2 } = await seedBaseData();
      const userId = user._id.toString();

      await UserMilestoneProgress.create({
        userId,
        milestoneId: milestone1._id,
        completionPercentage: 100,
        status: 'completed',
      });
      await UserMilestoneProgress.create({
        userId,
        milestoneId: milestone2._id,
        completionPercentage: 50,
        status: 'active',
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.milestones[0].status).toBe('completed');
      expect(res.body.milestones[0].completionPercentage).toBe(100);
      expect(res.body.milestones[1].status).toBe('active');
      expect(res.body.milestones[1].completionPercentage).toBe(50);
    });
  });

  // ─── Stats ────────────────────────────────────────────────────────────────

  describe('stats', () => {
    it('returns all zero stats for a brand-new user', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats).toMatchObject({
        totalLearnedLessons: 0,
        totalCompletedExercises: 0,
        overallProgress: 0,
        weakTagsCount: 0,
      });
    });

    it('counts totalCompletedExercises from passed exercise attempts', async () => {
      const { user, roadmap, milestone1 } = await seedBaseData();
      const userId = user._id.toString();

      const lesson = await Lesson.create({
        milestoneId: milestone1._id,
        title: 'Variables',
        order: 1,
        blocks: [],
      });

      const exercise = await Exercise.create({
        lessonId: lesson._id,
        title: 'Declare a var',
        instruction: 'Fill in',
        language: 'Java',
        type: 'fill_blank',
        level: 'easy',
        data: {},
        correctAnswer: { input_1: 'x' },
        explanation: 'x is a variable',
      });

      await ExerciseAttempt.create({
        userId,
        exerciseId: exercise._id,
        isPassed: true,
        items: [],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats.totalCompletedExercises).toBe(1);
    });

    it('does not count failed exercise attempts toward totalCompletedExercises', async () => {
      const { user, milestone1 } = await seedBaseData();
      const userId = user._id.toString();

      const lesson = await Lesson.create({
        milestoneId: milestone1._id,
        title: 'Loops',
        order: 1,
        blocks: [],
      });
      const exercise = await Exercise.create({
        lessonId: lesson._id,
        title: 'Loop Q',
        instruction: 'Fill',
        language: 'Java',
        type: 'fill_blank',
        level: 'easy',
        data: {},
        correctAnswer: { input_1: 'for' },
        explanation: 'for loop',
      });

      await ExerciseAttempt.create({
        userId,
        exerciseId: exercise._id,
        isPassed: false,
        items: [],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats.totalCompletedExercises).toBe(0);
    });

    it('counts totalLearnedLessons from lessons with active or completed progress', async () => {
      const { user, milestone1 } = await seedBaseData();
      const userId = user._id.toString();

      const lesson1 = await Lesson.create({
        milestoneId: milestone1._id,
        title: 'L1',
        order: 1,
        blocks: [],
      });
      const lesson2 = await Lesson.create({
        milestoneId: milestone1._id,
        title: 'L2',
        order: 2,
        blocks: [],
      });

      // lesson1 completed, lesson2 active
      await UserLessonProgress.create({
        userId,
        lessonId: lesson1._id,
        status: 'active',
        isCompleted: true,
        completionPercentage: 100,
        blockProgress: [],
      });
      await UserLessonProgress.create({
        userId,
        lessonId: lesson2._id,
        status: 'active',
        isCompleted: false,
        completionPercentage: 33,
        blockProgress: [],
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats.totalLearnedLessons).toBe(2);
    });

    it('counts weakTagsCount from UserTagStats with isWeak: true', async () => {
      const { user } = await seedBaseData();
      const userId = user._id.toString();

      const tag1 = await ExerciseTag.create({
        name: 'Loops',
        description: 'Loop tag',
      });
      const tag2 = await ExerciseTag.create({
        name: 'OOP',
        description: 'OOP tag',
      });

      // Two weak tags
      await UserTagStats.create({
        userId,
        tagId: tag1._id,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });
      await UserTagStats.create({
        userId,
        tagId: tag2._id,
        totalAttempts: 5,
        failAttempts: 4,
        isWeak: true,
      });

      // One non-weak tag
      const tag3 = await ExerciseTag.create({ name: 'Variables' });
      await UserTagStats.create({
        userId,
        tagId: tag3._id,
        totalAttempts: 5,
        failAttempts: 1,
        isWeak: false,
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats.weakTagsCount).toBe(2);
    });

    it('calculates overallProgress as the average completionPercentage across milestones', async () => {
      const { user, milestone1, milestone2 } = await seedBaseData();
      const userId = user._id.toString();

      await UserMilestoneProgress.create({
        userId,
        milestoneId: milestone1._id,
        completionPercentage: 100,
        status: 'completed',
      });
      await UserMilestoneProgress.create({
        userId,
        milestoneId: milestone2._id,
        completionPercentage: 50,
        status: 'active',
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      // average(100, 50) = 75
      expect(res.body.stats.overallProgress).toBe(75);
    });

    it('overallProgress is 0 when no milestone progress exists', async () => {
      const { user } = await seedBaseData();
      const token = generateToken(user._id.toString());

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats.overallProgress).toBe(0);
    });

    it('does not count weak tags belonging to another user', async () => {
      const { user } = await seedBaseData();
      const userId = user._id.toString();

      // Create another user's weak tag — should not appear in dashboard user's count.
      const otherUser = await User.create({
        username: 'other',
        email: 'other@test.com',
        password: 'hashed',
        selectedLanguage: ['Java'],
      });
      const tag = await ExerciseTag.create({ name: 'Control Flow' });
      await UserTagStats.create({
        userId: otherUser._id,
        tagId: tag._id,
        totalAttempts: 5,
        failAttempts: 5,
        isWeak: true,
      });

      const token = generateToken(userId);
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.stats.weakTagsCount).toBe(0);
    });
  });
});
