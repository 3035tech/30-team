/**
 * Landpage `/` — copy de vendas (CMO) + SEO/JSON-LD/llms.txt.
 * UI = benefícios e conversão. Detalhe técnico de rotas só em llms.txt (crawlers/IA).
 */

import { BRAND_ASSETS } from './brand.js';

export const PRODUCT_LANDING_CONTACT_EMAIL = 'contact@3035tech.com';

function serializeJsonLdForScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

export function productLandingAbsoluteUrl(path = '/') {
  const base = appBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p === '/' ? '/' : p}` : p;
}

export function productLandingOgImageUrl() {
  const base = appBaseUrl();
  const path = BRAND_ASSETS.s512 || '/brand/logo-512.png';
  return base ? `${base}${path}` : path;
}

/** Inventário técnico só para llms.txt / machines — não vai na UI de venda. */
const TECHNICAL_FOR_LLMS = {
  modules: [
    'Visão geral',
    'Equipe',
    'Compatibilidade',
    'Comparativo',
    'Grupos',
    'Liderança',
    'Vagas',
    'Motivadores',
    'Clima',
    'Empresas (admin)',
    'Usuários (admin)',
    'Guia + assistente',
    'Meu perfil',
  ],
  urls: [
    { path: '/', use: 'Product sales landing + early access' },
    { path: '/pricing', use: 'Public plans and early-access pricing (GTM)' },
    { path: '/signup', use: 'Self-serve early access sign-up' },
    { path: '/login', use: 'Manager sign-in' },
    { path: '/t/{token}', use: 'Company Enneagram-at-work profile (noindex)' },
    { path: '/v/{token}', use: 'Vacancy Enneagram-at-work profile (noindex)' },
    { path: '/assessment/motivators/{token}', use: 'Motivators assessment' },
    { path: '/jobs', use: 'Public SEO job postings' },
    { path: '/c/{slug}', use: 'Company careers page' },
    { path: '/r/{token}', use: 'Client shortlist report' },
    { path: '/clima/{token}', use: 'Anonymous climate survey' },
    { path: '/pulso/{token}', use: 'Team pulse' },
    { path: '/e/{token}', use: 'Employee light space' },
  ],
};

const COPY = {
  'pt-BR': {
    metaTitle: '30Team — Recrutamento com Eneagrama e gestão de time depois do hire | Grátis no early access',
    metaDescription:
      'Pare de escolher entre ATS sem conversa e teste de personalidade que vira PDF. 30Team une funil de vagas, Eneagrama aplicado ao trabalho, Motivadores, briefing, 1:1, clima e jornada pós-contratação. Early access sem custo — veja planos em /pricing. 3035Tech.',
    metaKeywords: [
      'software RH',
      'recrutamento com perfil',
      'fit de time',
      'ATS com people',
      'Eneagrama no trabalho',
      'Motivadores',
      '1:1 gestão',
      'clima organizacional',
      'onboarding',
      '30Team',
      '3035Tech',
      'early access RH',
    ].join(', '),
    earlyBadge: 'Piloto aberto · sem custo para primeiros parceiros',
    heroTitle: 'Contrate com clareza. Gerencie o time depois — no mesmo lugar.',
    heroLead:
      'O 30Team é a camada que falta entre o funil de vagas e a conversa real de gestão: teste de perfil (Eneagrama no trabalho), Motivadores, briefing para entrevista e 1:1, clima e acompanhamento leve após contratar.',
    heroBody:
      'Feito para RH e liderança que já usam ATS ou planilha — e ainda assim decidem “no feeling” ou com um PDF que ninguém abre na segunda semana.',
    heroFoot: 'Já é cliente? Entre no painel. Ainda não? Garanta o early access gratuito — ou veja o que está incluído:',
    navLogin: 'Já sou cliente',
    navPricing: 'Planos',
    navEarly: 'Quero o piloto grátis',
    ctaEarly: 'Quero early access gratuito →',
    ctaLogin: 'Já tenho acesso',
    tocLabel: 'Nesta página',
    audienceLabel: 'Para quem',
    audienceTitle: 'RH, direção e gestores que contratam e acompanham pessoas',
    audienceItems: [
      'Times que usam ATS (Gupy, Greenhouse e similares) e sentem falta de Eneagrama / teste de perfil ligado à vaga e ao time.',
      'Empresas que compram teste de personalidade (DISC e similares) e recebem PDF — sem briefing, sem 1:1, sem pós-hire.',
      'Lideranças que querem hipóteses de gestão (“tende a…”) em vez de rótulo ou “diagnóstico”.',
    ],
    problemLabel: 'A dor',
    problemTitle: 'Três produtos. Zero continuidade.',
    problems: [
      {
        title: 'ATS organiza o funil',
        body: 'Currículo, estágio, calendário. Ótimo para volume — fraco para explicar fit com a vaga e com o time que já existe.',
      },
      {
        title: 'Teste vira arquivo',
        body: 'DISC e baterias avulsas geram relatório bonito. Na entrevista e no 1:1, o contexto já se perdeu.',
      },
      {
        title: 'Depois do hire, reinicia',
        body: 'Onboarding, clima e retenção moram em outra ferramenta. A pessoa contratada “nasce de novo” no sistema.',
      },
    ],
    wedgeLabel: 'O gancho',
    wedgeTitle: 'Uma pessoa. Uma história. Do candidato ao colaborador.',
    wedgeBody:
      'No 30Team a mesma pessoa carrega o Eneagrama (personalidades no trabalho), Motivadores, ranking da vaga, briefing, 1:1, PDI, check-ins e clima. Você não “integra PDF”: você decide e acompanha com o mesmo fio.',
    outcomesLabel: 'O que muda no dia a dia',
    outcomesTitle: 'Resultados que o cliente sente',
    outcomes: [
      {
        title: 'Decisão de hire mais rápida e defendável',
        body: 'Rubrica por vaga, ranking de aderência do perfil e briefing com perguntas e faça/evite — prontos para a banca.',
      },
      {
        title: 'Gestor preparado na conversa',
        body: 'Hipóteses de gestão + registro de 1:1 + prep do colaborador. Menos reunião genérica, mais próximos passos.',
      },
      {
        title: 'Menos “sumiu depois que contratou”',
        body: 'Checklist de chegada, check-ins nos primeiros meses e PDI leve na mesma jornada — com alertas de retenção acionáveis.',
      },
      {
        title: 'Uma ferramenta a menos na stack',
        body: 'Funil + teste de perfil + gestão leve. Complementa o ATS; não obriga a trocar tudo no dia 1.',
      },
    ],
    pillarsLabel: 'O que você leva',
    pillarsTitle: 'Tudo o que importa — em linguagem de negócio',
    pillarsLead: 'Funcionalidades reais do produto, embaladas pelo valor para RH e liderança.',
    pillars: [
      {
        id: 'recrutar',
        title: 'Recrutamento com fit',
        items: [
          'Vagas e pipeline kanban até contratar ou arquivar',
          'Cargos com rubrica T1-T9 reutilizável — crie a vaga já com o perfil ideal definido',
          'Rubrica de perfil por vaga + ranking de aderência explicável',
          'Scorecard de entrevista, notas ricas e pool de talentos',
          'Análise demissional: o que corrigir na seleção com base em motivos de saída reais',
          'Página pública de vagas para atrair candidatos',
          'Relatório shortlist para o cliente (parecer + PDF)',
          'Oferta mínima (salário / status) no funil',
          'Métricas de efetividade: time-to-hire, retenção, fit contratados vs pool',
        ],
      },
      {
        id: 'perfil',
        title: 'Eneagrama e Motivadores que viram ação',
        items: [
          'Teste de perfil inspirado no Eneagrama — personalidades no trabalho (não é diagnóstico clínico)',
          'Motivadores: o que energiza e o que drena no dia a dia',
          'HR Score: índice consolidado de sinais comportamentais (0-100) com predições de turnover e lacunas PDI',
          'Radar de rotatividade: monitoramento multi-sinal de risco de saída com ações sugeridas',
          'Briefing de decisão + PDF one-pager para a entrevista',
          'Compatibilidade e composição do time (sinergia / tensão)',
          'Visão geral com mapa do time e fila do que precisa atenção',
          'Analytics: tendências temporais, comparativos entre áreas, alertas de anomalias',
        ],
      },
      {
        id: 'time',
        title: 'Gestão e clima',
        items: [
          'Equipe unificada: candidatos e colaboradores',
          '1:1 com hipóteses e próximos passos',
          'Avaliação de desempenho leve: metas + outcomes que geram PDI automaticamente',
          'Plano de sucessão: papéis críticos, sucessores e prontidão baseada em score e liderança',
          'Cultura organizacional: leitura hedged (clima + mix T1-T9 + pulso) versus valores declarados',
          'Pesquisa de clima anônima com médias e temas',
          'Pulso rápido de grupos e digest semanal para o gestor',
          'Espaço leve para o colaborador preparar a conversa',
        ],
      },
      {
        id: 'jornada',
        title: 'Pós-contratação de verdade',
        items: [
          'Checklist de chegada no primeiro dia',
          'Check-ins nos primeiros 30, 60 e 90 dias',
          'PDI com progresso, ciclo e responsável — linkado ao catálogo de recursos de desenvolvimento',
          'Academia leve: ações e trilhas de desenvolvimento que o PDI pode apontar (sem LMS complexo)',
          'Catálogo de benefícios da empresa para contexto de retenção e oferta',
          'Alertas de retenção com plano e revisão',
          'Jornada contínua na ficha da pessoa',
        ],
      },
    ],
    compareLabel: 'Posicionamento',
    compareTitle: 'Onde o 30Team ganha (e onde não compete)',
    compareLead: 'Sem atacar marcas: o cliente escolhe a categoria certa.',
    compareRows: [
      {
        them: 'ATS clássico (ex.: Gupy, Greenhouse)',
        gap: 'Forte em volume, estágio e carreiras.',
        us: '30Team adiciona Eneagrama + decisão + pós-hire no mesmo fio da pessoa.',
      },
      {
        them: 'Teste avulso / DISC / PDF',
        gap: 'Diagnóstico ou laudo que não entra no fluxo.',
        us: 'O teste de perfil vira briefing, ranking da vaga e roteiro de 1:1.',
      },
      {
        them: 'Só engajamento / clima',
        gap: 'Mede sentimento depois — sem ligação com o hire.',
        us: 'Clima e pulso entram depois do mesmo perfil que contratou.',
      },
      {
        them: 'HRIS / LMS completo',
        gap: 'Admissão, folha, trilha longa.',
        us: 'Não substitui: é a camada leve de perfil e conversa.',
      },
    ],
    howLabel: 'Como começa',
    howTitle: 'Três passos até o valor',
    steps: [
      {
        n: '01',
        title: 'Ative o piloto',
        body: 'Fale com a 3035Tech, receba acesso de gestor e configure a empresa.',
      },
      {
        n: '02',
        title: 'Rode uma vaga ou o time',
        body: 'Convide pessoas por link (sem conta para candidato). Veja ranking e briefing na mesma semana.',
      },
      {
        n: '03',
        title: 'Feche o ciclo',
        body: 'Contrate com contexto e acompanhe chegada → check-ins → 1:1 — sem mudar de ferramenta.',
      },
    ],
    trustLabel: 'Confiança',
    trustTitle: 'Sério com linguagem — e transparente no limite',
    trustItems: [
      'Hipóteses de gestão (“tende a”), nunca diagnóstico clínico.',
      'Não substitui entrevista técnica nem avaliação de saúde.',
      'Eneagrama no trabalho — não é DISC nem “laudo” de personalidade clínica.',
      'Candidatos não criam conta: entram pelo link que o RH envia.',
      'Dados de cada empresa ficam isolados.',
    ],
    faqLabel: 'Dúvidas que travam a compra',
    faqTitle: 'FAQ comercial',
    faqs: [
      {
        q: 'É de graça mesmo?',
        a: 'Sim nesta fase: early access sem custo para primeiros parceiros que entram no piloto com a 3035Tech. Depois do piloto, a conversa comercial é transparente — sem pegadinha no site.',
      },
      {
        q: 'Preciso abandonar meu ATS?',
        a: 'Não. O 30Team cobre funil e perfil no mesmo produto, mas a proposta de valor é a camada de decisão e pós-hire. Muitos times começam paralelo ao ATS atual.',
      },
      {
        q: 'É mais um teste de personalidade?',
        a: 'Não. É teste de perfil (Eneagrama no trabalho) + Motivadores ligados a vaga, time, entrevista e 1:1. Sem diagnóstico clínico.',
      },
      {
        q: 'Quanto tempo até ver valor?',
        a: 'Na primeira vaga ou no primeiro lote do time: ranking, briefing e uma conversa de 1:1 já mostram o diferencial frente ao PDF.',
      },
      {
        q: 'Como peço acesso?',
        a: `Clique em “Quero early access gratuito” ou escreva para ${PRODUCT_LANDING_CONTACT_EMAIL} com empresa e papel (RH/gestão).`,
      },
    ],
    earlyLabel: 'Oferta',
    earlyTitle: 'Entre no piloto agora — sem custo',
    earlyBody:
      'Vagas limitadas de early access para empresas que querem validar recrutamento + gestão no mesmo fluxo. Você usa de verdade; nós priorizamos o roadmap com o que dói no seu RH.',
    earlyProof: [
      'Sem cartão · sem trial escondido',
      'Onboarding com a 3035Tech',
      'pt-BR e inglês no painel',
    ],
    earlyContact: 'Ou escreva para',
    earlyMailSubject: '30Team — quero early access gratuito',
    earlyMailBody:
      'Olá! Quero o early access gratuito do 30Team.\n\nEmpresa:\nNome:\nPapel (RH / gestão / direção):\nTamanho aproximado do time:\nPrincipal dor hoje (ATS / teste PDF / pós-hire):\n',
    closeTitle: 'Pronto para vender o “sim” interno?',
    closeBody:
      'Mostre ao time um fluxo que vai do candidato ao check-in — sem mais uma planilha. O early access está aberto.',
    footerBrand: '30Team · 3035Tech',
    footerPricing: 'Planos e preços',
    footerLegal: 'Software de RH com Eneagrama, Motivadores e recrutamento — hipóteses de gestão, não diagnóstico.',
    skipToContent: 'Ir para o conteúdo',
  },
  en: {
    metaTitle: '30Team — Hiring with Enneagram profile and manage the team after — free early access',
    metaDescription:
      'Stop choosing between an ATS with no conversation and a personality test that becomes a PDF. 30Team connects vacancy funnel, Enneagram-at-work profile, Motivators, interview brief, 1:1s, climate, and light post-hire. Free early access — see plans at /pricing. 3035Tech.',
    metaKeywords: [
      'HR software',
      'hiring with Enneagram profile',
      'team fit',
      'ATS plus people',
      'Motivators assessment',
      '1:1 management',
      'employee climate',
      'onboarding check-ins',
      '30Team',
      '3035Tech',
      'early access HR',
    ].join(', '),
    earlyBadge: 'Pilot open · no cost for first partners',
    heroTitle: 'Hire with clarity. Manage the team after — in one place.',
    heroLead:
      '30Team is the missing layer between the vacancy funnel and real management conversations: Enneagram-based work profile, Motivators, interview/1:1 brief, climate, and light follow-up after hire.',
    heroBody:
      'Built for HR and leaders who already use an ATS or spreadsheet — and still decide on gut feel or a PDF nobody opens in week two.',
    heroFoot: 'Already a customer? Sign in. Not yet? Claim free early access — or see what is included:',
    navLogin: 'I am a customer',
    navPricing: 'Pricing',
    navEarly: 'Free pilot',
    ctaEarly: 'Get free early access →',
    ctaLogin: 'I already have access',
    tocLabel: 'On this page',
    audienceLabel: 'Who it is for',
    audienceTitle: 'HR, leadership, and managers who hire and coach people',
    audienceItems: [
      'Teams on ATS tools (Gupy, Greenhouse, and peers) that lack Enneagram / personality-at-work profile tied to role and team.',
      'Companies that buy personality tests (DISC and peers) and get a PDF — no brief, no 1:1, no post-hire.',
      'Leaders who want management hypotheses (“tends to…”) instead of labels or “diagnosis”.',
    ],
    problemLabel: 'The pain',
    problemTitle: 'Three products. Zero continuity.',
    problems: [
      {
        title: 'ATS runs the funnel',
        body: 'Resumes, stages, calendar. Great for volume — weak at explaining fit to the role and the team already there.',
      },
      {
        title: 'The test becomes a file',
        body: 'DISC and standalone batteries look polished. By the interview and 1:1, context is gone.',
      },
      {
        title: 'After hire, start over',
        body: 'Onboarding, climate, and retention live elsewhere. The hired person is “born again” in another system.',
      },
    ],
    wedgeLabel: 'The hook',
    wedgeTitle: 'One person. One story. From candidate to employee.',
    wedgeBody:
      'In 30Team the same person carries the Enneagram (personalities at work), Motivators, vacancy ranking, brief, 1:1s, plans, check-ins, and climate. You do not “integrate a PDF” — you decide and follow through on one thread.',
    outcomesLabel: 'What changes',
    outcomesTitle: 'Outcomes customers feel',
    outcomes: [
      {
        title: 'Faster, defensible hire decisions',
        body: 'Per-role rubric, explainable profile fit ranking, and interview brief with do/avoid — ready for the panel.',
      },
      {
        title: 'Managers ready for the conversation',
        body: 'Management hypotheses + 1:1 log + employee prep. Fewer generic meetings, clearer next steps.',
      },
      {
        title: 'Less “vanished after hire”',
        body: 'Arrival checklist, early-months check-ins, and light development plans — with actionable retention alerts.',
      },
      {
        title: 'One less tool in the stack',
        body: 'Funnel + profile test + light people ops. Complements your ATS; no forced rip-and-replace on day one.',
      },
    ],
    pillarsLabel: 'What you get',
    pillarsTitle: 'Real product — sold as business value',
    pillarsLead: 'Capabilities phrased for HR and leadership buyers.',
    pillars: [
      {
        id: 'recruit',
        title: 'Hiring with fit',
        items: [
          'Vacancies and kanban pipeline through hire or archive',
          'Job roles with reusable T1-T9 rubric — create vacancies with ideal profile already defined',
          'Per-role profile rubric + explainable fit ranking',
          'Interview scorecard, rich notes, talent pool',
          'Exit analysis: what to fix in hiring based on real departure reasons',
          'Public job pages to attract candidates',
          'Client shortlist report (opinion + PDF)',
          'Minimal offer tracking in the funnel',
        ],
      },
      {
        id: 'profile',
        title: 'Enneagram and Motivators that drive action',
        items: [
          'Enneagram-inspired profile test — personalities at work (not a clinical diagnosis)',
          'Motivators: what energizes and drains day to day',
          'HR Score: consolidated behavioral signals (0-100) with turnover predictions and PDI gaps',
          'Turnover radar: multi-signal monitoring of departure risk with suggested actions',
          'Decision brief + one-pager PDF for interviews',
          'Team compatibility and composition (synergy / tension)',
          'Overview with team map and attention queue',
        ],
      },
      {
        id: 'team',
        title: 'Management and climate',
        items: [
          'Unified team: candidates and employees',
          '1:1s with hypotheses and next steps',
          'Lightweight performance reviews: goals + outcomes that auto-generate PDI items',
          'Succession planning: critical roles, successors, and readiness based on score and leadership',
          'Organizational culture: hedged reading (climate + T1-T9 mix + pulse) versus declared values',
          'Anonymous climate surveys with themes',
          'Group pulse and weekly manager digest',
          'Light employee space to prep the conversation',
        ],
      },
      {
        id: 'journey',
        title: 'Real post-hire',
        items: [
          'Day-one arrival checklist',
          'Check-ins in the first 30, 60, and 90 days',
          'Development plans with progress, cycle, owner — linked to learning resources catalog',
          'Lightweight academy: development actions and tracks that PDI can reference (no complex LMS)',
          'Company benefits catalog for retention and offer context',
          'Retention alerts with plan and review',
          'Continuous journey on the person record',
        ],
      },
    ],
    compareLabel: 'Positioning',
    compareTitle: 'Where 30Team wins (and where it does not compete)',
    compareLead: 'No brand bashing — help the buyer pick the right category.',
    compareRows: [
      {
        them: 'Classic ATS (e.g. Gupy, Greenhouse)',
        gap: 'Strong on volume, stages, careers.',
        us: '30Team adds Enneagram + decision + post-hire on the same person thread.',
      },
      {
        them: 'Standalone test / DISC / PDF',
        gap: 'A report that never enters the workflow.',
        us: 'The profile test becomes brief, vacancy ranking, and 1:1 script.',
      },
      {
        them: 'Engagement / climate only',
        gap: 'Measures feeling later — disconnected from hire.',
        us: 'Climate and pulse follow the same profile you hired on.',
      },
      {
        them: 'Full HRIS / LMS',
        gap: 'Payroll, admissions, long learning tracks.',
        us: 'Does not replace them: light profile and conversation layer.',
      },
    ],
    howLabel: 'How it starts',
    howTitle: 'Three steps to value',
    steps: [
      {
        n: '01',
        title: 'Start the pilot',
        body: 'Talk to 3035Tech, get manager access, set up the company.',
      },
      {
        n: '02',
        title: 'Run a vacancy or the team',
        body: 'Invite people by link (no candidate account). See ranking and brief within a week.',
      },
      {
        n: '03',
        title: 'Close the loop',
        body: 'Hire with context and follow arrival → check-ins → 1:1 — without switching tools.',
      },
    ],
    trustLabel: 'Trust',
    trustTitle: 'Serious language — clear limits',
    trustItems: [
      'Management hypotheses (“tends to”), never a clinical diagnosis.',
      'Does not replace technical interviews or health assessment.',
      'Enneagram at work — not DISC and not a clinical personality report.',
      'Candidates do not create accounts — they use the link HR sends.',
      'Each company’s data stays isolated.',
    ],
    faqLabel: 'Buying questions',
    faqTitle: 'Commercial FAQ',
    faqs: [
      {
        q: 'Is it really free?',
        a: 'Yes in this phase: early access at no cost for first partners in the 3035Tech pilot. After the pilot, commercial terms are explicit — no bait on the site.',
      },
      {
        q: 'Do I have to drop my ATS?',
        a: 'No. 30Team includes funnel and profile, but the core value is decision and post-hire. Many teams start alongside their current ATS.',
      },
      {
        q: 'Is this another personality test?',
        a: 'No. An Enneagram-at-work profile test + Motivators tied to role, team, interview, and 1:1 — not a clinical diagnosis.',
      },
      {
        q: 'How fast to value?',
        a: 'On the first vacancy or first team batch: ranking, brief, and one 1:1 already beat a PDF.',
      },
      {
        q: 'How do I get access?',
        a: `Click “Get free early access” or email ${PRODUCT_LANDING_CONTACT_EMAIL} with company and role (HR/manager).`,
      },
    ],
    earlyLabel: 'Offer',
    earlyTitle: 'Join the pilot now — no cost',
    earlyBody:
      'Limited early-access seats for companies that want hiring + management in one flow. You use it for real; we prioritize the roadmap with what hurts your HR.',
    earlyProof: ['No card · no hidden trial', 'Onboarding with 3035Tech', 'pt-BR and English in the panel'],
    earlyContact: 'Or write to',
    earlyMailSubject: '30Team — free early access',
    earlyMailBody:
      'Hi! I want free early access to 30Team.\n\nCompany:\nName:\nRole (HR / manager / leadership):\nApprox. team size:\nMain pain today (ATS / PDF test / post-hire):\n',
    closeTitle: 'Ready to win the internal “yes”?',
    closeBody:
      'Show your team a flow from candidate to check-in — without another spreadsheet. Early access is open.',
    footerBrand: '30Team · 3035Tech',
    footerPricing: 'Plans and pricing',
    footerLegal: 'HR software with Enneagram, Motivators, and hiring — management hypotheses, not diagnosis.',
    skipToContent: 'Skip to content',
  },
};

export function getProductLandingCopy(locale) {
  const loc = locale === 'en' ? 'en' : 'pt-BR';
  return COPY[loc];
}

export function buildProductLandingJsonLd(locale = 'pt-BR') {
  const copy = getProductLandingCopy(locale);
  const url = productLandingAbsoluteUrl('/');
  const logo = productLandingOgImageUrl();
  const inLanguage = locale === 'en' ? 'en' : 'pt-BR';

  const organization = {
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: '3035Tech',
    url: 'https://3035tech.com',
    email: PRODUCT_LANDING_CONTACT_EMAIL,
    logo: { '@type': 'ImageObject', url: logo },
  };

  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${url}#software`,
    name: '30Team',
    alternateName: ['30team', '30 Team'],
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'HumanResourcesApplication',
    operatingSystem: 'Web',
    inLanguage: ['pt-BR', 'en'],
    description: copy.metaDescription,
    url,
    image: logo,
    publisher: { '@id': `${url}#organization` },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: copy.earlyTitle,
      availability: 'https://schema.org/InStock',
      url,
    },
    featureList: copy.pillars.flatMap((p) => p.items),
    audience: {
      '@type': 'Audience',
      audienceType: 'HR managers and company leadership',
    },
  };

  const webPage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: copy.metaTitle,
    description: copy.metaDescription,
    inLanguage,
    isPartOf: { '@type': 'WebSite', '@id': `${url}#website`, name: '30Team', url },
    about: { '@id': `${url}#software` },
    primaryImageOfPage: { '@type': 'ImageObject', url: logo },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#produto-hero', '#gancho', '#oferta', '#faq'],
    },
  };

  const faqPage = {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: copy.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return serializeJsonLdForScript({
    '@context': 'https://schema.org',
    '@graph': [organization, software, webPage, faqPage],
  });
}

