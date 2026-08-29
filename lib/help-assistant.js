/**
 * Help assistant — product Q&A only (Guia / navigation).
 * Prefer FAQ (0 LLM tokens) then lexical retrieval + cheap chat.
 */

import { messages, normalizeLocale, t } from './i18n.js';
import { isOpenAiConfigured, openAiChatCompletion } from './openai-chat.js';
import { HELP_GUIDE_SECTIONS, TAB_BY_HELP_SECTION } from './help-sections.js';

/** @deprecated use HELP_GUIDE_SECTIONS */
const HELP_SECTIONS = HELP_GUIDE_SECTIONS;

const TAB_BY_SECTION = TAB_BY_HELP_SECTION;

/** FAQ: zero-token answers when the query matches strongly. */
const FAQ = [
  {
    id: 'talent-bank',
    patterns: [
      /banco\s+de\s+talentos/i,
      /talent\s*bank/i,
      /reaproveitar\s+candidat/i,
      /reuse\s+(a\s+)?candidat/i,
    ],
    section: 'talentBank',
  },
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
    // Product climate — not weather ("clima amanhã").
    patterns: [
      /pesquisa\s+de\s+clima/i,
      /climate\s+survey/i,
      /aba\s+clima/i,
      /\/clima\b/i,
      /\bclima\b(?!\s+(amanh[aã]|hoje|tempo|chuv|sol))/i,
    ],
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
    patterns: [/p[aá]gina\s+p[uú]blica/i, /\/j\b/i, /\/jobs\b/i, /seo/i, /public\s+page/i],
    section: 'publicVacancy',
    answerKey: 'panel.helpAssist.faqPublicPage',
  },
  {
    id: 'guide',
    patterns: [/guia/i, /\bhelp\b/i, /ajuda/i, /onde\s+(fico|est[aá]|acho)/i],
    section: 'welcome',
    answerKey: 'panel.helpAssist.faqGuide',
  },
  {
    id: 'employee-journey',
    patterns: [
      /minha\s+chegada/i,
      /jornada\s+de\s+chegada/i,
      /checklist\s+d1/i,
      /kit\s+de\s+boas[\s-]?vindas/i,
      /folha\s+de\s+acessos/i,
      /d30|d60|d90/i,
      /check[\s-]?in\s+p[oó]s/i,
      /arrival\s+journey/i,
      /my\s+arrival/i,
      /day[\s-]?1\s+checklist/i,
    ],
    section: 'b700Onboarding',
    answerKey: 'panel.helpAssist.faqEmployeeJourney',
  },
  {
    id: 'colaborador',
    patterns: [
      /\/colaborador/i,
      /espaco\s+do\s+colaborador/i,
      /login\s+do\s+colaborador/i,
      /convidar\s+acesso/i,
      /collaborator\s+(login|space)/i,
      /employee\s+portal/i,
    ],
    section: 'employeeHome',
    answerKey: 'panel.helpAssist.faqColaborador',
  },
  {
    id: '2fa',
    patterns: [
      /\b2fa\b/i,
      /dois\s+fatores/i,
      /autenticador/i,
      /google\s+authenticator/i,
      /totp/i,
      /two[\s-]?factor/i,
    ],
    section: 'access',
    answerKey: 'panel.helpAssist.faq2fa',
  },
  {
    id: 'audit',
    patterns: [/auditoria/i, /audit\s+log/i, /log\s+de\s+auditoria/i],
    section: 'access',
    answerKey: 'panel.helpAssist.faqAudit',
  },
  {
    id: 'compensation',
    patterns: [
      /lista\s+(de\s+)?salario/i,
      /salarios?\s+unificad/i,
      /unified\s+(salary|compensation)/i,
      /compensation\s+list/i,
      /tab=compensation/i,
      /remuneracao(\s+interna)?/i,
      /internal\s+compensation/i,
      /\bcompensation\s+tab\b/i,
      /historico\s+(de\s+)?salario/i,
      /salario\s+vigente/i,
      /aumento\s+salarial/i,
      /\breajuste\b/i,
      /novo\s+salario/i,
      /(registrar|cadastrar|adicionar|lancar)\s+(o\s+)?salario/i,
      /(salario|remuneracao|reajuste|aumento).{0,48}(equipe|colaborador|funcionario|contratado)/i,
      /(equipe|colaborador|funcionario|contratado).{0,48}(salario|remuneracao|reajuste|aumento)/i,
      /onde\s+.*(salario|remuneracao|reajuste).{0,40}(equipe|colaborador|funcionario|contratado|painel)?/i,
      /salary\s+(raise|increase|history|current|record)/i,
      /(add|register|log)\s+(a\s+)?salary/i,
      /(salary|compensation|raise).{0,48}(team|employee|hired)/i,
      /(team|employee|hired).{0,48}(salary|compensation|raise)/i,
      /where\s+.*(salary|compensation).{0,40}(team|employee)?/i,
    ],
    section: 'compensation',
    answerKey: 'panel.helpAssist.faqCompensation',
  },
  {
    id: 'lms',
    patterns: [/\blms\b/i, /curso\s+lms/i, /meus\s+cursos/i, /matricul/i],
    section: 'lmsBasic',
    answerKey: 'panel.helpAssist.faqLms',
  },
  {
    id: 'dashboard-cohort',
    patterns: [
      /escolher\s+(uma\s+)?empresa/i,
      /selecion(e|ar)\s+(uma\s+)?empresa/i,
      /company\s+(filter|chip|selector|required)/i,
      /vis[aã]o\s+geral.*(empresa|vazia|pedir)/i,
      /overview.*(company|empty|pick)/i,
      /comparar.*(empresa|chip)/i,
      /compare.*(company|chip)/i,
      /needsCompanyScope/i,
      /filtro\s+de\s+empresa/i,
      /escala\s+do\s+painel/i,
      /panel\s+scale/i,
    ],
    section: 'dashboardCohort',
    answerKey: 'panel.helpAssist.faqDashboardCohort',
  },
  {
    id: 'hr-score',
    patterns: [
      /hr\s*score/i,
      /score\s+hr/i,
      /n[uú]cleo\s+hr/i,
      /7\s+sinais/i,
      /seven\s+signals/i,
    ],
    section: 'b1000HrScore',
    answerKey: 'panel.helpAssist.faqHrScore',
  },
  {
    id: 'turnover-radar',
    patterns: [
      /radar\s+de\s+rotatividade/i,
      /turnover\s+radar/i,
      /risco\s+de\s+(sa[ií]da|turnover|rotatividade)/i,
      /turnover\s+risk/i,
      /varredura\s+limitada/i,
      /limited\s+scan/i,
    ],
    section: 'b1000TurnoverRadar',
    answerKey: 'panel.helpAssist.faqTurnoverRadar',
  },
  {
    id: 'job-roles',
    patterns: [
      /job\s*roles?/i,
      /\bcargos?\b/i,
      /rubrica\s+do\s+cargo/i,
      /role\s+rubric/i,
    ],
    section: 'b1000JobRoles',
    answerKey: 'panel.helpAssist.faqJobRoles',
  },
];

