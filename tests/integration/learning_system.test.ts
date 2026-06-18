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
  Block,
  UserLessonProgress,
  UserMilestoneProgress,
} from '../../src/models/learning_system.model';

import jwt from 'jsonwebtoken';
import { ENV } from '../../src/config/env';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

function generateTestToken(userId: string) {
  return jwt.sign(
    {
      userId,
      email: 'student@test.com',
    },
    ENV.JWT_SECRET,
  );
}

// ─── DB Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Learning System Integration', () => {
  let token: string;

  let roadmapId: string;
  let milestone1Id: string;
  let milestone2Id: string;

  let lesson1Id: string;
  let lesson2Id: string;

  let block1Id: string;
  let block2Id: string;

  beforeEach(async () => {
    const user = await User.create({
      username: 'student',
      email: 'student@test.com',
      password: 'hashed-password',
      selectedLanguage: [],
    });

    token = generateTestToken(user._id.toString());

    const roadmap = await Roadmap.create({
      language: 'Java',
      title: 'Java Roadmap',
      description: 'Java',
    });

    roadmapId = roadmap.id;

    const milestone1 = await Milestone.create({
      roadmapId,
      title: 'Basics',
      order: 1,
    });

    const milestone2 = await Milestone.create({
      roadmapId,
      title: 'OOP',
      order: 2,
    });

    milestone1Id = milestone1.id;
    milestone2Id = milestone2.id;

    const lesson1 = await Lesson.create({
      milestoneId: milestone1Id,
      title: 'Variables',
      order: 1,
      blocks: [],
    });

    const lesson2 = await Lesson.create({
      milestoneId: milestone1Id,
      title: 'Data Types',
      order: 2,
      blocks: [],
    });

    lesson1Id = lesson1.id;
    lesson2Id = lesson2.id;

    const block1 = await Block.create({
      lessonId: lesson1Id,
      title: 'Intro',
      content: [],
    });

    const block2 = await Block.create({
      lessonId: lesson1Id,
      title: 'Examples',
      content: [],
    });

    block1Id = block1.id;
    block2Id = block2.id;

    await Lesson.findByIdAndUpdate(lesson1Id, {
      blocks: [block1._id, block2._id],
    });
  });

  // ─── POST /languages/select ─────────────────────────────────────────────────

  describe('POST /languages/select', () => {
    it('selects language successfully', async () => {
      const res = await request(app)
        .post('/api/languages/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'Java' });

      expect(res.status).toBe(200);

      const user = await User.findOne({ email: 'student@test.com' });
      expect(user?.selectedLanguage).toEqual(['Java']);
    });

    it('rejects unsupported language', async () => {
      const res = await request(app)
        .post('/api/languages/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'Python' });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /learning/milestones ───────────────────────────────────────────────

  describe('GET /learning/milestones', () => {
    beforeEach(async () => {
      await User.updateOne(
        { email: 'student@test.com' },
        { selectedLanguage: ['Java'] },
      );
    });

    it('creates first milestone as active and second as locked', async () => {
      const res = await request(app)
        .get('/api/learning/milestones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].progress.status).toBe('active');
      expect(res.body[1].progress.status).toBe('locked');
    });

    it('creates milestone progress records in the database', async () => {
      await request(app)
        .get('/api/learning/milestones')
        .set('Authorization', `Bearer ${token}`);

      const progress = await UserMilestoneProgress.find();
      expect(progress).toHaveLength(2);
    });
  });

  // ─── GET /learning/lessons/:id ──────────────────────────────────────────────

  describe('GET /learning/lessons/:id', () => {
    beforeEach(async () => {
      await User.updateOne(
        { email: 'student@test.com' },
        { selectedLanguage: ['Java'] },
      );

      // Trigger lazy milestone progress creation so the lesson access middleware
      // finds an active milestone instead of trying to create it from scratch.
      await request(app)
        .get('/api/learning/milestones')
        .set('Authorization', `Bearer ${token}`);
    });

    it('creates lesson progress lazily on first access', async () => {
      const res = await request(app)
        .get(`/api/learning/lessons/${lesson1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const progress = await UserLessonProgress.findOne({
        lessonId: lesson1Id,
      });
      expect(progress).not.toBeNull();
      expect(progress?.blockProgress).toHaveLength(2);
    });

    it('activates first block and locks second block', async () => {
      const res = await request(app)
        .get(`/api/learning/lessons/${lesson1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.blocks[0].status).toBe('active');
      expect(res.body.blocks[1].status).toBe('locked');
    });

    it('returns 403 for a lesson in a locked milestone', async () => {
      // lesson2 belongs to milestone1 (active), but its preceding lesson (lesson1)
      // has not been completed, so access should be forbidden.
      const res = await request(app)
        .get(`/api/learning/lessons/${lesson2Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /learning/blocks/:id/complete ─────────────────────────────────────

  describe('POST /learning/blocks/:id/complete', () => {
    beforeEach(async () => {
      await User.updateOne(
        { email: 'student@test.com' },
        { selectedLanguage: ['Java'] },
      );

      // Seed milestone progress (active) and lesson progress (with block progress).
      await request(app)
        .get('/api/learning/milestones')
        .set('Authorization', `Bearer ${token}`);

      await request(app)
        .get(`/api/learning/lessons/${lesson1Id}`)
        .set('Authorization', `Bearer ${token}`);
    });

    it('completes first block and unlocks second block', async () => {
      const res = await request(app)
        .post(`/api/learning/blocks/${block1Id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const progress = await UserLessonProgress.findOne({
        lessonId: lesson1Id,
      });
      expect(progress?.blockProgress[0].status).toBe('completed');
      expect(progress?.blockProgress[1].status).toBe('active');
    });

    it('returns 403 when attempting to complete a locked block', async () => {
      const res = await request(app)
        .post(`/api/learning/blocks/${block2Id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('marks lesson as completed after all blocks are completed', async () => {
      await request(app)
        .post(`/api/learning/blocks/${block1Id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      await request(app)
        .post(`/api/learning/blocks/${block2Id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      const progress = await UserLessonProgress.findOne({
        lessonId: lesson1Id,
      });
      expect(progress?.isCompleted).toBe(true);
      expect(progress?.completionPercentage).toBe(100);
      expect(progress?.status).toBe('completed');
    });
  });
});
