/**
 * Assistentes de IA para vaga / relatório / notas (OpenAI, servidor).
 * Sempre: sugerir → RH revisa → salvar. Linguagem hedged; sem diagnóstico clínico.
 */

import { htmlToPlainText, sanitizeRichTextHtml } from './sanitize-html.js';
import { normalizeLocale } from './i18n.js';
import { STRUCTURED_FIELD_MAX_CHARS } from './vacancy-report-shared.js';
import { extractJsonObject, openAiChatCompletion, openAiModelName } from './openai-chat.js';

function clip(s, n) {
  const t = String(s || '').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function vacancyBrief(vacancy, locale) {
  const useEn = normalizeLocale(locale) === 'en';
  return [
    useEn ? `Vacancy: ${vacancy?.title || '—'}` : `Vaga: ${vacancy?.title || '—'}`,
    useEn
      ? `Employment: ${vacancy?.employmentType || 'n/a'}`
      : `Contratação: ${vacancy?.employmentType || 'n/d'}`,
    useEn
      ? `Salary: ${vacancy?.salaryMin || '—'} – ${vacancy?.salaryMax || '—'}`
      : `Faixa: ${vacancy?.salaryMin || '—'} – ${vacancy?.salaryMax || '—'}`,
    useEn
      ? `Description: ${clip(htmlToPlainText(vacancy?.description || ''), 1200)}`
      : `Descrição: ${clip(htmlToPlainText(vacancy?.description || ''), 1200)}`,
    useEn
      ? `Rubric notes: ${clip(htmlToPlainText(vacancy?.rubricNotes || ''), 600)}`
      : `Notas da rubrica: ${clip(htmlToPlainText(vacancy?.rubricNotes || ''), 600)}`,
  ].join('\n');
}

/**
 * Parecer executivo HTML para o relatório /r.
 * @param {{ vacancy: object, candidates: object[], locale?: string }} opts
 */
export async function suggestExecutiveNoteAi({ vacancy, candidates, locale = 'pt-BR' }) {
  const useEn = normalizeLocale(locale) === 'en';
  const list = (Array.isArray(candidates) ? candidates : []).slice(0, 12).map((c) => ({
    id: c.candidateId ?? c.id,
    name: c.name,
    topType: c.topType,
    fit: c.vacancyFitScore010,
    recommendation: c.recommendation,
    why: c.why || '',
    watchOut: c.watchOut || '',
    motivators: (c.motivatorsTop || []).map((m) => m.key || m).slice(0, 3),
  }));

  const system = useEn
    ? `You write executive notes for a client recruiting report (30Team).
Rules: hedging language ("tends to"); never clinical diagnosis; HTML only with <p> and <strong>; 4 short paragraphs:
1) Who to advance (+ discuss if any)
2) Why / fit vs role
3) Watch-outs / interview probes
4) Suggested next step
Min ~100 words of plain text. Portuguese or English matching the user locale.`
    : `Você escreve o parecer executivo do relatório ao cliente (30Team).
Regras: hedging (“tende a”); nunca diagnóstico clínico; só HTML com <p> e <strong>; 4 parágrafos curtos:
1) Quem avançar (+ conversar, se houver)
2) Por quê / fit vs vaga
3) Alertas / pontos a explorar
4) Próximo passo sugerido
Mínimo ~100 palavras de texto. Português.`;

  const user = `${vacancyBrief(vacancy, locale)}

Shortlist JSON:
${JSON.stringify(list, null, 2)}

${useEn ? 'Return ONLY the HTML note.' : 'Devolva APENAS o HTML do parecer.'}`;

  const raw = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.35,
    maxTokens: 900,
  });

  const html = sanitizeRichTextHtml(raw, 8000);
  if (!html || htmlToPlainText(html).length < 80) {
    const err = new Error('ASSIST_AI_NOTE_SHORT');
    err.code = 'ASSIST_AI_NOTE_SHORT';
    err.raw = raw;
    throw err;
  }
  return { executiveNote: html, model: openAiModelName() };
}

/**
 * Sugere até cinco pessoas para avançar ou discutir na shortlist.
 * A saída é limitada aos IDs presentes no payload; RH ainda revisa antes de gerar o relatório.
 * @param {{ vacancy: object, candidates: object[], locale?: string }} opts
 */
