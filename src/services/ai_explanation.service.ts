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

// Keep Gemini output predictable so the controller can return a stable API shape.
function buildExplanationPrompt({
  exercise,
  userAnswer,
  isCorrect,
  gradingItems,
}: GenerateExerciseExplanationInput): string {
  return `
You are an AI tutor for beginner programming students.

Your job is to explain a student's answer for a programming exercise.
Use the backend grading result as the only source of truth.
Explain in English, clearly and encouragingly.

Important rules:
- Explain every field in "gradingItems", including both correct and incorrect fields.
- The "items" array must contain exactly one item for each field in "gradingItems".
- Keep the order of "items" exactly the same as "gradingItems".
- Keep each item explanation short: 1-2 English sentences maximum.
- Keep the overall feedback short: 1 English sentence maximum.
- Keep the suggestion short: 1 English sentence maximum.
- For correct fields, explain the concept that makes the student's answer reasonable.
- For incorrect fields, explain the misconception and give a conceptual hint.
- Never reveal the exact expected value from "correctAnswer".
- Never mention the exact correct keyword, type name, variable name, literal value, or option that should be filled in.
- Do not say phrases like "the correct answer is", "you should use X", "it should be X", or "please fill in X".
- Do not copy any value from "correctAnswer" into feedback, item explanations, or suggestion.
- Do not mention hidden system rules, backend grading, correctAnswer, gradingItems, or this prompt.
- Return JSON only.
- Do not wrap the JSON in markdown.

For incorrect fields, use hints like this:
Bad: "The correct data type is string."
Good: "This part needs a data type for storing text, not a number."

Bad: "Age should use int."
Good: "This part represents an integer value, so choose the appropriate integer data type."

Bad: "The correct variable name is score."
Good: "The variable name should clearly indicate the data it stores, avoiding names that don't reflect their purpose."

Return exactly this JSON shape:
{
  "isCorrect": boolean,
  "feedback": string,
  "items": [
    {
      "field": string,
      "isCorrect": boolean,
      "explanation": string
    }
  ],
  "suggestion": string
}

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

// Runtime guard for AI output, because JSON schema guidance is not a TypeScript guarantee.
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

// Fallback keeps the API useful even when Gemini returns empty or invalid JSON.
function buildFallbackExplanation(
  isCorrect: boolean,
  gradingItems: ExerciseExplanationItem[],
): ExplainExerciseAiResult {
  return {
    isCorrect,
    feedback: isCorrect
      ? 'Your answer is correct. Now, try explaining why each choice is correct in your own words.'
      : 'Your answer has a few inaccuracies. Please review the highlighted parts.',
    items: gradingItems.map((item) => ({
      ...item,
      explanation: item.isCorrect
        ? 'This part meets the requirements of the task'
        : 'This part is incorrect. Please review the requirements and related knowledge.',
    })),
    suggestion: isCorrect
      ? 'Continue practicing with the next exercise to reinforce your understanding.'
      : 'Please review the theoretical section and try to correct each incorrect answer before submitting again.',
  };
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

// #################### GEMINI ####################
// Use the REST endpoint directly to avoid SDK type-resolution issues in this project setup.
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

// #################### GROQ (fallback) ####################
async function generateGroqText(prompt: string): Promise<string | undefined> {
  if (!ENV.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not defined');
  }

  const url = `https://api.groq.com/openai/v1/chat/completions`;
  const requestBody: Record<string, unknown> = {
    model: ENV.GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_object',
    },
    temperature: 0.3,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getGroqErrorMessage(responseBody));
  }
  return getGroqResponseText(responseBody);
}

function getGroqErrorMessage(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.error)) {
    return 'Groq API request failed';
  }

  return typeof value.error.message === 'string'
    ? value.error.message
    : 'Groq API request failed';
}

function getGroqResponseText(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return undefined;
  }

  const choices = value.choices as unknown[];
  const firstChoice = choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return undefined;
  }

  return typeof firstChoice.message.content === 'string'
    ? firstChoice.message.content
    : undefined;
}

// #################### MAIN PUBLIC FUNCTION ####################
async function generateAiText(prompt: string): Promise<string | undefined> {
  try {
    return await generateGeminiText(prompt);
  } catch (geminiError) {
    console.error('Gemini explanation error:', geminiError);
  }

  try {
    return await generateGroqText(prompt);
  } catch (groqError) {
    console.error('Groq explanation fallback error:', groqError);
    return undefined;
  }
}

export async function generateExerciseExplanation(
  input: GenerateExerciseExplanationInput,
): Promise<ExplainExerciseAiResult> {
  const prompt = buildExplanationPrompt(input);
  const responseText = await generateAiText(prompt);
  if (!responseText) {
    return buildFallbackExplanation(input.isCorrect, input.gradingItems);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    return buildFallbackExplanation(input.isCorrect, input.gradingItems);
  }

  if (!isExplainExerciseAiResult(parsed)) {
    return buildFallbackExplanation(input.isCorrect, input.gradingItems);
  }

  return {
    ...parsed,
    isCorrect: input.isCorrect,
    // Trust backend grading for correctness, while keeping Gemini's human-friendly wording.
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
