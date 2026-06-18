import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFeynmanFeedback } from '../../../src/services/feynman.service';

vi.mock('../../../src/config/env', () => ({
  ENV: {
    GROQ_API_KEY: 'test-groq-key',
    GROQ_MODEL: 'test-groq-model',
  },
}));

describe('feynman.service', () => {
  const mockInput = {
    contentSummary: 'Concepts: loops, variables',
    userMessage: 'Loops are used to repeat code',
    chatHistory: [],
  };

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('should return valid result from Groq if fetch succeeds', async () => {
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              reply: 'Great explanation!',
              isPassed: true,
            }),
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockGroqResponse)),
    });

    const result = await generateFeynmanFeedback(mockInput);

    expect(result.reply).toBe('Great explanation!');
    expect(result.isPassed).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw if Groq API fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ error: { message: 'Groq failed' } }),
        ),
    });

    await expect(generateFeynmanFeedback(mockInput)).rejects.toThrow(
      'Groq failed',
    );
  });

  it('should throw if fetch throws error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(generateFeynmanFeedback(mockInput)).rejects.toThrow(
      'Network error',
    );
  });

  it('should return fallback if Groq returns invalid JSON', async () => {
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: 'not json',
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockGroqResponse)),
    });

    const result = await generateFeynmanFeedback(mockInput);

    expect(result.isPassed).toBe(false);
  });
});
