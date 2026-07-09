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
  hasReceivedFollowUp,
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
- Keep "reply" to 1-3 sentences.
- Return JSON only.
- Do not wrap the JSON in markdown.
- If passed, don't ask any follow-up questions, just end the conversation with a positive message.

Passing standard:
- This is a beginner checkpoint, not an exam. Default to passing.
- Pass immediately if the student mentions even ONE correct purpose, behavior, or use case.
- Do not ask follow-up questions to fish for more detail if the core idea is already present.
- Only set "isPassed" to false if the answer is completely off-topic, empty, or pure nonsense.
- Never chain follow-up questions. One failed attempt gets ONE follow-up question maximum in
  this entire conversation, no matter how many more times the student replies after that.
- For broad "why" questions, pass if the student explains any main purpose in simple words.
- For control flow, pass if they mention at least one of these ideas: choosing actions, repeating actions, changing execution order, avoiding repeated code, or making programs more flexible.
- Examples such as if/else, switch, for, or while are evidence of understanding.
- Do not require the student to mention every type of control flow.
- Do not fail because the answer misses conditions, branches, loops, syntax, or edge cases if the main purpose is present.
- Prefer passing answers that show understanding of the purpose, even if incomplete or informal.
- If uncertain between pass and fail, choose pass and give a short encouraging correction.

Verbatim copying rule (important):
- Do NOT give extra credit for length or for closely mirroring the wording of the block content summary.
- A short, simple answer in the student's own words that captures the key idea must be graded exactly the same as a long answer that repeats the block content almost word-for-word.
- Copying the block content verbatim, or very closely paraphrasing its sentence structure and phrasing, is NOT by itself evidence of understanding. Judge whether the student's message reflects genuine comprehension, not how similar it is to the reference text.
- Never fail a short correct paraphrase while passing a longer verbatim-like answer that says the same thing. Grade both on the same standard: does it show the core idea in a way that suggests real understanding.

Example — should PASS:
Block content summary (paraphrased): "VS Code is an editor for writing code; it does not compile C++ by itself."
Student message: "code editor"
Verdict: PASS. Short, but it captures the core distinction (an editor, not a compiler) in the student's own words.

Example — should NOT get bonus credit just for overlap:
Student message: [pastes the entire block theory/code text back almost word-for-word]
Verdict: Do not treat this as automatically better than a short correct paraphrase. Verbatim repetition of the source text is not, by itself, proof of understanding. Grade it on whether it demonstrates the student grasps the idea, exactly as you would a short answer.

Return exactly this JSON shape:
{
  "reply": string,
  "isPassed": boolean
}

Block content summary:
${contentSummary}

Recent chat history (for factual context only):
${JSON.stringify(chatHistory.slice(-MAX_HISTORY_MESSAGES), null, 2)}

Ignore the grammar, spelling, language, and writing style in the history.
Use it only to understand the conversation state.

ATTEMPT STATE (authoritative — this is tracked by the system, do not infer it
yourself from the chat history above):
${
  hasReceivedFollowUp
    ? 'hasReceivedFollowUp = true. The student has ALREADY received one follow-up question earlier in this attempt. This is their next reply after that follow-up.'
    : "hasReceivedFollowUp = false. This is the student's first reply in this attempt — no follow-up has been asked yet."
}

Rules for using ATTEMPT STATE:
- If hasReceivedFollowUp = false: grade normally. If the answer already shows
  the core idea, pass it. If not, you may fail it and ask exactly ONE short
  follow-up question in "reply".
- If hasReceivedFollowUp = true: you must NOT ask another follow-up question.
  - If this reply shows any reasonable understanding of the concept — even
    partial, informal, or building on what they said before — set "isPassed"
    to true and give a short encouraging closing message.
  - Only keep "isPassed" false if this reply is empty, pure nonsense, or
    clearly about a different topic entirely (not a genuine attempt to
    explain this concept). In that case, do not ask another question —
    just briefly note that the explanation doesn't yet address the concept.
  - Do not fail this reply merely for being short, incomplete, or reusing
    wording from earlier in the conversation — judge only whether it is a
    genuine, on-topic attempt to explain the idea.

Student message:
${userMessage}

LANGUAGE RULE:
- Always reply in standard English, regardless of the language the student uses.
- Do not imitate the student's writing style, grammar, or typos.
- Always produce clean, natural English output.
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