/**
 * Hard refuse — product-forbidden or clearly non-product domains.
 * Runs before FAQ so "diagnóstico" never hits enneagram FAQ by accident.
 * Accent-folded match (amanhã → amanha) so `\b` works on ASCII.
 */
const HARD_OUT_OF_SCOPE =
  /\b(folha(\s+de\s+pagamento)?|holerite|ponto\s+eletronico|salario\s+liquido|imposto\s+de\s+renda|clinico|diagnostico|psicolog|psiquiat|terapia|transtorno|medicament|disc\b|mbti|linkedin|curriculo|\bcv\b|lgpd\s+exclu|receita\s+de|bolo\s+de|cozinhar|futebol|bitcoin|criptomoeda|eleicao|partido\s+politico|previsao\s+do\s+tempo|weather\b|clima\s+(amanha|hoje|tempo)|piada\b|namoro|romance)\b/i;

/** Soft off-topic — refuse only when the question lacks product hints. */
const SOFT_OUT_OF_SCOPE =
  /\b(javascript|typescript|python|react\s+hook|sql\s+injection|docker\s+compose|kubernetes|algoritmo|matematica|fisica|receita|ingrediente|filme|serie|novela|esporte|politica|governo|guerra|religiao|horoscopo|signo)\b/i;

/** In-scope vocabulary (panel / assessments / people modules). */
const PRODUCT_HINT =
  /\b(30\s*team|30team|painel|dashboard|guia|ajuda|vaga|vacanc|candidato|candidate|eneagrama|enneagram|\bt[1-9]\b|motivador|motivator|pipeline|kanban|equipe|team\b|pdi|clima|climate|pulso|pulse|compat|grupo|group|rubrica|rubric|contratar|hire|hired|\/t\b|\/v\b|\/e\b|\/r\b|\/jobs|\/clima|\/pulso|\/colaborador|colaborador|collaborator|assessment|recrut|triagem|screen|1:1|one[\s-]?on[\s-]?one|retencao|retention|onboarding|beneficio|academy|sucessao|succession|turnover|hr\s*score|desempenho|performance|cargo|job\s*role|overview|analytics|ranking|fit\b|nucleo|nucleus|lms|curso|meet|chegada|arrival|2fa|totp|autenticador|auditoria|audit|remuneracao|compensation|salario|salary|aumento|reajuste|dossier|d30|d60|d90|comparar|compare|seletor\s+de\s+empresa|company\s+filter|varredura|scan\s+cap)\b/i;

