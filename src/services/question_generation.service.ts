import { ENV } from '../config/env';
import type {
  QSGenAiInput,
  QSGenAiResult,
} from '../interfaces/question_generation.interface';

function buildPrompt({
  contentSummary,
  questions,
  languageDetected,
  level,
}: QSGenAiInput): string {
  return `
You are a friendly Feynman technique tutor for beginner programming students.

Your job is to generate one short Feynman-style question that helps the student explain the concept in their own words.

Rules:
- Read and analyze both the Block content summary and the Before level question.
- Focus on the main learning objective of the block.
- Generate exactly ONE question that is closely related to the block content.
- Do not repeat the previous question. Avoid asking the same question in a different way.
- Do not generate a question that is semantically similar to any previous question.
- The question should encourage explanation and understanding rather than memorization.
- Prefer "why", "how", or "what is the purpose" questions whenever appropriate.
- Do not ask for exact definitions, syntax, or code unless they are the primary learning objective of the block.
- Use the Current level together with the Before level question to determine the appropriate difficulty.
- The new question should gradually increase or adjust the difficulty without repeating the previous question.
- If there is no previous question, generate an appropriate question for the Current level.
- The question should be clear, concise, beginner-friendly, and answerable in 1-3 sentences.
- Generate the question in the detected language from the given code. If unsure, return the question in English.
- Return only one question.
- Return JSON only.
- Do not wrap the JSON in markdown.
- Set "isEnough" to true if the generated question is sufficient to evaluate the student's understanding of the entire block.
- Otherwise set "isEnough" to false.
- Read all previously generated questions together with the current question.
- If they collectively cover the block's main learning objectives, set "isEnough" to true.
- Otherwise, set "isEnough" to false.

Return exactly this JSON shape:
{
  "question": string,
  "isEnough": boolean
}

Block content summary:
${contentSummary}

Current level: ${level}

Before level questions:
${JSON.stringify(questions, null, 2)}

Detected language code: ${languageDetected}
IMPORTANT LANGUAGE RULE:
- Evaluate the student's meaning, not their writing quality.
- The student's message may contain typos, slang, mixed languages, or missing diacritics.
- Never imitate those mistakes.
- Always produce clean, natural output in the detected language.
- If detected language is "vie", always use proper Vietnamese with diacritics.
- If detected language is "eng", always use standard English.
`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function getGroqErrorMessage(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.error)) {
    return 'Groq Question Generation failed';
  }

  return typeof value.error.message === 'string'
    ? value.error.message
    : 'Groq Question Generation failed';
}

// Get the assistant's reply text from GROQ response
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

function isQSGenAiResult(value: unknown): value is QSGenAiResult {
  if (!isRecord(value)) return false;

  return (
    typeof value.question === 'string' && typeof value.isEnough === 'boolean'
  );
}

function buildFallbackQSGenResult(): QSGenAiResult {
  return {
    question:
      'Sorry, I am unable to generate a question at this time. Please try again later.',
    isEnough: false,
  };
}

async function generateGroqText(prompt: string): Promise<string | undefined> {
  if (!ENV.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not defined');
  }

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
    temperature: 0.2,
  };

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
  );

  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getGroqErrorMessage(responseBody));
  }

  return getGroqResponseText(responseBody);
}

export async function generateQS(input: QSGenAiInput): Promise<QSGenAiResult> {
  const prompt = buildPrompt(input);
  const responseText = await generateGroqText(prompt);

  if (!responseText) {
    return buildFallbackQSGenResult();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    return buildFallbackQSGenResult();
  }

  if (!isQSGenAiResult(parsed)) {
    return buildFallbackQSGenResult();
  }

  return parsed;
}
