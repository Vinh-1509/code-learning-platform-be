import { describe, it, expect } from 'vitest';
import { gradeExerciseAnswer } from '../../../src/utils/exercise_grading';

describe('exercise_grading', () => {
  describe('gradeExerciseAnswer', () => {
    it('should return isCorrect true for perfectly matching string answers', () => {
      const userAnswer = { q1: 'test', q2: 'answer' };
      const correctAnswer = { q1: 'test', q2: 'answer' };
      const result = gradeExerciseAnswer(userAnswer, correctAnswer);

      expect(result.isCorrect).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        field: 'q1',
        isCorrect: true,
        explanation: '',
      });
    });

    it('should ignore leading and trailing whitespace', () => {
      const userAnswer = { q1: '  test  ' };
      const correctAnswer = { q1: 'test' };
      const result = gradeExerciseAnswer(userAnswer, correctAnswer);

      expect(result.isCorrect).toBe(true);
      expect(result.items[0].isCorrect).toBe(true);
    });

    it('should handle numbers correctly', () => {
      const userAnswer = { q1: 123 };
      const correctAnswer = { q1: '123' };
      const result = gradeExerciseAnswer(userAnswer, correctAnswer);

      expect(result.isCorrect).toBe(true);
    });

    it('should handle booleans correctly', () => {
      const userAnswer = { q1: true };
      const correctAnswer = { q1: 'true' };
      const result = gradeExerciseAnswer(userAnswer, correctAnswer);

      expect(result.isCorrect).toBe(true);
    });

    it('should return isCorrect false if one field is incorrect', () => {
      const userAnswer = { q1: 'right', q2: 'wrong' };
      const correctAnswer = { q1: 'right', q2: 'right' };
      const result = gradeExerciseAnswer(userAnswer, correctAnswer);

      expect(result.isCorrect).toBe(false);
      expect(result.items.find((i) => i.field === 'q2')?.isCorrect).toBe(false);
    });

    it('should treat null or undefined as empty string', () => {
      const userAnswer = { q1: null };
      const correctAnswer = { q1: '' };
      const result = gradeExerciseAnswer(userAnswer, correctAnswer);

      expect(result.isCorrect).toBe(true);
    });

    it('should treat complex objects as blank string', () => {
      const userAnswer = { q1: { nested: true } };
      const correctAnswer = { q1: '' };
      const result = gradeExerciseAnswer(userAnswer as any, correctAnswer);

      expect(result.isCorrect).toBe(true);
    });
  });
});
