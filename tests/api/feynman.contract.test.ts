import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import app from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';
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
import { LanguageInfo } from '../../src/models/language_info.model';
import * as feynmanService from '../../src/services/feynman.service';
import * as qsService from '../../src/services/question_generation.service';
import jwt from 'jsonwebtoken';
import { ENV } from '../../src/config/env';

// ─── Test Data Setup ──────────────────────────────────────────────────────────

const setupTestData = async () => {
  // Create roadmap
  const roadmap = await Roadmap.create({
    language: 'Java',
    title: 'Java Programming',
    description: 'Complete Java learning path',
  });

  // Create language info
  await LanguageInfo.create({
    language: 'Java',
    info: 'Java is a popular programming language',
    strengths: ['Platform independence', 'Large ecosystem'],
    challenges: ['Memory management', 'Verbosity'],
    useCases: ['Enterprise applications', 'Android development'],
  });

  // Create milestone
  const milestone = await Milestone.create({
    roadmapId: roadmap._id,
    title: 'Java Basics',
    order: 1,
    description: 'Fundamental concepts of Java programming',
  });

  // Create lesson
  const lesson = await Lesson.create({
    milestoneId: milestone._id,
    title: 'Variables and Data Types',
    order: 1,
    blocks: [],
  });

  // Create practice exercise
  const exercise = await Exercise.create({
    lessonId: lesson._id,
    title: 'Variable Declaration Practice',
    instruction: "Declare a variable to store a user's age",
    language: 'Java',
    type: 'fill_blank',
    level: 'easy',
    data: { fields: ['type', 'name', 'value'] },
    correctAnswer: { type: 'int', name: 'age', value: '25' },
    explanation: 'Variables store data values in memory',
    hints: { type: 'Consider the data type for whole numbers' },
  });

  // Create blocks for lesson
  const block1 = await Block.create({
    lessonId: lesson._id,
    title: 'Introduction to Variables',
    description: 'Learn what variables are',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'A variable is a named memory location that stores a value.',
        },
      },
      {
        type: 'code',
        data: {
          order: 2,
          code: 'int age = 25;',
          explanation: 'Declares an integer variable named age',
        },
      },
      {
        type: 'practice',
        data: {
          order: 3,
          exerciseId: exercise._id,
          required: true,
        },
      },
    ],
    feynmanQuestion: 'Can you explain what a variable is in your own words?',
  });

  const block2 = await Block.create({
    lessonId: lesson._id,
    title: 'Data Types',
    description: 'Learn about primitive data types',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'Java has 8 primitive data types.',
        },
      },
    ],
    feynmanQuestion: 'What are primitive data types in Java?',
  });

  const block3 = await Block.create({
    lessonId: lesson._id,
    title: 'Type Conversion',
    description: 'Learn about type conversion',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'Type conversion is converting one data type to another.',
        },
      },
    ],
    feynmanQuestion: undefined, // No Feynman question
  });

  // Update lesson with blocks
  lesson.blocks = [block1._id, block2._id, block3._id];
  await lesson.save();

  return {
    roadmap,
    milestone,
    lesson,
    exercise,
    blocks: [block1, block2, block3],
  };
};

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function generateTestToken(userId: string) {
  return jwt.sign(
    {
      userId,
      email: 'student@test.com',
    },
    ENV.JWT_SECRET,
  );
}

const createTestUser = async () => {
  const user = await User.create({
    username: 'student',
    email: 'student@test.com',
    password: 'hashed-password',
    selectedLanguage: ['Java'],
  });
  return user;
};

const createLessonProgress = async (
  userId: string,
  lessonId: Types.ObjectId,
  blockIds: Types.ObjectId[],
) => {
  return await UserLessonProgress.create({
    userId,
    lessonId,
    status: 'active',
    blockProgress: blockIds.map((blockId, index) => ({
      blockId,
      isFeynmanPassed: false,
      status: index === 0 ? 'active' : 'locked',
      chatHistory: [],
    })),
    completionPercentage: 0,
    isCompleted: false,
    lastAccessed: new Date(),
  });
};