export async function suggestShortlistAi({ vacancy, candidates, locale = 'pt-BR' }) {
  const useEn = normalizeLocale(locale) === 'en';
  const list = (Array.isArray(candidates) ? candidates : [])
    .slice(0, 12)
    .map((c) => ({
      candidateId: Number(c.candidateId ?? c.id),
      name: c.name,
      topType: c.topType,
      fit: c.vacancyFitScore010,
      recommendation: c.recommendation,
      why: clip(c.why || '', 400),
      watchOut: clip(c.watchOut || '', 400),
      notes: clip(htmlToPlainText(c.interviewNotes || ''), 500),
      motivators: (c.motivatorsTop || []).map((m) => m.label || m.key || m).slice(0, 3),
    }))
    .filter((c) => Number.isFinite(c.candidateId));
  const allowedIds = new Set(list.map((c) => c.candidateId));

  const system = useEn
    ? `Suggest a recruiting shortlist from the supplied candidates.
Return ONLY valid JSON:
{"candidateIds":[1,2],"rationaleHtml":"<p>...</p>"}
Choose at most 5 candidates you recommend as Advance or Discuss. Use only supplied candidate IDs.
The rationale must use hedging ("tends to", "there are indications"), avoid clinical labels, and contain 2–4 short HTML <p> paragraphs for HR review.`
    : `Sugira uma shortlist de recrutamento a partir dos candidatos fornecidos.
Devolva APENAS JSON válido:
{"candidateIds":[1,2],"rationaleHtml":"<p>...</p>"}
Escolha no máximo 5 candidatos que recomenda como Avançar ou Conversar. Use somente IDs fornecidos.
A justificativa deve usar hedging ("tende a", "há indícios"), evitar rótulos clínicos e ter 2–4 parágrafos HTML <p> curtos para revisão do RH.`;

  const raw = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `${vacancyBrief(vacancy, locale)}

Candidates:
${JSON.stringify(list, null, 2)}`,
      },
    ],
    temperature: 0.25,
    maxTokens: 800,
  });

  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    const err = new Error('ASSIST_AI_PARSE');
    err.code = 'ASSIST_AI_PARSE';
    err.raw = raw;
    throw err;
  }

  const candidateIds = [...new Set(
    (Array.isArray(parsed?.candidateIds) ? parsed.candidateIds : [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && allowedIds.has(id))
  )].slice(0, 5);
  const rationaleHtml = sanitizeRichTextHtml(parsed?.rationaleHtml || '', 8000);
  if (!rationaleHtml || htmlToPlainText(rationaleHtml).length < 40) {
    const err = new Error('ASSIST_AI_PARSE');
    err.code = 'ASSIST_AI_PARSE';
    err.raw = raw;
    throw err;
  }

  return { candidateIds, rationaleHtml };
}

/**
 * Campos estruturados why / watchOut / interviewProbe por candidato.
 * @param {{ vacancy: object, candidates: object[], locale?: string }} opts
 */
