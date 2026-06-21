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
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';
import User from '../../src/models/user.model';
import { Exercise } from '../../src/models/exercise.model';
import { ExerciseAttempt } from '../../src/models/exercise_attempt.model';
import { ExerciseTag } from '../../src/models/exercise_tag.model';
import * as aiExplanationService from '../../src/services/ai_explanation.service';
import { ENV } from '../../src/config/env';

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

// ─── Test Data Setup ──────────────────────────────────────────────────────────

const setupTestData = async () => {
  // Create exercise tag
  const tag = await ExerciseTag.create({
    name: 'Variables',
    description: 'Exercises about variables',
  });

  // Create exercise
  const exercise = await Exercise.create({
    title: 'Variable Declaration',
    instruction: 'Declare a variable named "age" with type int and value 25',
    language: 'Java',
    type: 'fill_blank',
    level: 'easy',
    tagId: [tag._id],
    data: {
      fields: ['type', 'name', 'value'],
    },
    correctAnswer: {
      type: 'int',
      name: 'age',
      value: '25',
    },
    explanation:
      'Variables store data values in memory. The type specifies what kind of data can be stored.',
    hints: {
      type: 'Consider what data type is used for whole numbers',
      name: 'The variable name should describe what it represents',
      value: 'The initial value should be a number',
    },
    order: 1,
  });

  // Create another exercise for testing different scenarios
  const exercise2 = await Exercise.create({
    title: 'String Variable',
    instruction:
      'Declare a variable named "name" with type String and value "John"',
    language: 'Java',
    type: 'fill_blank',
    level: 'easy',
    data: {
      fields: ['type', 'name', 'value'],
    },
    correctAnswer: {
      type: 'String',
      name: 'name',
      value: 'John',
    },
    explanation: 'Strings store text values in Java.',
    order: 2,
  });

  return {
    tag,
    exercises: [exercise, exercise2],
  };
};

// ─── Contract Tests ──────────────────────────────────────────────────────────

