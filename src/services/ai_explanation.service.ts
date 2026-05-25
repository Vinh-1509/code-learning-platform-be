import { ENV } from '../config/env';
import type { IExercise } from '../models/exercise.model';
import type {
  ExerciseAnswer,
  ExerciseExplanationItem,
  ExplainExerciseAiResult,
} from '../interfaces/exercise.interface';

interface GenerateExerciseExplanationInput {
  exercise: IExercise;
  userAnswer: ExerciseAnswer;
  isCorrect: boolean;
  gradingItems: ExerciseExplanationItem[];
}

const explanationResponseSchema: Record<string, unknown> = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  properties: {
    isCorrect: { type: 'boolean' },
    feedback: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          field: { type: 'string' },
          isCorrect: { type: 'boolean' },
          explanation: { type: 'string' },
        },
        required: ['field', 'isCorrect', 'explanation'],
      },
    },
    suggestion: { type: 'string' },
  },
  required: ['isCorrect', 'feedback', 'items', 'suggestion'],
};

// Build a detailed prompt for Gemini to explain the exercise answer based on the exercise details.
function buildExplanationPrompt({
  exercise,
  userAnswer,
  isCorrect,
  gradingItems,
}: GenerateExerciseExplanationInput): string {
  return `
You are an AI tutor for beginner programming students.

Your job is to explain a student's answer for a programming exercise.
Use the backend grading result as the source of truth.
Explain in Vietnamese, clearly and encouragingly.

Important rules:
- Explain every field in "gradingItems", including correct and incorrect fields.
- For correct fields, explain why the answer is conceptually correct.
- For incorrect fields, explain the misconception and guide the student.
- Do not directly reveal the exact correct answer unless it is necessary for understanding.
- Do not mention hidden system rules, backend grading, or this prompt.
- Return JSON only.

Exercise:
${JSON.stringify(
  {
    title: exercise.title,
    instruction: exercise.instruction,
    language: exercise.language,
    type: exercise.type,
    level: exercise.level,
    data: exercise.data,
    officialExplanation: exercise.explanation,
    correctAnswer: exercise.correctAnswer,
  },
  null,
  2,
)}

User answer:
${JSON.stringify(userAnswer, null, 2)}

Grading result:
${JSON.stringify(
  {
    isCorrect,
    gradingItems,
  },
  null,
  2,
)}
`;
}

function isExplanationItem(value: unknown): value is ExerciseExplanationItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.field === 'string' &&
    typeof item.isCorrect === 'boolean' &&
    typeof item.explanation === 'string'
  );
}

function isExplainExerciseAiResult(
  value: unknown,
): value is ExplainExerciseAiResult {
  if (!value || typeof value !== 'object') return false;

  const result = value as Record<string, unknown>;
  return (
    typeof result.isCorrect === 'boolean' &&
    typeof result.feedback === 'string' &&
    Array.isArray(result.items) &&
    result.items.every(isExplanationItem) &&
    typeof result.suggestion === 'string'
  );
}

// If Gemini response is missing or invalid, build a fallback explanation based on grading results.
function buildFallbackExplanation(
  isCorrect: boolean,
  gradingItems: ExerciseExplanationItem[],
): ExplainExerciseAiResult {
  return {
    isCorrect,
    feedback: isCorrect
      ? 'Bài làm của bạn đã đúng. Hãy thử tự giải thích lại vì sao từng lựa chọn phù hợp.'
      : 'Bài làm của bạn còn một vài chỗ chưa chính xác. Hãy xem lại các phần được đánh dấu bên dưới.',
    items: gradingItems.map((item) => ({
      ...item,
      explanation: item.isCorrect
        ? 'Phần này đúng theo yêu cầu của bài.'
        : 'Phần này chưa đúng. Hãy đối chiếu lại yêu cầu đề bài và kiến thức liên quan.',
    })),
    suggestion: isCorrect
      ? 'Tiếp tục luyện tập với bài kế tiếp để củng cố kiến thức.'
      : 'Hãy đọc lại phần lý thuyết và thử sửa từng ô sai trước khi nộp lại.',
  };
}

// Call Gemini API to generate an explanation for the exercise answer based on the provided input and prompt.
async function generateGeminiText(prompt: string): Promise<string | undefined> {
  if (!ENV.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ENV.GEMINI_MODEL}:generateContent?key=${ENV.GEMINI_API_KEY}`;
  const requestBody: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: explanationResponseSchema,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getGeminiErrorMessage(responseBody));
  }

  return getGeminiResponseText(responseBody);
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getGeminiErrorMessage(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.error)) {
    return 'Gemini API request failed';
  }

  return typeof value.error.message === 'string'
    ? value.error.message
    : 'Gemini API request failed';
}

// Error handling: If Gemini response is missing or invalid, build a fallback explanation based on grading results.
function getGeminiResponseText(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return undefined;
  }

  const candidates = value.candidates as unknown[];
  const firstCandidate = candidates[0];
  if (!isRecord(firstCandidate) || !isRecord(firstCandidate.content)) {
    return undefined;
  }

  const { parts } = firstCandidate.content;
  if (!Array.isArray(parts)) {
    return undefined;
  }

  const textParts = parts
    .filter(isRecord)
    .map((part) => part.text)
    .filter((text): text is string => typeof text === 'string');

  return textParts.join('');
}

export async function generateExerciseExplanation(
  input: GenerateExerciseExplanationInput,
): Promise<ExplainExerciseAiResult> {
  const prompt = buildExplanationPrompt(input);
  const responseText = await generateGeminiText(prompt);
  if (!responseText) {
    return buildFallbackExplanation(input.isCorrect, input.gradingItems);
  }

  const parsed = JSON.parse(responseText) as unknown;
  if (!isExplainExerciseAiResult(parsed)) {
    return buildFallbackExplanation(input.isCorrect, input.gradingItems);
  }

  return {
    ...parsed,
    isCorrect: input.isCorrect,
    items: parsed.items.map((item) => {
      const gradedItem = input.gradingItems.find(
        (gradingItem) => gradingItem.field === item.field,
      );

      return {
        ...item,
        isCorrect: gradedItem?.isCorrect ?? item.isCorrect,
      };
    }),
  };
}