const createMilestoneProgress = async (
  userId: string,
  milestoneId: Types.ObjectId,
) => {
  return await UserMilestoneProgress.create({
    userId,
    milestoneId,
    completionPercentage: 0,
    status: 'active',
  });
};

// ─── Contract Tests ──────────────────────────────────────────────────────────

describe('Feynman API Contract Tests', () => {
  let testData: any;
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
    testData = await setupTestData();

    const user = await createTestUser();
    userId = user._id.toString();
    authToken = generateTestToken(userId);

    await createMilestoneProgress(userId, testData.milestone._id);
    await createLessonProgress(
      userId,
      testData.lesson._id,
      testData.blocks.map((b: any) => b._id),
    );

    vi.spyOn(feynmanService, 'generateFeynmanFeedback').mockResolvedValue({
      reply: 'Great explanation! You understand the concept well.',
      isPassed: true,
    });

    vi.spyOn(qsService, 'generateQS').mockResolvedValue({
      question: 'Can you explain what a variable is in your own words?',
      isEnough: true,
    });
  });

  // ─── GET /feynman/block/:blockId/question ──────────────────────────────────

  describe('GET api/feynman/block/:blockId/question', () => {
    const endpoint = '/api/feynman/block';

    test('should return 200 with question for block with Feynman question', async () => {
      const block = testData.blocks[0]; // Block with feynmanQuestion

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/question`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.status).toBe(200);

      // Verify response structure matches FeynmanQuestionResponse interface
      expect(response.body).toMatchObject({
        blockId: expect.any(String),
        question: expect.any(String),
      });

      expect(response.body.blockId).toBe(String(block._id));
      expect(response.body.question).toBe(block.feynmanQuestion);
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get(`${endpoint}/invalid-id/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid blockId',
      });

      // Error shape validation
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 401 when no token provided', async () => {
      const block = testData.blocks[0];
      const response = await request(app).get(
        `${endpoint}/${String(block._id)}/question`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 403 when block is locked', async () => {
      const block = testData.blocks[1]; // Second block - locked

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: 'Feynman is not available for a locked block',
      });
    });

    test('should return 404 when block not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`${endpoint}/${nonExistentId}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Block not found',
      });
    });

    test('should return 404 when lesson not found', async () => {
      // Create a block without a valid lesson reference
      const orphanBlock = await Block.create({
        lessonId: new Types.ObjectId(), // Non-existent lesson
        title: 'Orphan Block',
        content: [],
        feynmanQuestion: 'Test question?',
      });

      const response = await request(app)
        .get(`${endpoint}/${String(orphanBlock._id)}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Lesson not found',
      });
    });
  });

  // ─── POST /feynman/block/:blockId/chat ────────────────────────────────────

  describe('POST api/feynman/block/:blockId/chat', () => {
    const endpoint = '/api/feynman/block';

    beforeEach(() => {
      // Mock the Feynman service to avoid actual API calls
      vi.spyOn(feynmanService, 'generateFeynmanFeedback').mockResolvedValue({
        reply: 'Great explanation! You understand the concept well.',
        isPassed: true,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should return 200 with AI reply when chat is successful', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'A variable is a container that stores data.' });

      expect(response.status).toBe(200);

      // Verify response structure matches FeynmanChatResponse interface
      expect(response.body).toMatchObject({
        blockId: expect.any(String),
        reply: expect.any(String),
        isPassed: expect.any(Boolean),
      });

      expect(response.body.blockId).toBe(String(block._id));
      expect(typeof response.body.reply).toBe('string');
      expect(typeof response.body.isPassed).toBe('boolean');
    });

    test('should return 200 with isPassed: false when AI says not passed', async () => {
      vi.spyOn(feynmanService, 'generateFeynmanFeedback').mockResolvedValueOnce(
        {
          reply: 'Try again. Focus on the main purpose of variables.',
          isPassed: false,
        },
      );

      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: "I don't know." });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        blockId: String(block._id),
        reply: expect.any(String),
        isPassed: false,
      });
    });

    test('should return 400 when message is missing', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Message is required',
      });
    });

    test('should return 400 when message is empty string', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Message is required',
      });
    });

    test('should return 400 when message is whitespace only', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Message is required',
      });
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .post(`${endpoint}/invalid-id/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Test message' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid blockId',
      });
    });

    test('should return 401 when no token provided', async () => {
      const block = testData.blocks[0];

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .send({ message: 'Test message' });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 403 when block is locked', async () => {
      const block = testData.blocks[1]; // Second block - locked

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Test message' });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: 'Feynman is not available for a locked block',
      });
    });

    test('should return 403 when required exercises are not passed', async () => {
      const block = testData.blocks[0]; // Block with practice exercise

      // Don't create any exercise attempts (exercise not passed)

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Test message' });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: 'Complete all required exercises before starting Feynman',
      });
    });

    test('should allow Feynman when required exercises are passed', async () => {
      const block = testData.blocks[0]; // Block with practice exercise

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'A variable stores data.' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        blockId: String(block._id),
        reply: expect.any(String),
        isPassed: expect.any(Boolean),
      });
    });

    test('should return 404 when block not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const response = await request(app)
        .post(`${endpoint}/${nonExistentId}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Test message' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Block not found',
      });
    });

    test('should handle AI service errors gracefully', async () => {
      vi.spyOn(feynmanService, 'generateFeynmanFeedback').mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'A variable stores data.' });

      // Should return 500 internal server error
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        message: 'Failed to process Feynman chat',
      });
    });
  });

  // ─── GET /feynman/block/:blockId/history ──────────────────────────────────

  describe('GET api/feynman/block/:blockId/history', () => {
    const endpoint = '/api/feynman/block';

    beforeEach(async () => {
      // Create some chat history
      const block = testData.blocks[0];
      const lessonProgress = await UserLessonProgress.findOne({
        userId: new Types.ObjectId(userId),
        lessonId: testData.lesson._id,
      });

      if (lessonProgress) {
        const blockProgress = lessonProgress.blockProgress.find(
          (bp: any) => bp.blockId.toString() === String(block._id),
        );
        if (blockProgress) {
          blockProgress.chatHistory = [
            { role: 'assistant', content: 'What is a variable?' },
            { role: 'user', content: 'A variable stores data.' },
            { role: 'assistant', content: 'Great! Can you give an example?' },
          ];
          await lessonProgress.save();
        }
      }
    });

    test('should return 200 with chat history', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify response structure matches FeynmanHistoryResponse interface
      expect(response.body).toMatchObject({
        blockId: expect.any(String),
        chatHistory: expect.any(Array),
      });

      expect(response.body.blockId).toBe(String(block._id));
      expect(Array.isArray(response.body.chatHistory)).toBe(true);

      // Verify chat message structure
      if (response.body.chatHistory.length > 0) {
        const message = response.body.chatHistory[0];
        expect(message).toHaveProperty('role');
        expect(message).toHaveProperty('content');
        expect(['user', 'assistant']).toContain(message.role);
        expect(typeof message.content).toBe('string');
      }
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get(`${endpoint}/invalid-id/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid blockId',
      });
    });

    test('should return 401 when no token provided', async () => {
      const block = testData.blocks[0];

      const response = await request(app).get(
        `${endpoint}/${String(block._id)}/history`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 403 when block is locked', async () => {
      const block = testData.blocks[1]; // Second block - locked

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: 'Feynman is not available for a locked block',
      });
    });

    test('should return 404 when block not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const response = await request(app)
        .get(`${endpoint}/${nonExistentId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Block not found',
      });
    });
  });

  // ─── POST /feynman/block/:blockId/history/reset ──────────────────────────

  describe('POST api/feynman/block/:blockId/history/reset', () => {
    const endpoint = '/api/feynman/block';

    beforeEach(async () => {
      // Create some chat history
      const block = testData.blocks[0];
      const lessonProgress = await UserLessonProgress.findOne({
        userId: new Types.ObjectId(userId),
        lessonId: testData.lesson._id,
      });

      if (lessonProgress) {
        const blockProgress = lessonProgress.blockProgress.find(
          (bp: any) => bp.blockId.toString() === String(block._id),
        );
        if (blockProgress) {
          blockProgress.chatHistory = [
            { role: 'assistant', content: 'What is a variable?' },
            { role: 'user', content: 'A variable stores data.' },
            { role: 'assistant', content: 'Great! Can you give an example?' },
          ];
          blockProgress.isFeynmanPassed = true;
          await lessonProgress.save();
        }
      }
    });

    test('should return 200 and reset chat history', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/history/reset`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify response structure matches FeynmanResetHistoryResponse interface
      expect(response.body).toMatchObject({
        blockId: expect.any(String),
        chatHistory: expect.any(Array),
        isFeynmanPassed: expect.any(Boolean),
      });

      expect(response.body.blockId).toBe(String(block._id));
      expect(Array.isArray(response.body.chatHistory)).toBe(true);

      // Should only have the assistant's question
      expect(response.body.chatHistory.length).toBe(1);
      expect(response.body.chatHistory[0].role).toBe('assistant');
      expect(response.body.chatHistory[0].content).toBe(block.feynmanQuestion);

      // isFeynmanPassed should be preserved
      expect(response.body.isFeynmanPassed).toBe(true);
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .post(`${endpoint}/invalid-id/history/reset`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid blockId',
      });
    });

    test('should return 401 when no token provided', async () => {
      const block = testData.blocks[0];

      const response = await request(app).post(
        `${endpoint}/${String(block._id)}/history/reset`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 403 when block is locked', async () => {
      const block = testData.blocks[1]; // Second block - locked

      const response = await request(app)
        .post(`${endpoint}/${String(block._id)}/history/reset`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: 'Feynman is not available for a locked block',
      });
    });

    test('should return 404 when block not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const response = await request(app)
        .post(`${endpoint}/${nonExistentId}/history/reset`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Block not found',
      });
    });
  });

  // ─── GET /feynman/block/:blockId/stats ────────────────────────────────────

  describe('GET api/feynman/block/:blockId/stats', () => {
    const endpoint = '/api/feynman/block';

    beforeEach(async () => {
      // Create stats data
      const block = testData.blocks[0];
      const lessonProgress = await UserLessonProgress.findOne({
        userId: new Types.ObjectId(userId),
        lessonId: testData.lesson._id,
      });

      if (lessonProgress) {
        const blockProgress = lessonProgress.blockProgress.find(
          (bp: any) => bp.blockId.toString() === String(block._id),
        );
        if (blockProgress) {
          blockProgress.isFeynmanPassed = true;
          await lessonProgress.save();
        }
      }
    });

    test('should return 200 with stats', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify response structure matches FeynmanStatsResponse interface
      expect(response.body).toMatchObject({
        blockId: expect.any(String),
        isFeynmanPassed: expect.any(Boolean),
      });

      expect(response.body.blockId).toBe(String(block._id));
      expect(typeof response.body.isFeynmanPassed).toBe('boolean');
      expect(response.body.isFeynmanPassed).toBe(true);
    });

    test('should return 200 with isFeynmanPassed: false when not passed', async () => {
      // Reset the user's progress for block 1
      const block = testData.blocks[0]; // Different block, not passed

      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      await UserLessonProgress.updateOne(
        { userId: new Types.ObjectId(userId), lessonId: testData.lesson._id },
        { $set: { 'blockProgress.$[bp].isFeynmanPassed': false } },
        { arrayFilters: [{ 'bp.blockId': block._id }] },
      );

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        blockId: String(block._id),
        isFeynmanPassed: false,
      });
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get(`${endpoint}/invalid-id/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid blockId',
      });
    });

    test('should return 401 when no token provided', async () => {
      const block = testData.blocks[0];

      const response = await request(app).get(
        `${endpoint}/${String(block._id)}/stats`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 403 when block is locked', async () => {
      const block = testData.blocks[1]; // Second block - locked

      const response = await request(app)
        .get(`${endpoint}/${String(block._id)}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: 'Feynman is not available for a locked block',
      });
    });

    test('should return 404 when block not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const response = await request(app)
        .get(`${endpoint}/${nonExistentId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Block not found',
      });
    });
  });

  // ─── Error Response Consistency ─────────────────────────────────────────────

  describe('Error Response Consistency', () => {
    test('all 400 errors should have consistent shape', async () => {
      const response = await request(app)
        .get('/api/feynman/block/invalid-id/question')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('all 401 errors should have consistent shape', async () => {
      const response = await request(app).get(
        '/api/feynman/block/123456789012345678901234/question',
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toMatch(/token/i);
    });

    test('all 403 errors should have consistent shape', async () => {
      const block = testData.blocks[1]; // Locked block
      const response = await request(app)
        .get(`/api/feynman/block/${String(block._id)}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('Feynman is not available');
    });

    test('all 404 errors should have consistent shape', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/feynman/block/${nonExistentId}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('not found');
    });

    test('all 500 errors should have consistent shape', async () => {
      // Mock AI service to throw error
      vi.spyOn(feynmanService, 'generateFeynmanFeedback').mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/feynman/block/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'A variable stores data.' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toBe('Failed to process Feynman chat');
    });
  });

  // ─── Headers and Content-Type ──────────────────────────────────────────────

  describe('Headers and Content-Type', () => {
    test('all endpoints should return application/json', async () => {
      const block = testData.blocks[0];
      const response = await request(app)
        .get(`/api/feynman/block/${String(block._id)}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('POST endpoints should accept application/json', async () => {
      const block = testData.blocks[0];
      const response = await request(app)
        .post(`/api/feynman/block/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/xml')
        .send('<message>Test</message>');

      // Should reject or handle gracefully
      expect([400, 415, 500]).toContain(response.status);
    });
  });

  // ─── Response Examples (Documentation) ────────────────────────────────────

  describe('Response Examples (Documentation)', () => {
    test('GET api/feynman/block/:blockId/question - success response example', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/feynman/block/${String(block._id)}/question`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log(
        'Example response for GET api/feynman/block/:blockId/question:',
      );
      console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
    });

    test('POST api/feynman/block/:blockId/chat - success response example', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/feynman/block/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'A variable is a container that stores data values.',
        });

      console.log('Example response for POST api/feynman/block/:blockId/chat:');
      console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
    });

    test('GET api/feynman/block/:blockId/history - success response example', async () => {
      const block = testData.blocks[0];

      // Create passed exercise attempt
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      // First create some history
      await request(app)
        .post(`/api/feynman/block/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'A variable stores data.' });

      const response = await request(app)
        .get(`/api/feynman/block/${String(block._id)}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log(
        'Example response for GET api/feynman/block/:blockId/history:',
      );
      console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
    });

    test('GET api/feynman/block/:blockId/stats - success response example', async () => {
      const block = testData.blocks[0];

      // First pass Feynman
      await ExerciseAttempt.create({
        userId: new Types.ObjectId(userId),
        exerciseId: testData.exercise._id,
        isPassed: true,
        items: [{ field: 'type', isCorrect: true }],
        hintLevel: 0,
        attemptNumber: 1,
        attemptedAt: new Date(),
      });

      await request(app)
        .post(`/api/feynman/block/${String(block._id)}/chat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'A variable is a container that stores data values.',
        });

      const response = await request(app)
        .get(`/api/feynman/block/${String(block._id)}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log('Example response for GET api/feynman/block/:blockId/stats:');
      console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
    });
  });
});
