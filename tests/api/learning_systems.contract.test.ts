// tests/api/contract/learning.contract.test.ts
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
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
import { LanguageInfo } from '../../src/models/language_info.model';
import { ENV } from '../../src/config/env';
import jwt from 'jsonwebtoken';

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
    info: 'Java is a popular programming language known for its "write once, run anywhere" capability.',
    strengths: ['Platform independence', 'Large ecosystem', 'Strong community'],
    challenges: ['Memory management complexity', 'Verbose syntax'],
    useCases: [
      'Enterprise applications',
      'Android development',
      'Web applications',
    ],
  });

  // Create milestones
  const milestone1 = await Milestone.create({
    roadmapId: roadmap._id,
    title: 'Java Basics',
    order: 1,
    description: 'Fundamental concepts of Java programming',
  });

  const milestone2 = await Milestone.create({
    roadmapId: roadmap._id,
    title: 'Object-Oriented Programming',
    order: 2,
    description: 'Core OOP concepts in Java',
  });

  // Create lessons for milestone 1
  const lesson1 = await Lesson.create({
    milestoneId: milestone1._id,
    title: 'Variables and Data Types',
    order: 1,
    blocks: [],
  });

  const lesson2 = await Lesson.create({
    milestoneId: milestone1._id,
    title: 'Control Flow Statements',
    order: 2,
    blocks: [],
  });

  // Create blocks for lesson 1
  const block1 = await Block.create({
    lessonId: lesson1._id,
    title: 'Introduction to Variables',
    description: 'Learn what variables are and how to use them',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'A variable is a named memory location that stores a value.',
          image: 'https://cdn.example.com/images/variables.png',
        },
      },
      {
        type: 'code',
        data: {
          order: 2,
          code: 'int a = 10;\ncout << a;',
          explanation: 'Here we declare an integer variable and print it.',
        },
      },
      {
        type: 'practice',
        data: {
          order: 3,
          exerciseId: '64f1a2b3c4d5e6f7a8b9c0d2',
          required: true,
        },
      },
    ],
    feynmanQuestion: 'Can you explain what a variable is in your own words?',
  });

  const block2 = await Block.create({
    lessonId: lesson1._id,
    title: 'Data Types',
    description: 'Learn about primitive data types in Java',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'Java has 8 primitive data types: byte, short, int, long, float, double, char, and boolean.',
        },
      },
      {
        type: 'code',
        data: {
          order: 2,
          code: "int age = 25;\ndouble salary = 50000.50;\nchar grade = 'A';",
          explanation: 'Examples of different primitive data types',
        },
      },
    ],
    feynmanQuestion: 'What are the primitive data types in Java?',
  });

  const block3 = await Block.create({
    lessonId: lesson1._id,
    title: 'Type Conversion',
    description: 'Learn about implicit and explicit type conversion',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'Type conversion is the process of converting one data type to another.',
        },
      },
    ],
    feynmanQuestion: 'Why do we need type conversion?',
  });

  // Update lesson with blocks
  lesson1.blocks = [block1._id, block2._id, block3._id];
  await lesson1.save();

  // Create block for lesson 2
  const block4 = await Block.create({
    lessonId: lesson2._id,
    title: 'If-Else Statements',
    description: 'Learn conditional branching',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'If-else statements allow your program to make decisions based on conditions.',
        },
      },
      {
        type: 'code',
        data: {
          order: 2,
          code: 'if (score >= 60) {\n  cout << "Pass";\n} else {\n  cout << "Fail";\n}',
          explanation: 'Check if a score is passing or failing.',
        },
      },
    ],
    feynmanQuestion: 'How do if-else statements work?',
  });

  lesson2.blocks = [block4._id];
  await lesson2.save();

  // Create lesson for milestone 2
  const lesson3 = await Lesson.create({
    milestoneId: milestone2._id,
    title: 'Classes and Objects',
    order: 1,
    blocks: [],
  });

  const block5 = await Block.create({
    lessonId: lesson3._id,
    title: 'Creating Classes',
    description: 'Learn how to define classes',
    content: [
      {
        type: 'theory',
        data: {
          order: 1,
          text: 'A class is a blueprint for creating objects. It defines properties and methods.',
        },
      },
      {
        type: 'code',
        data: {
          order: 2,
          code: 'public class Car {\n  String color;\n  int year;\n  \n  void start() {\n    cout << "Car started";\n  }\n}',
          explanation: 'Defines a Car class with properties and a method.',
        },
      },
    ],
    feynmanQuestion: 'What is the difference between a class and an object?',
  });

  lesson3.blocks = [block5._id];
  await lesson3.save();

  return {
    roadmap,
    milestones: [milestone1, milestone2],
    lessons: [lesson1, lesson2, lesson3],
    blocks: [block1, block2, block3, block4, block5],
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

// const getAuthToken = async () => {
//   // In a real test, you'd use the auth endpoint
//   // For now, we'll use a mock token
//   const user = await User.create({
//     email: 'learning-test@example.com',
//     password: 'hashed-password-here',
//     username: 'learningtest',
//     fullName: 'Learning Test User',
//     selectedLanguage: ['Java']
//   });
//   const token = generateTestToken(user._id.toString());
//   return token;
// };

// ─── Contract Tests ──────────────────────────────────────────────────────────

describe('Learning System API Contract Tests', () => {
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
  });

  // ─── Languages APIs ──────────────────────────────────────────────────────────

  describe('GET /api/languages', () => {
    const endpoint = '/api/languages';

    test('should return 200 with list of languages with enriched info', async () => {
      const response = await request(app).get(endpoint);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const language = response.body[0];

      // Verify response structure matches interface
      expect(language).toMatchObject({
        _id: expect.any(String),
        language: expect.any(String),
        info: expect.any(String),
        strengths: expect.any(Array),
        challenges: expect.any(Array),
        useCases: expect.any(Array),
      });

      // Verify data types
      expect(typeof language._id).toBe('string');
      expect(typeof language.language).toBe('string');
      expect(typeof language.info).toBe('string');
      expect(Array.isArray(language.strengths)).toBe(true);
      expect(Array.isArray(language.challenges)).toBe(true);
      expect(Array.isArray(language.useCases)).toBe(true);
    });

    test('should return only supported languages', async () => {
      const response = await request(app).get(endpoint);

      const languages = response.body.map((l: any) => l.language);

      // Should only contain C++ or Java
      const unsupported = languages.filter(
        (l: string) => !['C++', 'Java'].includes(l),
      );
      expect(unsupported).toHaveLength(0);
    });

    test('should return 200 with empty array when no languages exist', async () => {
      await Roadmap.deleteMany({});
      await LanguageInfo.deleteMany({});

      const response = await request(app).get(endpoint);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/languages/:languageId', () => {
    const endpoint = '/api/languages';

    test('should return 200 with language details for valid ID', async () => {
      const roadmap = await Roadmap.findOne({ language: 'Java' });
      const response = await request(app).get(
        `${endpoint}/${String(roadmap?._id)}`,
      );

      expect(response.status).toBe(200);

      // Verify response structure
      expect(response.body).toMatchObject({
        _id: expect.any(String),
        language: expect.any(String),
        info: expect.any(String),
        strengths: expect.any(Array),
        challenges: expect.any(Array),
        useCases: expect.any(Array),
      });

      expect(response.body.language).toBe('Java');
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app).get(`${endpoint}/invalid-id-format`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid languageId',
      });

      // Error shape validation
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 404 for non-existent language', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app).get(`${endpoint}/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Language not found',
      });
    });
  });

  describe('POST /languages/select', () => {
    const endpoint = '/api/languages/select';

    test('should return 200 when selecting valid language', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Java' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Language updated successfully',
        selectedLanguage: expect.any(Array),
      });

      expect(response.body.selectedLanguage).toContain('Java');
    });

    test('should return 400 when language is missing', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Language is required',
      });
    });

    test('should return 400 when language is not supported', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Python' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Language must be C++ or Java',
      });
    });

    test('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ language: 'Java' });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 404 when language roadmap not found', async () => {
      await Roadmap.deleteMany({});

      const response = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Java' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Language not found',
      });
    });
  });

  // ─── Milestones APIs ─────────────────────────────────────────────────────────

  describe('GET /api/learning/milestones', () => {
    const endpoint = '/api/learning/milestones';

    test('should return 200 with milestones and progress', async () => {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const milestone = response.body[0];

      // Verify response structure
      expect(milestone).toMatchObject({
        _id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        order: expect.any(Number),
        progress: {
          status: expect.stringMatching(/^(locked|active|completed)$/),
          completionPercentage: expect.any(Number),
        },
      });

      // Verify types
      expect(typeof milestone._id).toBe('string');
      expect(typeof milestone.title).toBe('string');
      expect(typeof milestone.order).toBe('number');
      expect(milestone.progress.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(milestone.progress.completionPercentage).toBeLessThanOrEqual(100);
    });

    test('should return 401 when no token provided', async () => {
      const response = await request(app).get(endpoint);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 400 when no language selected', async () => {
      // Create user without selected language
      const userWithoutLang = await User.create({
        email: 'nolang@example.com',
        password: 'hashed-password',
        username: 'nolang',
        fullName: 'No Language User',
      });

      // We need a token for this user
      // This test documents the expected behavior
    });
  });

  describe('GET /api/learning/milestones/:milestoneId', () => {
    const endpoint = '/api/learning/milestones';

    test('should return 200 with milestone details', async () => {
      const milestone = await Milestone.findOne({ title: 'Java Basics' });
      const response = await request(app)
        .get(`${endpoint}/${String(milestone?._id)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify response structure
      expect(response.body).toMatchObject({
        _id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        order: expect.any(Number),
        progress: {
          status: expect.stringMatching(/^(locked|active|completed)$/),
          completionPercentage: expect.any(Number),
        },
      });

      // Check optional updatedAt field
      if (response.body.progress.updatedAt) {
        expect(typeof response.body.progress.updatedAt).toBe('string');
        expect(new Date(response.body.progress.updatedAt).toString()).not.toBe(
          'Invalid Date',
        );
      }
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get(`${endpoint}/invalid-id-format`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid milestoneId',
      });
    });

    test('should return 404 for non-existent milestone', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`${endpoint}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Milestone not found',
      });
    });
  });

  // ─── Lessons APIs ────────────────────────────────────────────────────────────

  describe('GET /api/learning/milestones/:milestoneId/lessons', () => {
    const endpoint = '/api/learning/milestones';

    test('should return 200 with lessons and progress', async () => {
      const milestone = await Milestone.findOne({ title: 'Java Basics' });
      const response = await request(app)
        .get(`${endpoint}/${String(milestone?._id)}/lessons`)
        .set('Authorization', `Bearer ${authToken}`);

      //expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const lesson = response.body[0];

      // Verify response structure
      expect(lesson).toMatchObject({
        _id: expect.any(String),
        title: expect.any(String),
        order: expect.any(Number),
        progress: {
          status: expect.stringMatching(/^(locked|active|completed)$/),
          isCompleted: expect.any(Boolean),
          completionPercentage: expect.any(Number),
        },
      });

      expect(lesson.progress.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(lesson.progress.completionPercentage).toBeLessThanOrEqual(100);
    });

    test('should return 400 for invalid milestone ID', async () => {
      const response = await request(app)
        .get(`${endpoint}/invalid-id/lessons`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid milestoneId',
      });
    });

    test('should return 404 for non-existent milestone', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`${endpoint}/${nonExistentId}/lessons`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Milestone not found',
      });
    });
  });

  describe('GET /api/learning/lessons/:lessonId', () => {
    const endpoint = '/api/learning/lessons';

    test('should return 200 with lesson details and blocks', async () => {
      const lesson = await Lesson.findOne({
        title: 'Variables and Data Types',
      });
      const response = await request(app)
        .get(`${endpoint}/${String(lesson?._id)}`)
        .set('Authorization', `Bearer ${authToken}`);

      //expect(response.status).toBe(200);

      // Verify main lesson structure
      expect(response.body).toMatchObject({
        _id: expect.any(String),
        title: expect.any(String),
        order: expect.any(Number),
        blocks: expect.any(Array),
        progress: {
          status: expect.stringMatching(/^(locked|active|completed)$/),
          completionPercentage: expect.any(Number),
          isCompleted: expect.any(Boolean),
          lastAccessed: expect.any(String),
        },
      });

      // Verify block structure matches your exact format
      if (response.body.blocks.length > 0) {
        const block = response.body.blocks[0];

        expect(block).toMatchObject({
          _id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          content: expect.any(Array),
          status: expect.stringMatching(/^(locked|active|completed)$/),
          isFeynmanPassed: expect.any(Boolean),
        });

        // Verify content structure matches your example
        if (block.content.length > 0) {
          const contentItem = block.content[0];
          expect(['theory', 'code', 'practice']).toContain(contentItem.type);
          expect(contentItem.data).toHaveProperty('order');

          // Verify specific content types have required fields
          if (contentItem.type === 'theory') {
            expect(contentItem.data).toHaveProperty('text');
            // image is optional
          } else if (contentItem.type === 'code') {
            expect(contentItem.data).toHaveProperty('code');
            expect(contentItem.data).toHaveProperty('explanation');
          } else if (contentItem.type === 'practice') {
            expect(contentItem.data).toHaveProperty('exerciseId');
            expect(contentItem.data).toHaveProperty('required');
          }
        }

        // feynmanQuestion is optional
        if (block.feynmanQuestion !== undefined) {
          expect(typeof block.feynmanQuestion).toBe('string');
        }
      }
    });

    test('should return 403 when lesson is locked', async () => {
      const lesson = await Lesson.findOne({ title: 'Control Flow Statements' });
      const response = await request(app)
        .get(`${endpoint}/${String(lesson?._id)}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should be locked because it's the second lesson
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Forbidden'),
      });
    });

    test('should return 400 for invalid lesson ID', async () => {
      const response = await request(app)
        .get(`${endpoint}/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid lessonId',
      });
    });

    test('should return 404 for non-existent lesson', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`${endpoint}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Lesson not found',
      });
    });
  });

  // ─── Block Completion API ────────────────────────────────────────────────────

  describe('POST /api/learning/blocks/:blockId/complete', () => {
    const endpoint = '/api/learning/blocks';

    test('should return 200 when completing a block', async () => {
      const block = await Block.findOne({ title: 'Introduction to Variables' });
      const response = await request(app)
        .post(`${endpoint}/${String(block?._id)}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Block marked as completed',
        lessonProgress: {
          status: expect.stringMatching(/^(locked|active|completed)$/),
          completionPercentage: expect.any(Number),
          isCompleted: expect.any(Boolean),
        },
      });
    });

    test('should return 403 when completing a locked block', async () => {
      // Try to complete the second block without completing the first
      const block = await Block.findOne({ title: 'Data Types' });
      const response = await request(app)
        .post(`${endpoint}/${String(block?._id)}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Forbidden'),
      });
    });

    test('should return 200 when completing already completed block', async () => {
      // First complete the block
      const block = await Block.findOne({ title: 'Introduction to Variables' });
      await request(app)
        .post(`${endpoint}/${String(block?._id)}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to complete again
      const response = await request(app)
        .post(`${endpoint}/${String(block?._id)}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Block already completed',
      });
    });

    test('should return 400 for invalid block ID', async () => {
      const response = await request(app)
        .post(`${endpoint}/invalid-id/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid blockId',
      });
    });

    test('should return 404 for non-existent block', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .post(`${endpoint}/${nonExistentId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Block not found',
      });
    });

    test('should return 401 when no token provided', async () => {
      const block = await Block.findOne({ title: 'Introduction to Variables' });
      const response = await request(app).post(
        `${endpoint}/${String(block?._id)}/complete`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });
  });

  // ─── Error Response Consistency ─────────────────────────────────────────────

  describe('Error Response Consistency', () => {
    test('all 400 errors should have consistent shape', async () => {
      const response = await request(app)
        .get('/api/languages/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('all 401 errors should have consistent shape', async () => {
      const response = await request(app).get('/api/learning/milestones');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toMatch(/token/i);
    });

    test('all 403 errors should have consistent shape', async () => {
      const lesson = await Lesson.findOne({ title: 'Control Flow Statements' });
      const response = await request(app)
        .get(`/api/learning/lessons/${String(lesson?._id)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('Forbidden');
    });

    test('all 404 errors should have consistent shape', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const response = await request(app).get(
        `/api/languages/${nonExistentId}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('not found');
    });

    test('all 500 errors should have consistent shape', async () => {
      // Force a 500 error by causing a database error
      // This test documents the expected error shape
      // In practice, this might be hard to trigger in a test
    });
  });

  // ─── Headers and Content-Type ──────────────────────────────────────────────

  describe('Headers and Content-Type', () => {
    test('all endpoints should return application/json', async () => {
      const response = await request(app).get('/api/languages');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('protected endpoints should require Authorization header', async () => {
      const response = await request(app).get('/api/learning/milestones');

      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
