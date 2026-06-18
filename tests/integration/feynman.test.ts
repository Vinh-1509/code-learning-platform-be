import request from 'supertest';
import {
  describe,
  it,
  expect,
  vi,
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
  UserMilestoneProgress,
  UserLessonProgress,
} from '../../src/models/learning_system.model';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';

import jwt from 'jsonwebtoken';
import { ENV } from '../../src/config/env';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

// ─── Mock Feynman AI service ──────────────────────────────────────────────────
// Must be declared before any imports that transitively load the service.
vi.mock('../../src/services/feynman.service', () => ({
  generateFeynmanFeedback: vi.fn(),
}));

import { generateFeynmanFeedback } from '../../src/services/feynman.service';

// ─── DB Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => {
  await clearTestDB();
  vi.clearAllMocks();
});
afterAll(async () => await disconnectTestDB());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(userId: string) {
  return jwt.sign({ userId, email: 'student@test.com' }, ENV.JWT_SECRET);
}

function mockAiPass() {
  (generateFeynmanFeedback as any).mockResolvedValue({
    reply: 'Great explanation!',
    isPassed: true,
  });
}

function mockAiFail() {
  (generateFeynmanFeedback as any).mockResolvedValue({
    reply: 'Try again. What is the key idea?',
    isPassed: false,
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Feynman Integration', () => {
  let token: string;
  let userId: string;

  // IDs for a block with NO required exercises (simplest case)
  let blockId: string;
  let lessonId: string;
  let milestoneId: string;

  // IDs for a block with a required exercise
  let blockWithExerciseId: string;
  let exerciseId: string;

  beforeEach(async () => {
    const user = await User.create({
      username: 'student',
      email: 'student@test.com',
      password: 'hashed-password',
      selectedLanguage: ['Java'],
    });
    userId = user._id.toString();
    token = generateToken(userId);

    const roadmap = await Roadmap.create({
      language: 'Java',
      title: 'Java Roadmap',
      description: 'Java',
    });

    const milestone = await Milestone.create({
      roadmapId: roadmap._id,
      title: 'Basics',
      order: 1,
    });
    milestoneId = milestone._id.toString();

    // Give the user an active milestone so requireBlockAccess passes.
    await UserMilestoneProgress.create({
      userId,
      milestoneId,
      completionPercentage: 0,
      status: 'active',
    });

    // ── Lesson with a plain block (no required exercises) ───────────────────

    const lesson = await Lesson.create({
      milestoneId,
      title: 'Variables',
      order: 1,
      blocks: [],
    });
    lessonId = lesson._id.toString();

    const block = await Block.create({
      lessonId,
      title: 'What is a Variable?',
      content: [],
      feynmanQuestion: 'Explain a variable in your own words.',
    });
    blockId = block._id.toString();

    await Lesson.findByIdAndUpdate(lessonId, { blocks: [block._id] });

    // Create active lesson progress so the block is 'active' not 'locked'.
    await UserLessonProgress.create({
      userId,
      lessonId,
      status: 'active',
      completionPercentage: 0,
      isCompleted: false,
      blockProgress: [
        {
          blockId: block._id,
          isFeynmanPassed: false,
          status: 'active',
          chatHistory: [],
        },
      ],
    });

    // ── Lesson with a block that has a required exercise ────────────────────

    const lesson2 = await Lesson.create({
      milestoneId,
      title: 'Control Flow',
      order: 2,
      blocks: [],
    });

    const exercise = await Exercise.create({
      lessonId: lesson2._id,
      title: 'Even or Odd',
      instruction: 'Fill in the blank',
      language: 'Java',
      type: 'fill_blank',
      level: 'easy',
      data: { template: ['int x = ', ';'], placeholders: { input_1: '5' } },
      correctAnswer: { input_1: '5' },
      explanation: 'Just 5.',
    });
    exerciseId = exercise._id.toString();

    const blockWithExercise = await Block.create({
      lessonId: lesson2._id,
      title: 'Even / Odd',
      content: [
        {
          type: 'practice',
          data: { order: 1, exerciseId: exercise._id, required: true },
        },
      ],
    });
    blockWithExerciseId = blockWithExercise._id.toString();

    await Lesson.findByIdAndUpdate(lesson2._id, {
      blocks: [blockWithExercise._id],
    });

    await UserLessonProgress.create({
      userId,
      lessonId: lesson2._id,
      status: 'active',
      completionPercentage: 0,
      isCompleted: false,
      blockProgress: [
        {
          blockId: blockWithExercise._id,
          isFeynmanPassed: false,
          status: 'active',
          chatHistory: [],
        },
      ],
    });
  });

  // ─── GET /feynman/block/:blockId/question ───────────────────────────────────

  describe('GET /api/feynman/block/:blockId/question', () => {
    it('returns the feynmanQuestion for an active block', async () => {
      const res = await request(app)
        .get(`/api/feynman/block/${blockId}/question`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.blockId).toBe(blockId);
      expect(res.body.question).toBe('Explain a variable in your own words.');
    });

    it('returns 400 for an invalid ObjectId', async () => {
      const res = await request(app)
        .get('/api/feynman/block/not-an-id/question')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('returns 401 with no token', async () => {
      const res = await request(app).get(
        `/api/feynman/block/${blockId}/question`,
      );

      expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent block', async () => {
      const { Types } = await import('mongoose');
      const fakeId = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/feynman/block/${fakeId}/question`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('returns 403 when required exercises are not yet passed', async () => {
      const res = await request(app)
        .get(`/api/feynman/block/${blockWithExerciseId}/question`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/required exercises/i);
    });

    it('returns 200 once required exercises are passed', async () => {
      await ExerciseAttempt.create({
        userId,
        exerciseId,
        isPassed: true,
        items: [],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/feynman/block/${blockWithExerciseId}/question`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── POST /feynman/block/:blockId/chat ──────────────────────────────────────

  describe('POST /api/feynman/block/:blockId/chat', () => {
    it('returns 400 when message is missing', async () => {
      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/message is required/i);
    });

    it('returns 400 when message is an empty string', async () => {
      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '   ' });

      expect(res.status).toBe(400);
    });

    it('appends user and assistant messages to chat history', async () => {
      mockAiFail();

      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'A variable stores a value.' });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBe('Try again. What is the key idea?');
      expect(res.body.isPassed).toBe(false);

      const progress = await UserLessonProgress.findOne({ userId, lessonId });
      const bp = progress?.blockProgress.find(
        (b) => b.blockId.toString() === blockId,
      );
      // Initial assistant question + user message + AI reply = 3 messages.
      expect(bp?.chatHistory).toHaveLength(3);
      expect(bp?.chatHistory[1]).toMatchObject({
        role: 'user',
        content: 'A variable stores a value.',
      });
      expect(bp?.chatHistory[2]).toMatchObject({
        role: 'assistant',
        content: 'Try again. What is the key idea?',
      });
    });

    it('marks isFeynmanPassed and completes the block when AI passes', async () => {
      mockAiPass();

      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'A variable is a named memory location that holds data.',
        });

      expect(res.status).toBe(200);
      expect(res.body.isPassed).toBe(true);

      const progress = await UserLessonProgress.findOne({ userId, lessonId });
      const bp = progress?.blockProgress.find(
        (b) => b.blockId.toString() === blockId,
      );
      expect(bp?.isFeynmanPassed).toBe(true);
      expect(bp?.status).toBe('completed');
    });

    it('marks lesson as completed when it has only one block and AI passes', async () => {
      mockAiPass();

      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'A variable holds data in memory.' });

      const progress = await UserLessonProgress.findOne({ userId, lessonId });
      expect(progress?.isCompleted).toBe(true);
      expect(progress?.completionPercentage).toBe(100);
      expect(progress?.status).toBe('completed');
    });

    it('does not re-complete a block that is already completed', async () => {
      mockAiPass();

      // Pass once.
      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'A variable holds data.' });

      // Pass again — should not error or change anything meaningful.
      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Still holds data.' });

      expect(res.status).toBe(200);
      expect(res.body.isPassed).toBe(true);
    });

    it('returns 403 when required exercises are not yet passed', async () => {
      const res = await request(app)
        .post(`/api/feynman/block/${blockWithExerciseId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Some explanation.' });

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /feynman/block/:blockId/history ────────────────────────────────────

  describe('GET /api/feynman/block/:blockId/history', () => {
    it('returns empty initial chat history (only opening question)', async () => {
      const res = await request(app)
        .get(`/api/feynman/block/${blockId}/history`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.blockId).toBe(blockId);
      // getOrCreateBlockProgress seeds one assistant message when history is empty.
      expect(res.body.chatHistory).toHaveLength(1);
      expect(res.body.chatHistory[0]).toMatchObject({
        role: 'assistant',
        content: 'Explain a variable in your own words.',
      });
    });

    it('returns accumulated history after a chat turn', async () => {
      mockAiFail();

      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'It stores values.' });

      const res = await request(app)
        .get(`/api/feynman/block/${blockId}/history`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.chatHistory).toHaveLength(3);
    });

    it('returns 403 when required exercises are not passed', async () => {
      const res = await request(app)
        .get(`/api/feynman/block/${blockWithExerciseId}/history`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /feynman/block/:blockId/history/reset ─────────────────────────────

  describe('POST /api/feynman/block/:blockId/history/reset', () => {
    it('resets chat history to just the opening question', async () => {
      mockAiFail();

      // Build up some history first.
      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'First attempt.' });

      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Second attempt.' });

      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/history/reset`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.chatHistory).toHaveLength(1);
      expect(res.body.chatHistory[0]).toMatchObject({
        role: 'assistant',
        content: 'Explain a variable in your own words.',
      });
    });

    it('preserves isFeynmanPassed state after reset', async () => {
      mockAiPass();

      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'A variable is a named container for a value.' });

      const res = await request(app)
        .post(`/api/feynman/block/${blockId}/history/reset`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.isFeynmanPassed).toBe(true);
      expect(res.body.chatHistory).toHaveLength(1);
    });

    it('returns 403 when required exercises are not passed', async () => {
      const res = await request(app)
        .post(`/api/feynman/block/${blockWithExerciseId}/history/reset`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /feynman/block/:blockId/stats ──────────────────────────────────────

  describe('GET /api/feynman/block/:blockId/stats', () => {
    it('returns isFeynmanPassed: false before any passing attempt', async () => {
      const res = await request(app)
        .get(`/api/feynman/block/${blockId}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.blockId).toBe(blockId);
      expect(res.body.isFeynmanPassed).toBe(false);
    });

    it('returns isFeynmanPassed: true after a passing chat', async () => {
      mockAiPass();

      await request(app)
        .post(`/api/feynman/block/${blockId}/chat`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'A variable is a labeled box for data.' });

      const res = await request(app)
        .get(`/api/feynman/block/${blockId}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.isFeynmanPassed).toBe(true);
    });

    it('returns 403 when required exercises are not passed', async () => {
      const res = await request(app)
        .get(`/api/feynman/block/${blockWithExerciseId}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