export function buildProductLlmsTxt() {
  const pt = getProductLandingCopy('pt-BR');
  const en = getProductLandingCopy('en');
  const base = appBaseUrl() || 'https://team.3035service.com';
  const lines = [
    '# 30Team',
    `> ${pt.metaDescription}`,
    '',
    `Canonical: ${base}/`,
    `Publisher: 3035Tech`,
    `Contact: ${PRODUCT_LANDING_CONTACT_EMAIL}`,
    `Offer: free early access pilot (no cost for first partners)`,
    `Languages: pt-BR, en`,
    '',
    '## Sales positioning',
    '- Category: Enneagram-at-work profile + hiring + light post-hire people ops (not full ATS replacement, not clinical DISC).',
    '- Competitors / alternatives: classic ATS (Gupy, Greenhouse…), standalone profile/DISC PDFs, climate-only tools, HRIS/LMS.',
    '- Wedge: one person record from candidate to employee (funnel → brief → 1:1 → D1/check-ins/PDI/climate).',
    '',
    '## Summary (pt-BR)',
    pt.heroLead,
    pt.heroBody,
    '',
    '## Summary (en)',
    en.heroLead,
    en.heroBody,
    '',
    '## Capabilities (buyer language)',
  ];
  for (const pillar of pt.pillars) {
    lines.push(`### ${pillar.title}`);
    for (const item of pillar.items) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('## Dashboard modules (product)');
  for (const m of TECHNICAL_FOR_LLMS.modules) lines.push(`- ${m}`);
  lines.push('', '## Public routes (engineering; not shown on sales UI)');
  for (const u of TECHNICAL_FOR_LLMS.urls) lines.push(`- ${u.path} — ${u.use}`);
  lines.push('', '## FAQ (pt-BR)');
  for (const f of pt.faqs) {
    lines.push(`### ${f.q}`);
    lines.push(f.a);
    lines.push('');
  }
  lines.push('## FAQ (en)');
  for (const f of en.faqs) {
    lines.push(`### ${f.q}`);
    lines.push(f.a);
    lines.push('');
  }
  lines.push('## Links');
  lines.push(`- Sales landing: ${base}/`);
  lines.push(`- Pricing / plans: ${base}/pricing`);
  lines.push(`- Early access signup: ${base}/signup`);
  lines.push(`- Manager login: ${base}/login`);
  lines.push(`- Public jobs: ${base}/j`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function buildProductLandingMetadata(locale = 'pt-BR') {
  const copy = getProductLandingCopy(locale);
  const url = productLandingAbsoluteUrl('/');
  const ogImage = productLandingOgImageUrl();
  const base = appBaseUrl();

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { absolute: copy.metaTitle },
    description: copy.metaDescription,
    keywords: copy.metaKeywords,
    authors: [{ name: '3035Tech' }],
    creator: '3035Tech',
    publisher: '3035Tech',
    category: 'business',
    alternates: {
      canonical: url,
      languages: { 'pt-BR': url, en: url, 'x-default': url },
      types: { 'text/plain': productLandingAbsoluteUrl('/llms.txt') },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: copy.metaTitle,
      description: copy.metaDescription,
      siteName: '30Team',
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      alternateLocale: locale === 'en' ? ['pt_BR'] : ['en_US'],
      images: [{ url: ogImage, width: 512, height: 512, alt: '30Team' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.metaTitle,
      description: copy.metaDescription,
      images: [ogImage],
    },
  };
}
