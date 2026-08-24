/**
 * Help assistant — product Q&A only (Guia / navigation).
 * Prefer FAQ (0 LLM tokens) then lexical retrieval + cheap chat.
 */

import { messages, normalizeLocale, t } from './i18n.js';
import { isOpenAiConfigured, openAiChatCompletion } from './openai-chat.js';

const HELP_SECTIONS = [
  'welcome',
  'navigation',
  'links',
  'enneagram',
  'vacancies',
  'publicVacancy',
  'candidates',
  'pipeline',
  'team',
  'people',
  'climate',
  'b600Pdi',
  'b600Retention',
  'b600Pulse',
  'b600Employee',
  'b600Fit',
  'b700Onboarding',
  'report',
  'motivators',
  'access',
  'tips',
];

const TAB_BY_SECTION = {
  welcome: 'overview',
  navigation: 'overview',
  vacancies: 'vacancies',
  publicVacancy: 'vacancies',
  candidates: 'vacancies',
  pipeline: 'vacancies',
  team: 'team',
  people: 'team',
  climate: 'climate',
  motivators: 'motivators',
  report: 'vacancies',
  b600Pdi: 'team',
  b600Retention: 'team',
  b600Pulse: 'group',
  b600Employee: 'team',
  b600Fit: 'vacancies',
  b700Onboarding: 'team',
  help: 'help',
};

/** FAQ: zero-token answers when the query matches strongly. */
const FAQ = [
  {
    id: 'create-vacancy',
    patterns: [/criar\s+(uma\s+)?vaga/i, /nova\s+vaga/i, /new\s+vacanc/i, /create\s+(a\s+)?vacanc/i],
    section: 'vacancies',
    answerKey: 'panel.helpAssist.faqCreateVacancy',
  },
  {
    id: 'hire',
    patterns: [/contrat/i, /\bhire\b/i, /marcar\s+contrat/i, /pronto\s+para\s+contrat/i],
    section: 'pipeline',
    answerKey: 'panel.helpAssist.faqHire',
  },
  {
    id: 'motivators',
    patterns: [/motivador/i, /motivator/i],
    section: 'motivators',
    answerKey: 'panel.helpAssist.faqMotivators',
  },
  {
    id: 'climate',
    patterns: [/clima/i, /climate\s+survey/i, /pesquisa\s+de\s+clima/i],
    section: 'climate',
    answerKey: 'panel.helpAssist.faqClimate',
  },
  {
    id: 'enneagram',
    patterns: [/eneagrama/i, /enneagram/i, /\bt[1-9]\b/i, /enviar\s+teste/i],
    section: 'enneagram',
    answerKey: 'panel.helpAssist.faqEnneagram',
  },
  {
    id: 'public-page',
    patterns: [/p[aá]gina\s+p[uú]blica/i, /\/j\b/i, /seo/i, /public\s+page/i],
    section: 'publicVacancy',
    answerKey: 'panel.helpAssist.faqPublicPage',
  },
  {
    id: 'guide',
    patterns: [/guia/i, /\bhelp\b/i, /ajuda/i, /onde\s+(fico|est[aá]|acho)/i],
    section: 'welcome',
    answerKey: 'panel.helpAssist.faqGuide',
  },
];

const OUT_OF_SCOPE =
  /\b(folha|sal[aá]rio\s+l[ií]quido|cl[ií]nico|diagn[oó]stico|psicolog|disc\b|linkedin|curr[ií]culo|cv\b|imposto|lgpd\s+exclu)/i;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

/**
 * @param {string} locale
 * @returns {Array<{ id: string, section: string, title: string, body: string, tab: string|null }>}
 */
export function buildHelpChunks(locale) {
  const loc = normalizeLocale(locale);
  const pack = messages[loc]?.panel?.help || messages['pt-BR']?.panel?.help || {};
  const chunks = [];
  for (const section of HELP_SECTIONS) {
    const title = pack[`${section}Title`];
    const body = pack[`${section}Body`];
    if (!title && !body) continue;
    const steps = [];
    for (let i = 1; i <= 20; i += 1) {
      const step = pack[`${section}Step${i}`];
      if (!step) break;
      steps.push(String(step));
    }
    chunks.push({
      id: section,
      section,
      title: String(title || section),
      body: [body, ...steps].filter(Boolean).join('\n'),
      tab: TAB_BY_SECTION[section] || 'help',
    });
  }
  return chunks;
}

/**
 * @param {string} query
 * @param {ReturnType<typeof buildHelpChunks>} chunks
 * @param {number} [limit]
 */
