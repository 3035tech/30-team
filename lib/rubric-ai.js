/**
 * Rubrica / contexto de vaga via OpenAI (modelo barato: gpt-4o-mini).
 * Chave: OPENAI_API_KEY (nunca no client).
 */

import { htmlToPlainText } from './sanitize-html.js';
import { normalizeLocale } from './i18n.js';
import {
  buildRubricContextDraft,
  buildRubricWeightsPrompt,
  parseRubricWeightsFromAiText,
} from './rubric-prompt.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export function isRubricAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function modelName() {
  return String(process.env.OPENAI_RUBRIC_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

/**
 * @param {{ messages: {role:string,content:string}[], temperature?: number, maxTokens?: number }} opts
 */
async function chatCompletion({ messages, temperature = 0.3, maxTokens = 1200 }) {
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
      model: modelName(),
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

function vacancyFactsBlock(vacancy, locale) {
  const useEn = normalizeLocale(locale) === 'en';
  const desc = htmlToPlainText(vacancy?.description || '').slice(0, 4000);
  const lines = [
    useEn ? `Title: ${vacancy?.title || '—'}` : `Título: ${vacancy?.title || '—'}`,
    useEn
      ? `Employment type: ${vacancy?.employmentType || 'not set'}`
      : `Formato de contratação: ${vacancy?.employmentType || 'não informado'}`,
    useEn
      ? `Salary range: ${vacancy?.salaryMin || '—'} – ${vacancy?.salaryMax || '—'}`
      : `Faixa salarial: ${vacancy?.salaryMin || '—'} – ${vacancy?.salaryMax || '—'}`,
    useEn
      ? `Target / deadline: ${vacancy?.targetDate || '—'}`
      : `Vencimento: ${vacancy?.targetDate || '—'}`,
    useEn ? `Description (plain):` : `Descrição (texto):`,
    desc || (useEn ? '(empty)' : '(vazia)'),
  ];
  return lines.join('\n');
}

/**
 * Pré-preenche o CONTEXTO DA VAGA a partir dos dados já cadastrados.
 * @returns {Promise<{ context: string, model: string }>}
 */
export async function suggestRubricContextFromVacancy(vacancy, locale = 'pt-BR') {
  const useEn = normalizeLocale(locale) === 'en';
  const draft = buildRubricContextDraft({
    locale,
    title: vacancy?.title || '',
    descriptionPlain: htmlToPlainText(vacancy?.description || ''),
  });

  const system = useEn
    ? `You help HR fill a vacancy context template for a work-style (Enneagram T1–T9) fit rubric.
Return ONLY the filled template text (same bullet lines). Use hedging ("tends to", "likely").
Do not invent company secrets. If data is missing, write a short plausible draft marked with [confirm with hiring manager].
Keep Portuguese or English to match the template language.`
    : `Você ajuda o RH a preencher o template de CONTEXTO DA VAGA para uma rubrica de aderência (Eneagrama T1–T9).
Devolva APENAS o texto do template preenchido (mesmas linhas com hífen). Use hedging (“tende a”, “há indícios”).
Não invente dados confidenciais. Se faltar informação, proponha rascunho curto marcado com [confirmar com o gestor].
Responda em português, no mesmo formato do template.`;

  const user = useEn
    ? `Vacancy data:\n${vacancyFactsBlock(vacancy, locale)}\n\nTemplate to complete (keep the same structure):\n${draft}`
    : `Dados da vaga:\n${vacancyFactsBlock(vacancy, locale)}\n\nTemplate a completar (mantenha a mesma estrutura):\n${draft}`;

  const context = await chatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
    maxTokens: 900,
  });

  return { context, model: modelName() };
}

/**
 * Sugere pesos T1–T9 (+ notas) a partir do contexto preenchido.
 * @returns {Promise<{ raw: string, weights: Record<string, number>, notes?: string, model: string }>}
 */
export async function suggestRubricWeightsFromContext(context, locale = 'pt-BR') {
  const prompt = buildRubricWeightsPrompt({ locale, context });
  const useEn = normalizeLocale(locale) === 'en';

  const system = useEn
    ? `You are a recruiting rubric assistant. Follow the user prompt exactly. Prefer JSON weights 0–3 for types 1–9. No clinical diagnosis language.`
    : `Você é assistente de rubrica de recrutamento. Siga o prompt do usuário. Prefira pesos JSON 0–3 para tipos 1–9. Sem linguagem de diagnóstico clínico.`;

  const raw = await chatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0.25,
    maxTokens: 1100,
  });

  const parsed = parseRubricWeightsFromAiText(raw, locale);
  if (!parsed.ok) {
    const err = new Error('RUBRIC_AI_PARSE');
    err.code = 'RUBRIC_AI_PARSE';
    err.raw = raw;
    throw err;
  }

  return {
    raw,
    weights: parsed.weights,
    notes: parsed.notes || undefined,
    model: modelName(),
  };
}
