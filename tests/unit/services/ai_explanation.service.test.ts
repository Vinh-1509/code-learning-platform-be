import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateExerciseExplanation } from '../../../src/services/ai_explanation.service';

// Mock env variables
vi.mock('../../../src/config/env', () => ({
  ENV: {
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_MODEL: 'test-model',
    GROQ_API_KEY: 'test-groq-key',
    GROQ_MODEL: 'test-groq-model',
  },
}));

describe('ai_explanation.service', () => {
  const mockInput = {
    exercise: {
      title: 'Test',
      instruction: 'Test instruction',
      language: 'C++',
      type: 'fill_in_the_blank',
      level: 'easy',
      data: {},
      explanation: 'Official',
      correctAnswer: { q1: 'ans' },
    } as any,
    userAnswer: { q1: 'wrong' },
    isCorrect: false,
    gradingItems: [{ field: 'q1', isCorrect: false, explanation: '' }],
  };

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('should return valid result from Gemini if fetch succeeds', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isCorrect: false,
                  feedback: 'Gemini feedback',
                  items: [
                    {
                      field: 'q1',
                      isCorrect: false,
                      explanation: 'Gemini explanation',
                    },
                  ],
                  suggestion: 'Gemini suggestion',
                }),
              },
            ],
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockGeminiResponse)),
    });

    const result = await generateExerciseExplanation(mockInput);

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toBe('Gemini feedback');
    expect(result.suggestion).toBe('Gemini suggestion');
    expect(result.items[0].explanation).toBe('Gemini explanation');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should fallback to Groq if Gemini fails', async () => {
    // First call Gemini (fails)
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ error: { message: 'Gemini failed' } }),
        ),
    });

    // Second call Groq (succeeds)
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              isCorrect: false,
              feedback: 'Groq feedback',
              items: [
                {
                  field: 'q1',
                  isCorrect: false,
                  explanation: 'Groq explanation',
                },
              ],
              suggestion: 'Groq suggestion',
            }),
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockGroqResponse)),
    });

    const result = await generateExerciseExplanation(mockInput);

    expect(result.feedback).toBe('Groq feedback');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should return fallback explanation if both APIs fail', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await generateExerciseExplanation(mockInput);

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('chưa chính xác');
    expect(result.items[0].explanation).toContain('chưa đúng');
  });

  it('should return fallback explanation if API returns invalid JSON', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'not json' }],
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockGeminiResponse)),
    });

    const result = await generateExerciseExplanation(mockInput);

    expect(result.feedback).toContain('chưa chính xác');
  });
});