export function retrieveHelpChunks(query, chunks, limit = 4) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const scored = chunks.map((c) => {
    const hay = tokenize(`${c.title} ${c.body}`);
    let score = 0;
    for (const tok of qTokens) {
      if (hay.includes(tok)) score += 2;
      else if (hay.some((h) => h.includes(tok) || tok.includes(h))) score += 1;
    }
    if (qTokens.some((t) => c.id.includes(t) || c.section.includes(t))) score += 3;
    return { ...c, score };
  });
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function matchHelpFaq(query, locale) {
  const q = String(query || '').trim();
  if (!q) return null;
  for (const item of FAQ) {
    if (item.patterns.some((re) => re.test(q))) {
      return {
        id: item.id,
        section: item.section,
        tab: TAB_BY_SECTION[item.section] || 'help',
        answer: t(locale, item.answerKey),
        source: 'faq',
      };
    }
  }
  return null;
}

export function isHelpOutOfScope(query) {
  return OUT_OF_SCOPE.test(String(query || ''));
}

/**
 * @param {{ question: string, locale?: string, history?: Array<{ role: string, content: string }> }} opts
 */
export async function answerHelpQuestion({ question, locale = 'pt-BR', history = [] } = {}) {
  const loc = normalizeLocale(locale);
  const q = String(question || '').trim().slice(0, 500);
  if (!q) {
    const err = new Error('EMPTY');
    err.code = 'HELP_ASSIST_EMPTY';
    throw err;
  }

  if (isHelpOutOfScope(q)) {
    return {
      answer: t(loc, 'panel.helpAssist.outOfScope'),
      tab: 'help',
      section: null,
      source: 'guard',
      citations: [],
    };
  }

  const faq = matchHelpFaq(q, loc);
  if (faq) {
    return {
      answer: faq.answer,
      tab: faq.tab,
      section: faq.section,
      source: 'faq',
      citations: [{ id: faq.section, title: t(loc, `panel.help.${faq.section}Title`) }],
    };
  }

  const chunks = buildHelpChunks(loc);
  const top = retrieveHelpChunks(q, chunks, 4);
  if (!top.length) {
    return {
      answer: t(loc, 'panel.helpAssist.noMatch'),
      tab: 'help',
      section: null,
      source: 'none',
      citations: [],
    };
  }

  const citations = top.map((c) => ({ id: c.section, title: c.title, tab: c.tab }));
  const primaryTab = top[0].tab || 'help';

  if (!isOpenAiConfigured()) {
    const lines = top.slice(0, 2).map((c) => `**${c.title}**\n${c.body.split('\n').slice(0, 3).join('\n')}`);
    return {
      answer: `${t(loc, 'panel.helpAssist.fallbackIntro')}\n\n${lines.join('\n\n')}`,
      tab: primaryTab,
      section: top[0].section,
      source: 'retrieve',
      citations,
    };
  }

  const context = top
    .map((c, i) => `[${i + 1}] ${c.title}\n${c.body.slice(0, 900)}`)
    .join('\n\n');
  const hist = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-4)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 400) }));

  const system =
    loc === 'en'
      ? 'You are the 30Team product help assistant. Answer ONLY how to use the 30Team panel (where to go, how to do a task). Use the CONTEXT from the Guide. Be concise (max ~120 words). Hedge: "tends to / typically". Never diagnose people, never invent features, never discuss payroll/clinical topics. If unsure, say to open Help. End with one suggested dashboard tab when relevant (e.g. Vacancies, Team).'
      : 'Você é o assistente de ajuda do 30Team. Responda SOMENTE como usar o painel (onde ir, como fazer). Use o CONTEXTO do Guia. Seja conciso (máx. ~120 palavras). Tom hedged (“tende a”). Nunca diagnostique pessoas, nunca invente features, nunca fale de folha/clínica. Se não souber, diga para abrir Ajuda. Termine com uma aba sugerida quando fizer sentido (ex.: Vagas, Equipe).';

  const userMsg = `${loc === 'en' ? 'Question' : 'Pergunta'}: ${q}\n\nCONTEXT:\n${context}`;

  let answer;
  try {
    answer = await openAiChatCompletion({
      messages: [{ role: 'system', content: system }, ...hist, { role: 'user', content: userMsg }],
      temperature: 0.2,
      maxTokens: 320,
    });
  } catch (e) {
    const err = new Error(e?.message || 'AI failed');
    err.code = 'HELP_ASSIST_AI_FAILED';
    throw err;
  }

  answer = String(answer || '').trim();
  if (!answer || answer.startsWith('<p>') || answer.startsWith('{')) {
    // Mock HTML/JSON from shared stub — rewrite to a short help line.
    answer = t(loc, 'panel.helpAssist.mockAnswer', { section: top[0].title });
  }

  return {
    answer: answer.slice(0, 1200),
    tab: primaryTab,
    section: top[0].section,
    source: 'llm',
    citations,
  };
}

export { HELP_SECTIONS, TAB_BY_SECTION, FAQ };