export async function suggestCandidateFieldsAi({ vacancy, candidates, locale = 'pt-BR' }) {
  const useEn = normalizeLocale(locale) === 'en';
  const list = (Array.isArray(candidates) ? candidates : []).slice(0, 12).map((c) => ({
    candidateId: String(c.candidateId ?? c.id),
    name: c.name,
    topType: c.topType,
    fit: c.vacancyFitScore010,
    recommendation: c.recommendation,
    notes: clip(htmlToPlainText(c.interviewNotes || ''), 500),
    motivators: (c.motivatorsTop || []).map((m) => m.label || m.key || m).slice(0, 3),
  }));

  const system = useEn
    ? `For each candidate return JSON:
{"fields":[{"candidateId":"...","why":"...","watchOut":"...","interviewProbe":"..."}]}
Each field ≤ ${STRUCTURED_FIELD_MAX_CHARS} chars. Hedging only. No clinical labels. Match locale.`
    : `Para cada candidato devolva JSON:
{"fields":[{"candidateId":"...","why":"...","watchOut":"...","interviewProbe":"..."}]}
Cada campo ≤ ${STRUCTURED_FIELD_MAX_CHARS} caracteres. Só hedging. Sem rótulo clínico. Em português.
why = por que considerar; watchOut = atenção; interviewProbe = pergunta para a entrevista.`;

  const user = `${vacancyBrief(vacancy, locale)}

Candidates:
${JSON.stringify(list, null, 2)}`;

  const raw = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.35,
    maxTokens: 1400,
  });

  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    const err = new Error('ASSIST_AI_PARSE');
    err.code = 'ASSIST_AI_PARSE';
    err.raw = raw;
    throw err;
  }

  const rows = Array.isArray(parsed?.fields) ? parsed.fields : Array.isArray(parsed) ? parsed : [];
  const fields = {};
  for (const row of rows) {
    const id = String(row.candidateId || row.id || '').trim();
    if (!id) continue;
    fields[id] = {
      why: clip(row.why, STRUCTURED_FIELD_MAX_CHARS),
      watchOut: clip(row.watchOut, STRUCTURED_FIELD_MAX_CHARS),
      interviewProbe: clip(row.interviewProbe, STRUCTURED_FIELD_MAX_CHARS),
    };
  }
  if (!Object.keys(fields).length) {
    const err = new Error('ASSIST_AI_PARSE');
    err.code = 'ASSIST_AI_PARSE';
    err.raw = raw;
    throw err;
  }
  return { fields, model: openAiModelName() };
}

/**
 * Resume notas de entrevista em HTML curto (ul/li).
 */
export async function summarizeInterviewNotesAi({ notesHtml, candidateName, locale = 'pt-BR' }) {
  const useEn = normalizeLocale(locale) === 'en';
  const plain = htmlToPlainText(notesHtml || '');
  if (plain.length < 20) {
    const err = new Error('ASSIST_AI_NOTES_EMPTY');
    err.code = 'ASSIST_AI_NOTES_EMPTY';
    throw err;
  }

  const system = useEn
    ? `Summarize interview notes into 3–5 HTML <li> bullets inside a <ul>. Keep facts; hedging; no diagnosis. Return ONLY HTML.`
    : `Resuma as notas de entrevista em 3–5 bullets HTML (<ul><li>…). Mantenha fatos; hedging; sem diagnóstico. Devolva SÓ HTML.`;

  const user = useEn
    ? `Candidate: ${candidateName || '—'}\nNotes:\n${clip(plain, 6000)}`
    : `Candidato: ${candidateName || '—'}\nNotas:\n${clip(plain, 6000)}`;

  const raw = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  let html = sanitizeRichTextHtml(raw, 8000);
  if (html && !/<ul/i.test(html) && !/<li/i.test(html)) {
    html = sanitizeRichTextHtml(
      `<ul>${plain
        .split(/\n+/)
        .slice(0, 5)
        .map((l) => `<li>${l}</li>`)
        .join('')}</ul>`,
      8000
    );
  }
  // Prefer model HTML; if empty fallback wrap
  if (!html) {
    html = sanitizeRichTextHtml(`<p>${clip(plain, 800)}</p>`, 8000);
  }
  return { summaryHtml: html, model: openAiModelName() };
}

/**
 * Rascunho de descrição da vaga (HTML).
 */
export async function suggestVacancyDescriptionAi({ vacancy, locale = 'pt-BR' }) {
  const useEn = normalizeLocale(locale) === 'en';
  const system = useEn
    ? `Write a concise vacancy description in HTML (<p>, <ul><li>). Sections: mission, responsibilities (3–5), requirements (3–5). Hedging OK. No fake benefits. Return ONLY HTML.`
    : `Escreva descrição concisa de vaga em HTML (<p>, <ul><li>). Seções: missão, responsabilidades (3–5), requisitos (3–5). Hedging ok. Sem benefícios inventados. Só HTML.`;

  const user = vacancyBrief(vacancy, locale);

  const raw = await openAiChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
    maxTokens: 900,
  });

  const html = sanitizeRichTextHtml(raw, 12000);
  if (!html || htmlToPlainText(html).length < 40) {
    const err = new Error('ASSIST_AI_DESC_SHORT');
    err.code = 'ASSIST_AI_DESC_SHORT';
    err.raw = raw;
    throw err;
  }
  return { description: html, model: openAiModelName() };
}