function foldHelpText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function offTopicRefuse(locale, { again = false } = {}) {
  const loc = normalizeLocale(locale);
  return {
    answer: t(loc, again ? 'panel.helpAssist.offTopicAgain' : 'panel.helpAssist.offTopic'),
    tab: 'help',
    section: null,
    source: 'guard',
    citations: [],
  };
}

function historyHasPriorOffTopicRefuse(history, locale) {
  const loc = normalizeLocale(locale);
  const markers = [
    t(loc, 'panel.helpAssist.offTopic'),
    t(loc, 'panel.helpAssist.offTopicAgain'),
    t(loc, 'panel.helpAssist.outOfScope'),
  ];
  return (Array.isArray(history) ? history : []).some(
    (m) => m && m.role === 'assistant' && markers.some((mk) => String(m.content || '').includes(mk.slice(0, 40)))
  );
}

/**
 * True when the question is outside 30Team product help.
 * Product "clima" (survey) stays in scope; weather / recipes / clinical / payroll do not.
 */
export function isHelpOutOfScope(query) {
  const q = foldHelpText(query).trim();
  if (!q) return false;
  if (HARD_OUT_OF_SCOPE.test(q)) return true;
  if (SOFT_OUT_OF_SCOPE.test(q) && !PRODUCT_HINT.test(q)) return true;
  return false;
}

/** LLM drift: answer wandered into forbidden / off-topic territory. */
export function helpAnswerLooksOffTopic(answer) {
  const a = foldHelpText(answer).trim();
  if (!a) return false;
  if (HARD_OUT_OF_SCOPE.test(a)) return true;
  if (SOFT_OUT_OF_SCOPE.test(a) && !PRODUCT_HINT.test(a)) return true;
  return false;
}

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
  for (const section of HELP_GUIDE_SECTIONS) {
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
  // Accent-fold so "salário" / "remuneração" match ASCII patterns.
  const q = foldHelpText(query).trim();
  if (!q) return null;
  for (const item of FAQ) {
    if (item.patterns.some((re) => re.test(q))) {
      // Vacancy salary / public job pay ≠ internal Team compensation.
      if (
        item.id === 'compensation' &&
        /(vaga|vacanc|pretensao|\/jobs|pagina\s+publica|public\s+job)/i.test(q) &&
        !/(equipe|colaborador|funcionario|contratado|remuneracao|team|employee|hired)/i.test(q)
      ) {
        continue;
      }
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
    return offTopicRefuse(loc, { again: historyHasPriorOffTopicRefuse(history, loc) });
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
      ? 'You are the 30Team product help assistant. Answer ONLY how to use the 30Team panel (tabs, vacancies, Team, PDI, climate survey, Motivators, internal compensation, public links /t /v /jobs). Use the CONTEXT from the Guide. Be concise (max ~120 words). Hedge: "tends to / typically". Never diagnose people, invent features, discuss payroll/payslips/clinical topics, weather, recipes, politics, or general coding. IN SCOPE: internal compensation — preferred path `/dashboard?tab=compensation` (unified salary list + History drawer); also Team person sheet `&section=compensation`. OUT OF SCOPE: payroll, payslips, holerite, net pay. If the user goes off-topic, refuse in 1–2 short sentences and invite a panel how-to question — do not answer the off-topic content and do not continue that thread. If unsure about the product, say to open Help. End with one suggested dashboard tab when relevant.'
      : 'Você é o assistente de ajuda do 30Team. Responda SOMENTE como usar o painel (abas, vagas, Equipe, PDI, pesquisa de clima, Motivadores, remuneração interna, links /t /v /jobs). Use o CONTEXTO do Guia. Seja conciso (máx. ~120 palavras). Tom hedged (“tende a”). Nunca diagnostique pessoas, invente features, fale de folha/holerite/clínica, clima meteorológico, receitas, política ou programação genérica. IN-SCOPE: remuneração interna — caminho preferido `/dashboard?tab=compensation` (lista unificada + Histórico); também ficha na Equipe `&section=compensation`. FORA: folha, holerite, salário líquido. Se a pergunta sair do produto, recuse em 1–2 frases e convide a perguntar sobre o painel — sem responder o conteúdo fora de escopo e sem seguir o tema. Se não souber no produto, diga para abrir Ajuda. Termine com uma aba sugerida quando fizer sentido.';

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
    answer = t(loc, 'panel.helpAssist.mockAnswer', { section: top[0].title });
  }

  if (helpAnswerLooksOffTopic(answer)) {
    return offTopicRefuse(loc);
  }

  return {
    answer: answer.slice(0, 1200),
    tab: primaryTab,
    section: top[0].section,
    source: 'llm',
    citations,
  };
}

export { HELP_GUIDE_SECTIONS as HELP_SECTIONS, TAB_BY_HELP_SECTION as TAB_BY_SECTION, FAQ };
export { HELP_GUIDE_SECTIONS, TAB_BY_HELP_SECTION } from './help-sections.js';
