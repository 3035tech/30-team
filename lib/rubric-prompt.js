import { normalizeLocale } from './i18n';

const CONTEXT_TEMPLATE_PT = `INSTRUÇÃO PARA O RH: preencha cada linha abaixo com dados reais desta vaga (não deixe em branco). Exemplo de título: "RH trainee".

- Nome/título: {title}
- Objetivo do papel (o que é sucesso em 60–90 dias):
- Senioridade (júnior/pleno/sênior) e nível de autonomia esperado:
- Ritmo e pressão (baixo/médio/alto) e como é medido:
- Trabalho mais individual vs colaborativo:
- O que mais derruba pessoas nessa função/programa:
- Restrições culturais/valores (ex.: "feedback direto", "alta disciplina", "ambiente caótico"):
{extraDescription}`;

const CONTEXT_TEMPLATE_EN = `INSTRUCTION FOR HR: fill in every line below with real data for this vacancy (do not leave blank). Example title: "HR trainee".

- Role / title: {title}
- Role goal (what success looks like in 60–90 days):
- Seniority (junior/mid/senior) and expected autonomy:
- Pace and pressure (low/medium/high) and how it is measured:
- More individual vs collaborative work:
- What most often causes people to fail in this role/program:
- Cultural constraints/values (e.g. "direct feedback", "high discipline", "chaotic environment"):
{extraDescription}`;

/** Prompt body — recruiter fills CONTEXTO DA VAGA then pastes into an AI. */
const PROMPT_PT = `Você é um(a) especialista em recrutamento e desenho de rubricas comportamentais.

Contexto do produto (obrigatório ler antes de sugerir pesos):
- A empresa usa o 30Team: uma avaliação de perfil de trabalho baseada no modelo do Eneagrama (nove tipos), representada no sistema como T1..T9.
- O candidato responde um questionário; o sistema gera scores por tipo (T1..T9). Isso é uma heurística para recrutamento/times — não é avaliação clínica nem diagnóstico.
- Sua tarefa é sugerir PESOS (importância relativa) para T1..T9 que melhor traduzem o “perfil desejado” para a vaga descrita abaixo.

Tarefa: gerar uma rubrica de aderência (pesos) para um teste que retorna scores dos tipos T1–T9.
Você deve devolver pesos numéricos para T1..T9 (0 a 3; 0 = irrelevante) e um texto curto explicando o racional.

Referência rápida dos tipos (vocabulário comum do Eneagrama; use como orientação, não como rótulo do candidato):
- T1: reformador / padrões, qualidade, melhoria contínua
- T2: auxiliar / apoio, relacionamento, serviço
- T3: realizador / performance, resultado, imagem de competência
- T4: individualista / profundidade, autenticidade, sentido
- T5: investigador / análise, autonomia, aprofundamento
- T6: leal / prevenção de risco, lealdade, estrutura
- T7: entusiasta / variedade, otimismo, velocidade de ideias
- T8: desafiador / assertividade, confronto, proteção
- T9: pacificador / estabilidade, mediação, ritmo

Regras:
- Não invente informações fora do contexto.
- Prefira rubrica simples: 2–4 tipos com peso > 0.
- Use pesos relativos (3,2,1) e evite números altos.
- Se o contexto tiver ambiguidades (ex.: “hunter vs farmer”), devolva 2 versões de rubrica (A e B) e explique quando usar cada uma.

Formato de resposta (obrigatório):
1) JSON com pesos:
{
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
  "6": 0,
  "7": 0,
  "8": 0,
  "9": 0
}
2) Racional (3–6 bullets).
3) Notas internas sugeridas (2–5 linhas) para colar no campo do sistema.

CONTEXTO DA VAGA
(Preencha cada item abaixo antes de enviar à IA.)
{context}
`;

const PROMPT_EN = `You are an expert in recruiting and behavioral rubric design.

Product context (read before suggesting weights):
- The company uses 30Team: a work-profile assessment based on the Enneagram model (nine types), represented in the system as T1..T9.
- The candidate answers a questionnaire; the system produces scores by type (T1..T9). This is a recruiting/team heuristic — not a clinical assessment or diagnosis.
- Your task is to suggest WEIGHTS (relative importance) for T1..T9 that best express the “desired profile” for the vacancy below.

Task: generate a fit rubric (weights) for a test that returns T1–T9 type scores.
Return numeric weights for T1..T9 (0 to 3; 0 = irrelevant) and a short rationale.

Quick type reference (common Enneagram vocabulary; guidance only, not a candidate label):
- T1: reformer / standards, quality, continuous improvement
- T2: helper / support, relationship, service
- T3: achiever / performance, results, competence image
- T4: individualist / depth, authenticity, meaning
- T5: investigator / analysis, autonomy, depth of expertise
- T6: loyalist / risk prevention, loyalty, structure
- T7: enthusiast / variety, optimism, idea speed
- T8: challenger / assertiveness, confrontation, protection
- T9: peacemaker / stability, mediation, pace

Rules:
- Do not invent information outside the context.
- Prefer a simple rubric: 2–4 types with weight > 0.
- Use relative weights (3,2,1) and avoid large numbers.
- If the context is ambiguous (e.g. “hunter vs farmer”), return 2 rubric versions (A and B) and explain when to use each.

Required response format:
1) JSON weights:
{
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
  "6": 0,
  "7": 0,
  "8": 0,
  "9": 0
}
2) Rationale (3–6 bullets).
3) Suggested internal notes (2–5 lines) to paste into the system field.

VACANCY CONTEXT
(Fill in every item below before sending to the AI.)
{context}
`;

