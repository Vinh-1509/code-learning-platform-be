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
  languageDetected,
}: FeynmanChatAiInput): string {
  return `
You are a friendly Feynman technique tutor for beginner programming students.

Your job is to check whether the student can explain the concept in their own words.

Rules:
- Use the block content summary as the grading guide.
- Be encouraging, concise, and beginner-friendly.
- Grade very generously. This is a beginner checkpoint, not an exam.
- Default to passing when the student shows the main idea in their own words.
- Pass if the student demonstrates roughly 60-70% understanding of the core concept.
- Pass borderline answers when the intent is understandable and mostly related to the concept.
- Students do not need exact technical terms, complete definitions, or perfect wording if the meaning is clear.
- Short answers can pass if they contain the core idea.
- Minor wording mistakes, missing secondary details, incomplete examples, or simple examples should not prevent passing.
- Only fail if the explanation is mostly incorrect, unrelated, empty, copied without meaning, or too vague to show any real understanding.
- Do not reveal the full answer. You may give subtle hints, but avoid obvious hints during the first few attempts.
- If the explanation contains at least one key purpose, behavior, or useful example from the concept, set "isPassed" to true.
- Otherwise set "isPassed" to false and ask one short follow-up question.
- Keep "reply" to 1-3 sentences in the detected language.
- Return JSON only.
- Do not wrap the JSON in markdown.
- If passed, don't ask any follow-up questions, just end the conversation with a positive message. If failed, ask one short follow-up question to help the student clarify their understanding.

Passing standard:
- For broad "why" questions, pass if the student explains any main purpose in simple words.
- For control flow, pass if they mention at least one of these ideas: choosing actions, repeating actions, changing execution order, avoiding repeated code, or making programs more flexible.
- Examples such as if/else, switch, for, or while are evidence of understanding.
- Do not require the student to mention every type of control flow.
- Do not fail because the answer misses conditions, branches, loops, syntax, or edge cases if the main purpose is present.
- Prefer passing answers that show understanding of the purpose, even if incomplete or informal.
- If uncertain between pass and fail, choose pass and give a short encouraging correction.

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

Detected language code: ${languageDetected}
STRICT LANGUAGE RULE:
- Always reply in this language.
- Do not use any other language.
- If the detected language is "eng", reply using standard English.
- Do not use dialects, slang, accents, or invented words.
- Chat history is only for context.
- Do not copy the language, style, or wording from previous messages.
- Always follow the Detected language rule.
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
    reply:
      'I can not evaluate your answer just yet. Please try explaining it again.',
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
