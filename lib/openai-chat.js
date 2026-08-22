/**
 * Cliente OpenAI compartilhado (servidor apenas).
 * Env: OPENAI_API_KEY, OPENAI_RUBRIC_MODEL (default gpt-4o-mini).
 *
 * Mock (sem chamar a API):
 * - OPENAI_MOCK=1 — stub determinístico
 * - DTOV=1 — stub automático (provas offline / full-app)
 */

const DEFAULT_MODEL = 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** @type {{ at: string, messageCount: number, preview: string }[]} */
const mockLog = [];

export function isOpenAiMock() {
  if (String(process.env.OPENAI_MOCK || '').trim() === '1') return true;
  if (String(process.env.DTOV || '').trim() === '1') return true;
  return false;
}

export function isOpenAiConfigured() {
  if (isOpenAiMock()) return true;
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

/** Alias usado pela rubrica. */
export const isRubricAiConfigured = isOpenAiConfigured;

export function openAiModelName() {
  if (isOpenAiMock()) {
    return String(process.env.OPENAI_RUBRIC_MODEL || 'mock-gpt').trim() || 'mock-gpt';
  }
  return String(process.env.OPENAI_RUBRIC_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export function __resetOpenAiMockLog() {
  mockLog.length = 0;
}

export function __getOpenAiMockLog() {
  return mockLog.slice();
}

/**
 * Stub determinístico suficiente para rubrica / assistentes (JSON ou HTML).
 * @param {{ messages?: { role: string, content: string }[] }} opts
 */
export function buildOpenAiMockCompletion({ messages } = {}) {
  const blob = (Array.isArray(messages) ? messages : [])
    .map((m) => String(m?.content || ''))
    .join('\n');
  const lower = blob.toLowerCase();

  const idMatches = [...blob.matchAll(/"candidateId"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  const uniqueIds = [...new Set(idMatches.filter((n) => Number.isFinite(n)))];

  if (lower.includes('candidateids') || lower.includes('"candidateids"')) {
    const ids = uniqueIds.slice(0, 3);
    return JSON.stringify({
      candidateIds: ids.length ? ids : [1],
      rationaleHtml:
        '<p>Há indícios de bom fit nos perfis selecionados (mock DTOV).</p><p>Revisar com o gestor antes de avançar.</p>',
    });
  }

  if (lower.includes('"fields"') && (lower.includes('watchout') || lower.includes('interviewprobe'))) {
    const ids = uniqueIds.length
      ? uniqueIds.slice(0, 5).map(String)
      : ['1'];
    return JSON.stringify({
      fields: ids.map((candidateId) => ({
        candidateId,
        why: 'Há indícios de aderência à vaga (mock DTOV).',
        watchOut: 'Validar ritmo e autonomia na entrevista (mock).',
        interviewProbe: 'Como você prioriza entregas sob prazo apertado?',
      })),
    });
  }

  if (
    (lower.includes('json') && (lower.includes('weights') || lower.includes('t1'))) ||
    lower.includes('"1":') ||
    lower.includes('pesos')
  ) {
    return [
      '{',
      '  "1": 0,',
      '  "2": 0,',
      '  "3": 2,',
      '  "4": 0,',
      '  "5": 3,',
      '  "6": 1,',
      '  "7": 0,',
      '  "8": 0,',
      '  "9": 0',
      '}',
      '',
      'Notas sugeridas (mock DTOV):',
      '- Pesos determinísticos para prova offline; revisar com o gestor.',
      '- Preferência por análise (T5) e entrega (T3).',
    ].join('\n');
  }

  // Parecer / descrição HTML — texto longo o bastante para passar validação de assistentes
  return [
    '<p>Há indícios de que a shortlist tende a cobrir o perfil pedido (mock DTOV / OPENAI_MOCK).</p>',
    '<p>O fit observado combina entrega e análise; recomenda-se validar ritmo e autonomia na entrevista.</p>',
    '<p>Atenção a expectativas de autonomia e feedback frequente — explorar com o gestor da vaga.</p>',
    '<p>Próximo passo sugerido: alinhar shortlist com o hiring manager e seguir para entrevistas técnicas.</p>',
  ].join('');
}

/**
 * @param {{ messages: {role:string,content:string}[], temperature?: number, maxTokens?: number }} opts
 * @returns {Promise<string>}
 */
export async function openAiChatCompletion({ messages, temperature = 0.3, maxTokens = 1200 }) {
  if (isOpenAiMock()) {
    const text = buildOpenAiMockCompletion({ messages });
    mockLog.push({
      at: new Date().toISOString(),
      messageCount: Array.isArray(messages) ? messages.length : 0,
      preview: text.slice(0, 120),
      temperature,
      maxTokens,
    });
    return text;
  }

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
