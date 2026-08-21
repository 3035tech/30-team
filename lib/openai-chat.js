/**
 * Cliente OpenAI compartilhado (servidor apenas).
 * Env: OPENAI_API_KEY, OPENAI_RUBRIC_MODEL (default gpt-4o-mini).
 */

const DEFAULT_MODEL = 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

/** Alias usado pela rubrica. */
export const isRubricAiConfigured = isOpenAiConfigured;

export function openAiModelName() {
  return String(process.env.OPENAI_RUBRIC_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

/**
 * @param {{ messages: {role:string,content:string}[], temperature?: number, maxTokens?: number }} opts
 * @returns {Promise<string>}
 */
export async function openAiChatCompletion({ messages, temperature = 0.3, maxTokens = 1200 }) {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    const err = new Error('RUBRIC_AI_NOT_CONFIGURED');
    err.code = 'RUBRIC_AI_NOT_CONFIGURED';
    throw err;
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiModelName(),
      temperature,
      max_tokens: maxTokens,
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = res.status === 401 || res.status === 403 ? 'RUBRIC_AI_AUTH' : 'RUBRIC_AI_FAILED';
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) {
    const err = new Error('RUBRIC_AI_EMPTY');
    err.code = 'RUBRIC_AI_EMPTY';
    throw err;
  }
  return String(text).trim();
}

export function extractJsonObject(text) {
  const fence = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fence ? fence[1].trim() : String(text || '');
  const brace = candidate.match(/\{[\s\S]*\}/);
  if (brace) candidate = brace[0];
  return candidate;
}
