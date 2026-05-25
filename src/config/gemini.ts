import { GoogleGenAI } from '@google/genai';
import { ENV } from './env';

export function getGeminiClient(): GoogleGenAI {
  if (!ENV.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined');
  }

  return new GoogleGenAI({
    apiKey: ENV.GEMINI_API_KEY,
  });
}