describe('Exercise API Contract Tests', () => {
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

  // ─── POST /api/exercises/:exerciseId/explain ──────────────────────────────

  describe('POST /api/exercises/:exerciseId/explain', () => {
    const endpoint = '/api/exercises';

    beforeEach(() => {
      // Mock the AI service to avoid actual API calls
      vi.spyOn(
        aiExplanationService,
        'generateExerciseExplanation',
      ).mockResolvedValue({
        isCorrect: true,
        feedback: 'Great job! Your answer is correct.',
        items: [
          {
            field: 'type',
            isCorrect: true,
            explanation: 'int is the correct type for whole numbers',
          },
          {
            field: 'name',
            isCorrect: true,
            explanation: 'age is a good variable name',
          },
          {
            field: 'value',
            isCorrect: true,
            explanation: '25 is a valid integer value',
          },
        ],
        suggestion: 'Try the next exercise to practice more!',
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // ─── Success Cases ──────────────────────────────────────────────────────

    test('should return 200 with AI explanation for correct answer', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(200);

      // Verify response structure matches ExplainExerciseResponse interface
      expect(response.body).toMatchObject({
        exerciseId: expect.any(String),
        isCorrect: expect.any(Boolean),
        feedback: expect.any(String),
        items: expect.any(Array),
        suggestion: expect.any(String),
      });

      // Verify items structure
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items.length).toBeGreaterThan(0);

      const item = response.body.items[0];
      expect(item).toHaveProperty('field');
      expect(item).toHaveProperty('isCorrect');
      expect(item).toHaveProperty('explanation');
      expect(typeof item.field).toBe('string');
      expect(typeof item.isCorrect).toBe('boolean');
      expect(typeof item.explanation).toBe('string');

      expect(response.body.exerciseId).toBe(String(exercise._id));
      expect(response.body.isCorrect).toBe(true);
    });

    test('should return 200 with AI explanation for partially correct answer', async () => {
      // Mock AI service for partially correct
      vi.spyOn(
        aiExplanationService,
        'generateExerciseExplanation',
      ).mockResolvedValueOnce({
        isCorrect: false,
        feedback: 'Some fields need correction.',
        items: [
          { field: 'type', isCorrect: true, explanation: 'int is correct' },
          {
            field: 'name',
            isCorrect: false,
            explanation: 'The variable name should be age',
          },
          { field: 'value', isCorrect: true, explanation: '25 is correct' },
        ],
        suggestion: 'Check the variable name field again.',
      });

      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'wrongName',
            value: '25',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        exerciseId: String(exercise._id),
        isCorrect: false,
        feedback: expect.any(String),
        items: expect.any(Array),
        suggestion: expect.any(String),
      });

      // Verify specific item correctness
      const items = response.body.items;
      const nameItem = items.find((i: any) => i.field === 'name');
      expect(nameItem.isCorrect).toBe(false);
    });

    test('should return 200 with AI explanation for completely incorrect answer', async () => {
      // Mock AI service for incorrect
      vi.spyOn(
        aiExplanationService,
        'generateExerciseExplanation',
      ).mockResolvedValueOnce({
        isCorrect: false,
        feedback: 'All fields need correction.',
        items: [
          {
            field: 'type',
            isCorrect: false,
            explanation: 'Should be int for whole numbers',
          },
          { field: 'name', isCorrect: false, explanation: 'Should be age' },
          { field: 'value', isCorrect: false, explanation: 'Should be 25' },
        ],
        suggestion: 'Review the basic concepts of variables and data types.',
      });

      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'float',
            name: 'wrong',
            value: 'abc',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.isCorrect).toBe(false);

      // All items should be incorrect
      const allIncorrect = response.body.items.every(
        (i: any) => i.isCorrect === false,
      );
      expect(allIncorrect).toBe(true);
    });

    test('should return 500 with fallback explanation when AI service fails', async () => {
      // Mock AI service to fail
      vi.spyOn(
        aiExplanationService,
        'generateExerciseExplanation',
      ).mockRejectedValueOnce(new Error('AI service unavailable'));

      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      // Should still return 500 with fallback explanation
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        message: 'Failed to explain exercise answer',
      });
    });

    // ─── Error Cases - HTTP Status Codes ──────────────────────────────────

    test('should return 400 when answer is missing', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Answer must be an object',
      });

      // Error shape validation
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return 400 when answer is not an object', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: 'not an object',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Answer must be an object',
      });
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const url = `${endpoint}/invalid-id/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Invalid exerciseId',
      });
    });

    test('should return 401 when no token provided', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'No token provided',
      });
    });

    test('should return 401 when invalid token provided', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', 'Bearer invalid.token.here')
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        message: 'Invalid token',
      });
    });

    test('should return 404 when exercise not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const url = `${endpoint}/${nonExistentId}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        message: 'Exercise not found',
      });
    });

    test('should return 500 when AI service fails unexpectedly', async () => {
      // Mock AI service to throw an error
      vi.spyOn(
        aiExplanationService,
        'generateExerciseExplanation',
      ).mockRejectedValueOnce(new Error('Unexpected AI service error'));

      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      // The controller catches the error and returns 500
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        message: 'Failed to explain exercise answer',
      });
    });

    // ─── Validation Tests ──────────────────────────────────────────────────

    test('should handle empty answer object', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {},
        });

      // Should still work with empty answer (all fields incorrect)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isCorrect');
      expect(response.body.isCorrect).toBe(false);
      expect(response.body.items).toBeInstanceOf(Array);
    });

    test('should handle answer with extra fields', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
            extraField: 'extra',
          },
        });

      expect(response.status).toBe(200);
      // Extra fields should be ignored, grading should still work
      expect(response.body.isCorrect).toBe(true);
    });

    test('should handle case sensitivity in answers', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'INT', // Should be case-sensitive
            name: 'Age', // Should be case-sensitive
            value: '25',
          },
        });

      expect(response.status).toBe(200);
      // Case-sensitive comparison should fail
      expect(response.body.isCorrect).toBe(false);
    });

    test('should handle whitespace in answers', async () => {
      const exercise = testData.exercises[0];
      const url = `${endpoint}/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: '  int  ',
            name: '  age  ',
            value: '  25  ',
          },
        });

      expect(response.status).toBe(200);
      // Whitespace should be trimmed
      expect(response.body.isCorrect).toBe(true);
    });
  });

  // ─── Error Response Consistency ─────────────────────────────────────────────

  describe('Error Response Consistency', () => {
    test('all 400 errors should have consistent shape', async () => {
      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');
    });

    test('all 401 errors should have consistent shape', async () => {
      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      const response = await request(app)
        .post(url)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toMatch(/token/i);
    });

    test('all 404 errors should have consistent shape', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const url = `/api/exercises/${nonExistentId}/explain`;

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toContain('not found');
    });

    test('all 500 errors should have consistent shape', async () => {
      vi.spyOn(
        aiExplanationService,
        'generateExerciseExplanation',
      ).mockRejectedValueOnce(new Error('AI service error'));

      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toBe('Failed to explain exercise answer');
    });
  });

  // ─── Headers and Content-Type ──────────────────────────────────────────────

  describe('Headers and Content-Type', () => {
    test('should return application/json content-type', async () => {
      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should reject unsupported content-type', async () => {
      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      console.log('Testing URL:', url);

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/xml')
        .send('<answer><type>int</type></answer>');

      // Express will reject or handle gracefully
      expect([400, 415, 500]).toContain(response.status);
    });
  });

  // ─── Response Examples (Documentation) ────────────────────────────────────

  describe('Response Examples (Documentation)', () => {
    test('success response example', async () => {
      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: {
            type: 'int',
            name: 'age',
            value: '25',
          },
        });

      console.log(
        'Example response for POST /api/exercises/:exerciseId/explain:',
      );
      console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
    });

    test('error response example', async () => {
      const exercise = testData.exercises[0];
      const url = `/api/exercises/${String(exercise._id)}/explain`;

      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      console.log('Example error response:');
      console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
    });
  });

  // ─── Security Tests ─────────────────────────────────────────────────────────

  // describe('Security Tests', () => {
  //   test('should prevent SQL injection attempts', async () => {
  //     const exercise = testData.exercises[0];
  //     const url = `/api/exercises/${String(exercise._id)}/explain`;

  //     console.log('Testing URL:', url);

  //     const response = await request(app)
  //       .post(url)
  //       .set('Authorization', `Bearer ${authToken}`)
  //       .send({
  //         answer: {
  //           type: "'; DROP TABLE exercises; --",
  //           name: 'age',
  //           value: '25'
  //         }
  //       });

  //     // Should handle gracefully
  //     expect(response.status).toBe(200);
  //     expect(response.body).not.toContain('DROP TABLE');
  //   });

  //   test('should prevent XSS payloads', async () => {
  //     const exercise = testData.exercises[0];
  //     const url = `/api/exercises/${String(exercise._id)}/explain`;

  //     console.log('Testing URL:', url);

  //     const response = await request(app)
  //       .post(url)
  //       .set('Authorization', `Bearer ${authToken}`)
  //       .send({
  //         answer: {
  //           type: '<script>alert("XSS")</script>',
  //           name: 'age',
  //           value: '25'
  //         }
  //       });

  //     expect(response.status).toBe(200);
  //     // Response should be sanitized
  //     expect(JSON.stringify(response.body)).not.toContain('<script>');
  //   });
  // });
});