/**
 * Structured blank context for the recruiter to complete before copying the prompt.
 * @param {{ locale?: string, title?: string, descriptionPlain?: string }} opts
 */
export function buildRubricContextDraft({ locale = 'pt-BR', title = '', descriptionPlain = '' } = {}) {
  const useEn = normalizeLocale(locale) === 'en';
  const tpl = useEn ? CONTEXT_TEMPLATE_EN : CONTEXT_TEMPLATE_PT;
  const extra = String(descriptionPlain || '').trim();
  const extraBlock = extra
    ? (useEn ? `\n- Additional description / notes:\n${extra}` : `\n- Descrição / notas adicionais:\n${extra}`)
    : '';
  return tpl
    .replace('{title}', String(title || '').trim() || (useEn ? '(fill in)' : '(preencher)'))
    .replace('{extraDescription}', extraBlock);
}

/**
 * Full copy-paste prompt for an LLM.
 * @param {{ locale?: string, context?: string, title?: string, descriptionPlain?: string }} opts
 */
export function buildRubricWeightsPrompt({
  locale = 'pt-BR',
  context = '',
  title = '',
  descriptionPlain = '',
} = {}) {
  const useEn = normalizeLocale(locale) === 'en';
  const filled =
    String(context || '').trim() ||
    buildRubricContextDraft({ locale, title, descriptionPlain });
  const body = useEn ? PROMPT_EN : PROMPT_PT;
  return body.replace('{context}', filled);
}

/**
 * Heuristic: recruiter filled more than title placeholder on several lines.
 * @param {string} context
 */
export function isRubricContextFilledEnough(context) {
  const lines = String(context || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-'));
  let filled = 0;
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const value = line.slice(idx + 1).trim();
    if (!value) continue;
    if (/^\(preencher\)$/i.test(value) || /^\(fill in\)$/i.test(value)) continue;
    filled += 1;
  }
  return filled >= 3;
}

function extractJsonObject(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fence ? fence[1].trim() : text;
  const brace = candidate.match(/\{[\s\S]*\}/);
  if (brace) candidate = brace[0];
  return candidate;
}

function extractSuggestedNotes(text, locale) {
  const useEn = normalizeLocale(locale) === 'en';
  const patterns = useEn
    ? [
        /(?:suggested\s+)?internal\s+notes[:\s]*([\s\S]+?)(?=\n\s*(?:\d\)|version\s*[ab]\b|$))/i,
        /(?:3\)\s*)?(?:suggested\s+)?internal\s+notes[^\n]*\n([\s\S]+)/i,
      ]
    : [
        /notas\s+internas(?:\s+sugeridas)?[:\s]*([\s\S]+?)(?=\n\s*(?:\d\)|versão\s*[ab]\b|$))/i,
        /(?:3\)\s*)?notas\s+internas[^\n]*\n([\s\S]+)/i,
      ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const notes = m[1].trim().replace(/^```[\s\S]*?```$/g, '').trim();
      if (notes.length > 8) return notes.slice(0, 4000);
    }
  }
  return '';
}

/**
 * Parse an LLM response into weights (+ optional notes).
 * Weights scale: 0–3 preferred (clamped 0–10 for compatibility).
 * @returns {{ ok: true, weights: Record<string, number>, notes?: string } | { ok: false, error: string }}
 */
export function parseRubricWeightsFromAiText(raw, locale = 'pt-BR') {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, error: 'empty' };

  let obj;
  try {
    obj = JSON.parse(extractJsonObject(text));
  } catch {
    return { ok: false, error: 'json' };
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, error: 'shape' };
  }

  // Prefer first rubric object if nested under A/B versions
  if (obj.A && typeof obj.A === 'object') obj = obj.A;
  else if (obj.weights && typeof obj.weights === 'object') obj = obj.weights;

  const weights = {};
  for (let t = 1; t <= 9; t++) {
    const key = String(t);
    const alt = `T${t}`;
    const v = obj[key] ?? obj[t] ?? obj[alt] ?? obj[alt.toLowerCase()];
    if (v == null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) continue;
    weights[key] = Math.max(0, Math.min(10, Math.round(n * 10) / 10));
  }
  if (Object.keys(weights).length === 0) return { ok: false, error: 'emptyWeights' };

  const notes = extractSuggestedNotes(text, locale);
  return notes ? { ok: true, weights, notes } : { ok: true, weights };
}
