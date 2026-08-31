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
    'Cargos',
    'Motivadores',
    'Clima',
    'Ouvidoria',
    'Avaliações / 9Box / calibração',
    'Sucessão',
    'Análise demissional',
    'OKRs',
    'LMS (cursos)',
    'Academia / recursos de aprendizado',
    'Benefícios',
    'Mural / feed',
    'DP (ficha, docs, férias)',
    'Remuneração interna',
    'Empresas (admin)',
    'Usuários (admin)',
    'Guia + assistente',
    'Meu perfil',
    'Hub colaborador (/employee)',
  ],
  urls: [
    { path: '/', use: 'Product sales landing + early access' },
    { path: '/pricing', use: 'Public plans and early-access pricing (GTM)' },
    { path: '/signup', use: 'Self-serve early access sign-up' },
    { path: '/login', use: 'Manager sign-in' },
    { path: '/employee', use: 'Collaborator hub (password session)' },
    { path: '/employee/login', use: 'Collaborator sign-in' },
    { path: '/employee/lms', use: 'Collaborator LMS courses' },
    { path: '/employee/dp', use: 'Collaborator HR ops (profile, docs, leave)' },
    { path: '/employee/time-clock', use: 'Collaborator web time clock' },
    { path: '/t/{token}', use: 'Company Enneagram-at-work profile (noindex)' },
    { path: '/v/{token}', use: 'Vacancy Enneagram-at-work profile (noindex)' },
    { path: '/assessment/motivators/{token}', use: 'Motivators assessment' },
    { path: '/jobs', use: 'Public SEO job postings' },
    { path: '/c/{slug}', use: 'Company careers page' },
    { path: '/r/{token}', use: 'Client shortlist report' },
    { path: '/clima/{token}', use: 'Anonymous climate survey' },
    { path: '/pulso/{token}', use: 'Team pulse' },
    { path: '/ouvidoria/{token}', use: 'Whistleblowing / speak-up channel' },
    { path: '/e/{token}', use: 'Employee light space (token, no password)' },
  ],
};

