import { ENV } from '../config/env';
import type {
  FeynmanChatAiInput,
  FeynmanChatAiResult,
} from '../interfaces/feynman.interface';

const MAX_HISTORY_MESSAGES = 5;

function buildFeynmanPrompt({
  contentSummary,
  userMessage,
  chatHistory,
}: FeynmanChatAiInput): string {
  return `
You are a friendly Feynman technique tutor for beginner programming students.

Your job is to check whether the student can explain the concept in their own words.
Explain and reply in Vietnamese.

Rules:
- Use the block content summary as the grading guide.
- Be encouraging, concise, and beginner-friendly.
- Do not give a long lecture or reveal a full model answer.
- Do not give the exactly answer, you can give hint but it should not be too obvious.
- Several first user attempts may be wrong, but you should encourage them to keep trying but dont give hint or answer too obvious.
- If the student's explanation is clear and conceptually correct, set "isPassed" to true.
- If the explanation is vague, memorized, incomplete, or incorrect, set "isPassed" to false and ask one short follow-up question.
- Keep "reply" to 1-3 Vietnamese sentences.
- Return JSON only.
- Do not wrap the JSON in markdown.
- If user fail more than 3 times, give them a nearly complete answer and ask for one last attempt to explain it in their own words. After that, if they still fail, encourage them to review the material and try again later.
- You can ask another question different from the original Feynman question (up to 3), but it must still be relevant to the same concept.

Return exactly this JSON shape:
{
  "reply": string,
  "isPassed": boolean
}

Block content summary:
${contentSummary}

Recent chat history:
${JSON.stringify(chatHistory.slice(-MAX_HISTORY_MESSAGES), null, 2)}

Student message:
${userMessage}
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
    return 'Groq Feynman request failed';
  }

  return typeof value.error.message === 'string'
    ? value.error.message
    : 'Groq Feynman request failed';
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

function isFeynmanChatAiResult(value: unknown): value is FeynmanChatAiResult {
  if (!isRecord(value)) return false;

  return typeof value.reply === 'string' && typeof value.isPassed === 'boolean';
}

function buildFallbackFeynmanResult(): FeynmanChatAiResult {
  return {
    reply: 'Mình chưa thể đánh giá ngay lúc này. Hãy thử giải thích lại nhé.',
    isPassed: false,
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

export async function generateFeynmanFeedback(
  input: FeynmanChatAiInput,
): Promise<FeynmanChatAiResult> {
  const prompt = buildFeynmanPrompt(input);
  const responseText = await generateGroqText(prompt);

  if (!responseText) {
    return buildFallbackFeynmanResult();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    return buildFallbackFeynmanResult();
  }

  if (!isFeynmanChatAiResult(parsed)) {
    return buildFallbackFeynmanResult();
  }

  return parsed;
}
