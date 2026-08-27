/**
 * Rubrica / contexto de vaga via OpenAI (modelo barato: gpt-4o-mini).
 */

import { htmlToPlainText } from './sanitize-html.js';
import { normalizeLocale } from './i18n.js';
import {
  buildRubricContextDraft,
  buildRubricWeightsPrompt,
  parseRubricWeightsFromAiText,
  relativeWeightsToPercentRubric,
} from './rubric-prompt.js';
import {
  isOpenAiConfigured,
  isRubricAiConfigured,
  openAiChatCompletion,
  openAiModelName,
} from './openai-chat.js';

export { isRubricAiConfigured, isOpenAiConfigured };

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

  const context = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
    maxTokens: 900,
  });

  return { context, model: openAiModelName() };
}

/**
 * Sugere pesos T1–T9 (+ notas) a partir do contexto preenchido.
 */
export async function suggestRubricWeightsFromContext(context, locale = 'pt-BR') {
  const prompt = buildRubricWeightsPrompt({ locale, context });
  const useEn = normalizeLocale(locale) === 'en';

  const system = useEn
    ? `You are a recruiting rubric assistant. Reply with ONLY one JSON object: {"weights":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},"notes":"..."}. Integer weights 0–3. No markdown. No clinical diagnosis language.`
    : `Você é assistente de rubrica de recrutamento. Responda APENAS um objeto JSON: {"weights":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},"notes":"..."}. Pesos inteiros 0–3. Sem markdown. Sem linguagem de diagnóstico clínico.`;

  const raw = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0.25,
    maxTokens: 900,
    responseFormat: 'json_object',
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
    model: openAiModelName(),
  };
}

/**
 * Sugere rubrica % T1–T9 para cargo a partir de nome + descrição (mesmo motor da Fit da vaga).
 * @param {{ name?: string, description?: string }} role
 * @param {string} [locale]
 */
export async function suggestJobRoleRubricFromText(role, locale = 'pt-BR') {
  const name = String(role?.name || '').trim();
  const description = String(role?.description || '').trim();
  if (name.length < 2) {
    const err = new Error('RUBRIC_AI_NEED_CONTEXT');
    err.code = 'RUBRIC_AI_NEED_CONTEXT';
    throw err;
  }

  const context = buildRubricContextDraft({
    locale,
    title: name,
    descriptionPlain: description,
  });
  const out = await suggestRubricWeightsFromContext(context, locale);
  return {
    raw: out.raw,
    weights: out.weights,
    rubric: relativeWeightsToPercentRubric(out.weights),
    notes: out.notes || undefined,
    model: out.model,
  };
}