const COPY = {
  'pt-BR': {
    metaTitle: '30Team: Recrutamento com Eneagrama e gestão de time depois do hire | Grátis no early access',
    metaDescription:
      'Software houses e agências de produto: funil com Eneagrama no trabalho e Motivadores, 1:1, OKRs, LMS, hub do colaborador, chegada D1–D90 e DP leve. Early access sem custo. 3035Tech.',
    metaKeywords: [
      'software RH',
      'recrutamento com perfil',
      'fit de time',
      'ATS com people',
      'Eneagrama no trabalho',
      'Motivadores',
      '1:1 gestão',
      'OKR',
      'LMS corporativo',
      'portal colaborador',
      'clima organizacional',
      'onboarding',
      '30Team',
      '3035Tech',
      'early access RH',
    ].join(', '),
    earlyBadge: 'Piloto aberto · sem custo para primeiros parceiros',
    heroTitle: 'Contrate o tempo todo sem decidir no feeling.',
    heroLead:
      'O 30Team é para software houses, agências e times de produto que abrem vaga toda semana: Eneagrama no trabalho e Motivadores no funil, briefing na entrevista, e o mesmo fio depois do hire.',
    heroBody:
      'Pare de perder a pessoa na segunda semana. Ranking, 1:1, hub do colaborador, LMS, OKRs, chegada e clima no mesmo lugar. Sem laudo. Sem PDF que some.',
    heroFoot: 'Já é cliente? Entre como gestão/RH ou colaborador. Ainda não? Garanta o early access gratuito. Ou veja o que está incluído:',
    navLogin: 'Gestão / RH',
    navEmployee: 'Colaborador',
    navPricing: 'Planos',
    navEarly: 'Quero o piloto grátis',
    ctaEarly: 'Quero early access gratuito →',
    ctaLogin: 'Acesso gestão / RH',
    ctaEmployee: 'Sou colaborador',
    tocLabel: 'Nesta página',
    audienceLabel: 'Para quem',
    audienceTitle: 'RH, direção e gestores que contratam e acompanham pessoas',
    audienceItems: [
      'Times que usam ATS (Gupy, Greenhouse e similares) e sentem falta de Eneagrama / teste de perfil ligado à vaga e ao time.',
      'Empresas que compram teste de perfil avulso e recebem PDF. Sem briefing, sem 1:1, sem pós-hire nem hub do colaborador.',
      'Lideranças que querem hipóteses de gestão (“tende a…”) em vez de rótulo ou “diagnóstico”.',
    ],
    problemLabel: 'A dor',
    problemTitle: 'Três produtos. Zero continuidade.',
    problems: [
      {
        title: 'ATS organiza o funil',
        body: 'Currículo, estágio, calendário. Ótimo para volume. Fraco para explicar fit com a vaga e com o time que já existe.',
      },
      {
        title: 'Teste vira arquivo',
        body: 'Baterias avulsas geram relatório bonito. Na entrevista e no 1:1, o contexto já se perdeu.',
      },
      {
        title: 'Depois do hire, reinicia',
        body: 'Onboarding, LMS, OKRs, clima e retenção moram em outras ferramentas. A pessoa contratada “nasce de novo” no sistema.',
      },
    ],
    wedgeLabel: 'O gancho',
    wedgeTitle: 'Uma pessoa. Uma história. Do candidato ao colaborador.',
    wedgeBody:
      'No 30Team a mesma pessoa carrega o Eneagrama (personalidades no trabalho), Motivadores, ranking da vaga, briefing, 1:1, PDI, OKRs, LMS, check-ins, clima e DP leve. Você não “integra PDF”: você decide e acompanha com o mesmo fio.',
    outcomesLabel: 'O que muda no dia a dia',
    outcomesTitle: 'Resultados que o cliente sente',
    outcomes: [
      {
        title: 'Decisão de hire mais rápida e defendável',
        body: 'Rubrica por vaga, ranking de aderência do perfil e briefing com perguntas e faça/evite. Prontos para a banca.',
      },
      {
        title: 'Gestor preparado na conversa',
        body: 'Hipóteses de gestão + registro de 1:1 + prep do colaborador. Menos reunião genérica, mais próximos passos.',
      },
      {
        title: 'Menos “sumiu depois que contratou”',
        body: 'Hub do colaborador, chegada D1–D90, LMS com progresso, OKRs atribuídos e PDI na mesma jornada. Com alertas de retenção acionáveis.',
      },
      {
        title: 'Uma ferramenta a menos na stack',
        body: 'Funil + perfil + gestão leve + LMS/DP leves. Complementa o ATS; não obriga a trocar folha ou HRIS no dia 1.',
      },
    ],
    pillarsLabel: 'O que você leva',
    pillarsTitle: 'Tudo o que importa: em linguagem de negócio',
    pillarsLead: 'Funcionalidades reais do produto, embaladas pelo valor para RH e liderança.',
    pillars: [
      {
        id: 'recrutar',
        title: 'Recrutamento com fit',
        items: [
          'Vagas e pipeline kanban até contratar ou arquivar',
          'Cargos com rubrica T1-T9 reutilizável: crie a vaga já com o perfil ideal definido',
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
          'Teste de perfil inspirado no Eneagrama: personalidades no trabalho (não é diagnóstico clínico)',
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
        title: 'Gestão, desempenho e clima',
        items: [
          'Equipe unificada: candidatos e colaboradores',
          '1:1 com hipóteses e próximos passos',
          'OKRs leves (empresa / time / pessoa) com atividades atribuídas ao colaborador',
          'Avaliação de desempenho: metas, outcomes, 180°/360° opcional e calibração',
          'Matriz 9Box (desempenho × potencial) com linguagem hedged',
          'Feedback contínuo entre pares e mural da empresa com kudos',
          'Plano de sucessão: papéis críticos, sucessores e prontidão',
          'Pesquisa de clima anônima, pulso de grupos e digest semanal',
          'Canal de ouvidoria / denúncias com triagem pelo RH',
        ],
      },
      {
        id: 'jornada',
        title: 'Pós-contratação e aprendizado',
        items: [
          'Hub do colaborador com login (senha): tarefas, jornada, PDI, OKRs e pesquisas',
          'Timeline “Minha chegada”: kit, acessos, calls e check-ins D30/D60/D90',
          'LMS com cursos, player, progresso, quiz e certificado',
          'Academia / catálogo de recursos que o PDI pode apontar',
          'PDI com progresso, ciclo e responsável',
          'Catálogo de benefícios da empresa',
          'Alertas de retenção com plano e revisão',
          'Jornada contínua na ficha da pessoa',
        ],
      },
      {
        id: 'dp',
        title: 'DP leve no mesmo login',
        items: [
          'Ficha do colaborador: endereço, CPF e contato de emergência',
          'Checklist de documentos com upload pelo colaborador',
          'Pedidos de férias / afastamento com saldo e anexos',
          'Ponto web (entrada / saída) no hub do colaborador',
          'Remuneração interna e remuneração variável (proposta / aprovação): sem folha nem holerite',
          'Não substitui eSocial / folha completa: cobre o operacional leve no mesmo tenant',
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
        them: 'Teste avulso / PDF de perfil',
        gap: 'Relatório que não entra no fluxo de RH.',
        us: 'O teste de perfil vira briefing, ranking da vaga e roteiro de 1:1.',
      },
      {
        them: 'Só engajamento / clima',
        gap: 'Mede sentimento depois: sem ligação com o hire.',
        us: 'Clima, pulso, OKRs e LMS entram depois do mesmo perfil que contratou.',
      },
      {
        them: 'HRIS / folha completa',
        gap: 'Admissão fiscal, eSocial, holerite.',
        us: 'Não substitui: LMS e DP leves + hub do colaborador no mesmo produto de perfil.',
      },
    ],
    builderLabel: 'Origem',
    builderTitle: 'Por que a 3035Tech construiu o 30Team',
    builderParagraphs: [
      'O 30Team nasceu dentro da 3035Tech: uma empresa de engenharia de software que contrata e monta times o tempo todo. A dor era nossa: decidir no feeling, receber PDF que ninguém reabre, e reiniciar a história da pessoa depois do hire.',
      'Usamos o produto de verdade. Contratamos com ele, treinamos gente via 3035TEACH e gerimos o time no mesmo fluxo. Não é pitch de PowerPoint: é ferramenta que sobreviveu ao RH interno antes de virar oferta.',
      'A 3035Tech fica como fiadora: engenharia séria por trás. O protagonista da página, e do dia a dia, continua sendo o 30Team.',
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
        body: 'Contrate com contexto e acompanhe chegada → hub do colaborador → 1:1 / OKRs / LMS. Sem mudar de ferramenta.',
      },
    ],
    trustLabel: 'Confiança',
    trustTitle: 'Sério com linguagem: e transparente no limite',
    trustItems: [
      'Hipóteses de gestão (“tende a”), nunca diagnóstico clínico.',
      'Não substitui entrevista técnica nem avaliação de saúde.',
      'Eneagrama no trabalho: perfil de estilo de trabalho, não laudo clínico.',
      'Candidatos não criam conta: entram pelo link que o RH envia. Colaboradores podem ter login com senha.',
      'Dados de cada empresa ficam isolados.',
    ],
    faqLabel: 'Dúvidas que travam a compra',
    faqTitle: 'FAQ comercial',
    faqs: [
      {
        q: 'É de graça mesmo?',
        a: 'Sim nesta fase: early access sem custo para primeiros parceiros que entram no piloto com a 3035Tech. Depois do piloto, a conversa comercial é transparente. Sem pegadinha no site.',
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
        q: 'O colaborador também usa?',
        a: 'Sim. Com login em /employee: chegada, pesquisas, PDI, OKRs, LMS, DP leve (docs/férias) e ponto web. Há também o link leve /e por token, sem senha.',
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
    earlyTitle: 'Entre no piloto agora: sem custo',
    earlyBody:
      'Vagas limitadas de early access para empresas que querem validar recrutamento + gestão no mesmo fluxo. Você usa de verdade; nós priorizamos o roadmap com o que dói no seu RH.',
    earlyProof: [
      'Sem cartão · sem trial escondido',
      'Onboarding com a 3035Tech',
      'pt-BR e inglês no painel',
    ],
    earlyContact: 'Ou escreva para',
    earlyMailSubject: '30Team: quero early access gratuito',
    earlyMailBody:
      'Olá! Quero o early access gratuito do 30Team.\n\nEmpresa:\nNome:\nPapel (RH / gestão / direção):\nTamanho aproximado do time:\nPrincipal dor hoje (ATS / teste PDF / pós-hire):\n',
    closeTitle: 'Pronto para vender o “sim” interno?',
    closeBody:
      'Mostre ao time um fluxo que vai do candidato ao hub do colaborador. Sem mais uma planilha. O early access está aberto.',
    footerBrand: '30Team',
    footerCred:
      'Feito pela 3035Tech: engenharia de software há ~19 anos, com clientes no Brasil, Irlanda, EUA e Alemanha.',
    footerPricing: 'Planos e preços',
    footerLegal: 'Software de RH com Eneagrama, Motivadores e recrutamento. Hipóteses de gestão, não diagnóstico.',
    skipToContent: 'Ir para o conteúdo',
  },
  en: {
    metaTitle: '30Team: Hiring with Enneagram profile and manage the team after. Free early access',
    metaDescription:
      'Software houses and product agencies: funnel with Enneagram-at-work and Motivators, 1:1s, OKRs, LMS, collaborator hub, Day-1–D90 arrival, and light HR ops. Free early access. 3035Tech.',
    metaKeywords: [
      'HR software',
      'hiring with Enneagram profile',
      'team fit',
      'ATS plus people',
      'Motivators assessment',
      '1:1 management',
      'OKR',
      'corporate LMS',
      'employee portal',
      'employee climate',
      'onboarding check-ins',
      '30Team',
      '3035Tech',
      'early access HR',
    ].join(', '),
    earlyBadge: 'Pilot open · no cost for first partners',
    heroTitle: 'Hire all the time without deciding on gut feel.',
    heroLead:
      '30Team is for software houses, agencies, and product teams that open roles every week: Enneagram-at-work and Motivators in the funnel, interview briefs, and the same thread after hire.',
    heroBody:
      'Stop losing the person in week two. Ranking, 1:1s, collaborator hub, LMS, OKRs, arrival, and climate in one place. No clinical label. No PDF that vanishes.',
    heroFoot: 'Already a customer? Sign in as manager/HR or collaborator. Not yet? Claim free early access. Or see what is included:',
    navLogin: 'Managers / HR',
    navEmployee: 'Collaborator',
    navPricing: 'Pricing',
    navEarly: 'Free pilot',
    ctaEarly: 'Get free early access →',
    ctaLogin: 'Manager / HR access',
    ctaEmployee: 'I am a collaborator',
    tocLabel: 'On this page',
    audienceLabel: 'Who it is for',
    audienceTitle: 'HR, leadership, and managers who hire and coach people',
    audienceItems: [
      'Teams on ATS tools (Gupy, Greenhouse, and peers) that lack Enneagram / personality-at-work profile tied to role and team.',
      'Companies that buy standalone profile tests and get a PDF. No brief, no 1:1, no post-hire or collaborator hub.',
      'Leaders who want management hypotheses (“tends to…”) instead of labels or “diagnosis”.',
    ],
    problemLabel: 'The pain',
    problemTitle: 'Three products. Zero continuity.',
    problems: [
      {
        title: 'ATS runs the funnel',
        body: 'Resumes, stages, calendar. Great for volume. Weak at explaining fit to the role and the team already there.',
      },
      {
        title: 'The test becomes a file',
        body: 'Standalone batteries look polished. By the interview and 1:1, context is gone.',
      },
      {
        title: 'After hire, start over',
        body: 'Onboarding, LMS, OKRs, climate, and retention live elsewhere. The hired person is “born again” in another system.',
      },
    ],
    wedgeLabel: 'The hook',
    wedgeTitle: 'One person. One story. From candidate to employee.',
    wedgeBody:
      'In 30Team the same person carries the Enneagram (personalities at work), Motivators, vacancy ranking, brief, 1:1s, plans, OKRs, LMS, check-ins, climate, and light HR ops. You do not “integrate a PDF”. You decide and follow through on one thread.',
    outcomesLabel: 'What changes',
    outcomesTitle: 'Outcomes customers feel',
    outcomes: [
      {
        title: 'Faster, defensible hire decisions',
        body: 'Per-role rubric, explainable profile fit ranking, and interview brief with do/avoid. Ready for the panel.',
      },
      {
        title: 'Managers ready for the conversation',
        body: 'Management hypotheses + 1:1 log + employee prep. Fewer generic meetings, clearer next steps.',
      },
      {
        title: 'Less “vanished after hire”',
        body: 'Collaborator hub, Day-1–D90 arrival, LMS with progress, assigned OKRs, and development plans. With actionable retention alerts.',
      },
      {
        title: 'One less tool in the stack',
        body: 'Funnel + profile + light people ops + light LMS/HR ops. Complements your ATS; no forced payroll rip-and-replace on day one.',
      },
    ],
    pillarsLabel: 'What you get',
    pillarsTitle: 'Real product: sold as business value',
    pillarsLead: 'Capabilities phrased for HR and leadership buyers.',
    pillars: [
      {
        id: 'recruit',
        title: 'Hiring with fit',
        items: [
          'Vacancies and kanban pipeline through hire or archive',
          'Job roles with reusable T1-T9 rubric: create vacancies with ideal profile already defined',
          'Per-role profile rubric + explainable fit ranking',
          'Interview scorecard, rich notes, talent pool',
          'Exit analysis: what to fix in hiring based on real departure reasons',
          'Public job pages to attract candidates',
          'Client shortlist report (opinion + PDF)',
          'Minimal offer tracking in the funnel',
          'Effectiveness metrics: time-to-hire, retention, hired fit vs pool',
        ],
      },
      {
        id: 'profile',
        title: 'Enneagram and Motivators that drive action',
        items: [
          'Enneagram-inspired profile test: personalities at work (not a clinical diagnosis)',
          'Motivators: what energizes and drains day to day',
          'HR Score: consolidated behavioral signals (0-100) with turnover predictions and PDI gaps',
          'Turnover radar: multi-signal monitoring of departure risk with suggested actions',
          'Decision brief + one-pager PDF for interviews',
          'Team compatibility and composition (synergy / tension)',
          'Overview with team map and attention queue',
          'Analytics: time trends, area comparisons, anomaly alerts',
        ],
      },
      {
        id: 'team',
        title: 'Management, performance, and climate',
        items: [
          'Unified team: candidates and employees',
          '1:1s with hypotheses and next steps',
          'Light OKRs (company / team / person) with activities assigned to collaborators',
          'Performance reviews: goals, outcomes, optional 180°/360°, and calibration',
          '9Box matrix (performance × potential) with hedged language',
          'Continuous peer feedback plus company feed with kudos',
          'Succession planning: critical roles, successors, and readiness',
          'Anonymous climate surveys, group pulse, and weekly manager digest',
          'Whistleblowing / speak-up channel with HR triage',
        ],
      },
      {
        id: 'journey',
        title: 'Post-hire and learning',
        items: [
          'Collaborator hub with password login: tasks, arrival, plans, OKRs, and surveys',
          '“My arrival” timeline: kit, access sheet, calls, and D30/D60/D90 check-ins',
          'LMS with courses, player, progress, quiz, and certificate',
          'Academy / learning catalog that development plans can reference',
          'Development plans with progress, cycle, and owner',
          'Company benefits catalog',
          'Retention alerts with plan and review',
          'Continuous journey on the person record',
        ],
      },
      {
        id: 'dp',
        title: 'Light HR ops in the same login',
        items: [
          'Collaborator profile: address, tax ID, and emergency contact',
          'Document checklist with collaborator upload',
          'Leave / time-off requests with balance and attachments',
          'Web time clock (clock in / out) in the collaborator hub',
          'Internal compensation and variable pay (propose / approve): not payroll or payslips',
          'Does not replace full payroll / tax filings: light ops in the same tenant',
        ],
      },
    ],
    compareLabel: 'Positioning',
    compareTitle: 'Where 30Team wins (and where it does not compete)',
    compareLead: 'No brand bashing: help the buyer pick the right category.',
    compareRows: [
      {
        them: 'Classic ATS (e.g. Gupy, Greenhouse)',
        gap: 'Strong on volume, stages, careers.',
        us: '30Team adds Enneagram + decision + post-hire on the same person thread.',
      },
      {
        them: 'Standalone test / profile PDF',
        gap: 'A report that never enters the HR workflow.',
        us: 'The profile test becomes brief, vacancy ranking, and 1:1 script.',
      },
      {
        them: 'Engagement / climate only',
        gap: 'Measures feeling later: disconnected from hire.',
        us: 'Climate, pulse, OKRs, and LMS follow the same profile you hired on.',
      },
      {
        them: 'Full HRIS / payroll',
        gap: 'Fiscal admissions, payslips, tax filings.',
        us: 'Does not replace them: light LMS and HR ops plus collaborator hub on the profile product.',
      },
    ],
    builderLabel: 'Origin',
    builderTitle: 'Why 3035Tech built 30Team',
    builderParagraphs: [
      '30Team started inside 3035Tech: a software engineering company that hires and builds teams constantly. The pain was ours: gut-feel decisions, PDFs nobody reopens, and restarting the person’s story after hire.',
      'We use the product for real. We hire with it, train people through 3035TEACH, and manage the team in the same flow. Not a slide deck: a tool that survived our own HR before it became an offer.',
      '3035Tech stands behind it as guarantor: serious engineering. The hero of the page, and of the day-to-day, remains 30Team.',
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
        body: 'Hire with context and follow arrival → collaborator hub → 1:1 / OKRs / LMS. Without switching tools.',
      },
    ],
    trustLabel: 'Trust',
    trustTitle: 'Serious language: clear limits',
    trustItems: [
      'Management hypotheses (“tends to”), never a clinical diagnosis.',
      'Does not replace technical interviews or health assessment.',
      'Enneagram at work: work-style profile, not a clinical report.',
      'Candidates do not create accounts: they use the link HR sends. Collaborators can have a password login.',
      'Each company’s data stays isolated.',
    ],
    faqLabel: 'Buying questions',
    faqTitle: 'Commercial FAQ',
    faqs: [
      {
        q: 'Is it really free?',
        a: 'Yes in this phase: early access at no cost for first partners in the 3035Tech pilot. After the pilot, commercial terms are explicit. No bait on the site.',
      },
      {
        q: 'Do I have to drop my ATS?',
        a: 'No. 30Team includes funnel and profile, but the core value is decision and post-hire. Many teams start alongside their current ATS.',
      },
      {
        q: 'Is this another personality test?',
        a: 'No. An Enneagram-at-work profile test + Motivators tied to role, team, interview, and 1:1. Not a clinical diagnosis.',
      },
      {
        q: 'Do collaborators use it too?',
        a: 'Yes. Password login at /employee: arrival, surveys, plans, OKRs, LMS, light HR ops (docs/leave), and web time clock. There is also a light /e token link without a password.',
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
    earlyTitle: 'Join the pilot now: no cost',
    earlyBody:
      'Limited early-access seats for companies that want hiring + management in one flow. You use it for real; we prioritize the roadmap with what hurts your HR.',
    earlyProof: ['No card · no hidden trial', 'Onboarding with 3035Tech', 'pt-BR and English in the panel'],
    earlyContact: 'Or write to',
    earlyMailSubject: '30Team: free early access',
    earlyMailBody:
      'Hi! I want free early access to 30Team.\n\nCompany:\nName:\nRole (HR / manager / leadership):\nApprox. team size:\nMain pain today (ATS / PDF test / post-hire):\n',
    closeTitle: 'Ready to win the internal “yes”?',
    closeBody:
      'Show your team a flow from candidate to collaborator hub. Without another spreadsheet. Early access is open.',
    footerBrand: '30Team',
    footerCred:
      'Built by 3035Tech: software engineering for ~19 years, with clients in Brazil, Ireland, the US, and Germany.',
    footerPricing: 'Plans and pricing',
    footerLegal: 'HR software with Enneagram, Motivators, and hiring. Management hypotheses, not diagnosis.',
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
    '- Category: Enneagram-at-work profile + hiring + light post-hire people ops (not full ATS replacement, not full payroll/HRIS).',
    '- Competitors / alternatives: classic ATS (Gupy, Greenhouse…), standalone profile PDFs, climate-only tools, full HRIS/payroll.',
    '- Wedge: one person record from candidate to employee (funnel → brief → 1:1 → hub / LMS / OKRs / D1–D90 / light HR ops / climate).',
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
  for (const u of TECHNICAL_FOR_LLMS.urls) lines.push(`- ${u.path}: ${u.use}`);
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
  lines.push(`- Collaborator login: ${base}/employee/login`);
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
