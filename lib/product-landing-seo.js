/**
 * Conteúdo canônico da landpage `/` — SEO, JSON-LD e llms.txt.
 * Fonte de verdade de copy de produto para indexação (buscadores + IAs).
 * UI interativa (idioma/CTA) lê o mesmo objeto via getProductLandingCopy.
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

const COPY = {
  'pt-BR': {
    metaTitle: '30Team — Recrutamento, perfil de trabalho T1–T9 e gestão de time | 3035Tech',
    metaDescription:
      '30Team é a plataforma da 3035Tech para RH e gestores: funil de vagas, avaliação de estilo de trabalho T1–T9, Motivadores, briefing e 1:1, clima, PDI e jornada pós-contratação. Early access sem custo para primeiros usuários. Não é diagnóstico clínico.',
    metaKeywords: [
      '30Team',
      '3035Tech',
      'RH',
      'recrutamento',
      'perfil de trabalho',
      'Eneagrama trabalho',
      'T1-T9',
      'Motivadores',
      'ATS perfil',
      '1:1',
      'clima organizacional',
      'PDI',
      'fit cultural',
      'pipeline de vagas',
      'people analytics',
    ].join(', '),
    earlyBadge: 'Early access · sem custo para primeiros usuários',
    heroTitle: 'Recrutamento e perfil de time, do funil ao pós-hire',
    heroLead:
      '30Team une vagas, leitura de estilo de trabalho (T1–T9), Motivadores, briefing e 1:1, clima e jornada leve após a contratação — numa visão por empresa, área e vaga.',
    heroBody:
      'Para RH e liderança que precisam decidir com dados e conversa. Hipóteses hedged (“tende a”) — não diagnóstico clínico. Candidatos entram só por link; gestores pelo painel.',
    heroFoot: 'Já tem conta? Entre no painel. Quer o piloto? Fale com a 3035Tech.',
    navLogin: 'Acessar o sistema',
    navEarly: 'Early access',
    ctaLogin: 'Acessar o sistema →',
    ctaEarly: 'Quero early access',
    tocLabel: 'Nesta página',
    problemLabel: 'O problema',
    problemTitle: 'Ferramentas que param no hire — ou no PDF do teste',
    problems: [
      'ATS classifica currículo e estágio, mas quase não ajuda a conversa de fit e gestão.',
      'Testes de perfil viram relatório estático: pouca ligação com vaga, time e 1:1.',
      'Depois do hire, o contexto some — onboarding, clima e retenção ficam em outra planilha.',
    ],
    howLabel: 'Como funciona',
    howTitle: 'Do link ao painel, sem conta de candidato',
    steps: [
      {
        n: '01',
        title: 'Convide por token',
        body: 'Empresa ou vaga gera link (/t, /v, Motivadores…). A pessoa responde sem criar login.',
      },
      {
        n: '02',
        title: 'Leia e priorize',
        body: 'Rubrica da vaga, ranking, briefing hedged e pipeline — RH e gestor no mesmo contexto.',
      },
      {
        n: '03',
        title: 'Acompanhe depois',
        body: '1:1, check-ins D30/D60/D90, clima, pulso e PDI — continuidade sem reinventar a pessoa.',
      },
    ],
    whatLabel: 'O que é o 30Team',
    whatTitle: 'Produto de RH para perfil de trabalho e recrutamento',
    whatBody: [
      'Instrumento principal: avaliação inspirada no Eneagrama aplicada ao trabalho, tipos T1–T9 (estilo de trabalho).',
      'Instrumento secundário: Motivadores (Assessment Engine) — dimensões de motivação no trabalho, motor separado.',
      'Não é DISC, não é diagnóstico clínico e não substitui entrevista técnica.',
      'Identidade da pessoa: um registro (candidato/colaborador) por empresa + e-mail une testes, 1:1, PDI e jornada.',
    ],
    pillarsLabel: 'Capacidades',
    pillarsTitle: 'Quatro frentes no mesmo produto',
    pillarsLead: 'Tudo no mesmo tenant e na mesma pessoa — sem merge por nome.',
    pillars: [
      {
        id: 'recrutar',
        title: 'Recrutar',
        items: [
          'Vagas com drawer rico (lista primeiro): título, posições, contrato, modalidade, UF/cidade IBGE, faixa, descrição',
          'Pipeline kanban: new → interview → test_completed → screening → approved → hired | rejected | archived',
          'Rubrica T1–T9 por vaga (não muda o teste); aderência 0–10; explicar Fit',
          'Links /v (teste) e /j (anúncio SEO); funil, indicação ?ref=, clonar vaga',
          'Scorecard 1–5, notes ricas, pool (adicionar a outra vaga), oferta mínima (salário/status)',
          'Relatório cliente /r com shortlist + parecer + print/PDF',
        ],
      },
      {
        id: 'perfil',
        title: 'Perfil e decisão',
        items: [
          'Eneagrama de trabalho T1–T9 com scoring no servidor',
          'Motivadores (13 dimensões) com insights faça/evite — fora do ranking de aderência',
          'Briefing de decisão (entrevista, faça/evite, composição com o time) + PDF',
          'Compatibilidade, comparativo, grupos salvos, liderança e ranking vs núcleo',
          'Visão geral: heat T1–T9, fila de atenção, mix×rubrica, retenção e clima',
        ],
      },
      {
        id: 'time',
        title: 'Time e clima',
        items: [
          'Equipe: lista + kanban, filtros time interno / candidatos, timeline',
          'Hipóteses de gestão + registro de 1:1 (notas ricas, próximos passos)',
          'Pesquisa de clima anônima (/clima) Likert + texto; médias com mínimo; temas',
          'Pulso curto de grupo (/pulso); link colaborador (/e) sem conta',
          'Notificações in-app e digest semanal do gestor',
        ],
      },
      {
        id: 'jornada',
        title: 'Pós-contratação',
        items: [
          'Checklist D1 (kit, RH, gestor) ao marcar contratado',
          'Check-ins D30/D60/D90 com desfecho → item de PDI',
          'PDI: planos, ciclo, responsável, progresso, fila na Overview',
          'Jornada contínua na Equipe (D1 → check-ins → PDI)',
          'Retention watch acionável (pergunta + plano + revisão)',
        ],
      },
    ],
    modulesLabel: 'Painel do gestor',
    modulesTitle: 'Módulos do dashboard',
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
      'Guia + assistente de ajuda',
      'Meu perfil',
    ],
    modulesNote:
      'Acesso por papéis admin | direction | hr e whitelist de módulos. Links públicos já emitidos não caem ao revogar permissão do gestor.',
    urlsLabel: 'Superfícies públicas',
    urlsTitle: 'URLs do produto (tokens e SEO)',
    urls: [
      { path: '/', use: 'Landpage de produto (esta página) + CTA para login' },
      { path: '/login', use: 'Acesso de gestores; esqueceu a senha via e-mail' },
      { path: '/t/{token}', use: 'Assessment Eneagrama da empresa (time; noindex)' },
      { path: '/v/{token}', use: 'Assessment Eneagrama da vaga (candidato; noindex)' },
      { path: '/assessment/motivators/{token}', use: 'Motivadores' },
      { path: '/j', use: 'Índice e anúncios SEO de vagas (JobPosting)' },
      { path: '/c/{slug}', use: 'Página de carreiras da empresa (opt-in)' },
      { path: '/r/{token}', use: 'Relatório shortlist para cliente' },
      { path: '/clima/{token}', use: 'Pesquisa de clima anônima' },
      { path: '/pulso/{token}', use: 'Pulso curto de grupo' },
      { path: '/e/{token}', use: 'Espaço mínimo do colaborador' },
    ],
    diffLabel: 'Diferença',
    diffTitle: 'Não é só ATS. Não é só teste. Não para no hire.',
    diffs: [
      'Vs ATS clássico: funil + leitura de perfil e gestão leve no mesmo lugar.',
      'Vs testes avulsos: resultado ligado a vaga, rubrica, time e conversa — não só PDF.',
      'Vs ferramentas que param no offer: jornada, clima e 1:1 depois da contratação.',
      'Multi-tenant por empresa; linguagem de hipótese; scoring autoritativo no servidor.',
    ],
    diffNote:
      'T1–T9 é inspirado no Eneagrama como estilo de trabalho — não substitui entrevista técnica nem avaliação clínica.',
    faqLabel: 'Perguntas frequentes',
    faqTitle: 'FAQ para RH, gestores e buscas',
    faqs: [
      {
        q: 'O 30Team é um teste de personalidade clínico?',
        a: 'Não. É um instrumento de estilo de trabalho (T1–T9) e Motivadores para RH e gestão, com linguagem hedged. Não diagnostica e não substitui entrevista técnica.',
      },
      {
        q: 'Candidatos precisam criar conta?',
        a: 'Não. Candidatos e colaboradores entram só por links com token (/t, /v, Motivadores, clima, pulso, /e). Conta é só para gestores no painel.',
      },
      {
        q: 'O 30Team substitui um ATS completo?',
        a: 'Não pretende ser ATS genérico de CV/calendário. Cobre funil de vagas, perfil, decisão e acompanhamento pós-hire no mesmo contexto de pessoa.',
      },
      {
        q: 'Há custo no early access?',
        a: 'Nesta fase de piloto, early access para primeiros usuários parceiros é sem cobrança. Fale com contact@3035tech.com.',
      },
      {
        q: 'Quem desenvolve o 30Team?',
        a: '3035Tech. Produto multi-tenant para empresas: recrutamento, perfil de time e people ops leve.',
      },
    ],
    factsLabel: 'Ficha do produto',
    factsTitle: 'Dados estruturados para indexação e IAs',
    facts: [
      { k: 'Nome', v: '30Team (30team)' },
      { k: 'Editor', v: '3035Tech' },
      { k: 'Categoria', v: 'Software de RH / recrutamento / people analytics leve' },
      { k: 'Público', v: 'RH, direção e gestores (admin, direction, hr)' },
      { k: 'Instrumentos', v: 'T1–T9 (estilo de trabalho) + Motivadores' },
      { k: 'Idiomas UI', v: 'Português (Brasil) e English' },
      { k: 'Modelo de acesso candidato', v: 'Token por link — sem conta' },
      { k: 'Contato early access', v: PRODUCT_LANDING_CONTACT_EMAIL },
      { k: 'Documento para LLMs', v: '/llms.txt' },
    ],
    earlyLabel: 'Early access',
    earlyTitle: 'Primeiros usuários sem custo',
    earlyBody:
      'Piloto com empresas e RH parceiros. Early access sem cobrança nesta fase — você valida o fluxo; nós priorizamos o que importa no dia a dia.',
    earlyContact: 'Escreva para',
    earlyMailSubject: '30Team — early access',
    earlyMailBody: 'Olá! Quero early access ao 30Team.\n\nEmpresa:\nNome:\nPapel (RH/gestão):\n',
    closeTitle: 'Pronto para entrar?',
    closeBody: 'Gestores com acesso usam o login. Novos parceiros: peça early access à 3035Tech.',
    footerBrand: '30Team · 3035Tech',
    footerLegal: 'Perfil de trabalho e recrutamento — hipóteses, não diagnóstico.',
    skipToContent: 'Ir para o conteúdo',
  },
  en: {
    metaTitle: '30Team — Hiring, T1–T9 work-style profile & team ops | 3035Tech',
    metaDescription:
      '30Team by 3035Tech for HR and managers: vacancy funnel, T1–T9 work-style assessment, Motivators, decision brief and 1:1s, climate, development plans, and light post-hire journey. Early access at no cost for first users. Not a clinical diagnosis.',
    metaKeywords: [
      '30Team',
      '3035Tech',
      'HR software',
      'hiring',
      'work style assessment',
      'Enneagram at work',
      'T1-T9',
      'Motivators',
      'team fit',
      '1:1',
      'employee climate',
      'people analytics',
    ].join(', '),
    earlyBadge: 'Early access · no cost for first users',
    heroTitle: 'Hiring and team profile — from funnel to post-hire',
    heroLead:
      '30Team brings vacancies, work-style reading (T1–T9), Motivators, brief and 1:1s, climate, and a light post-hire journey — by company, area, and role.',
    heroBody:
      'For HR and leaders who decide with data and conversation. Hedged hypotheses (“tends to”) — not a clinical diagnosis. Candidates enter via link only; managers use the panel.',
    heroFoot: 'Already have an account? Sign in. Want the pilot? Talk to 3035Tech.',
    navLogin: 'Sign in',
    navEarly: 'Early access',
    ctaLogin: 'Access the system →',
    ctaEarly: 'Request early access',
    tocLabel: 'On this page',
    problemLabel: 'The problem',
    problemTitle: 'Tools that stop at hire — or at a test PDF',
    problems: [
      'Classic ATS tracks resumes and stages, but rarely supports fit and management conversations.',
      'Profile tests become static reports with little tie to role, team, and 1:1s.',
      'After hire, context disappears — onboarding, climate, and retention live elsewhere.',
    ],
    howLabel: 'How it works',
    howTitle: 'From link to panel — no candidate account',
    steps: [
      {
        n: '01',
        title: 'Invite by token',
        body: 'Company or vacancy links (/t, /v, Motivators…). People respond without creating a login.',
      },
      {
        n: '02',
        title: 'Read and prioritize',
        body: 'Vacancy rubric, ranking, hedged brief, and pipeline — HR and manager in one context.',
      },
      {
        n: '03',
        title: 'Follow through',
        body: '1:1s, D30/D60/D90 check-ins, climate, pulse, and development plans — continuity.',
      },
    ],
    whatLabel: 'What 30Team is',
    whatTitle: 'HR product for work-style profile and hiring',
    whatBody: [
      'Primary instrument: Enneagram-inspired work-style assessment, types T1–T9.',
      'Secondary: Motivators (Assessment Engine) — separate motivation dimensions.',
      'Not DISC, not a clinical diagnosis, and not a substitute for technical interviews.',
      'Person hub: one candidate/employee record per company + email ties tests, 1:1s, plans, and journey.',
    ],
    pillarsLabel: 'Capabilities',
    pillarsTitle: 'Four fronts in one product',
    pillarsLead: 'Same tenant and same person record — no merge-by-name.',
    pillars: [
      {
        id: 'recruit',
        title: 'Recruit',
        items: [
          'Rich vacancy drawer (list-first): title, openings, contract, modality, location, band, description',
          'Pipeline kanban through hire / reject / archive with aging badges',
          'Per-vacancy T1–T9 rubric; fit 0–10 with explainability',
          'Links /v (test) and /j (SEO posting); funnel, referrals, clone vacancy',
          'Scorecard, rich notes, talent pool, minimal offer tracking',
          'Client report /r with shortlist + print/PDF',
        ],
      },
      {
        id: 'profile',
        title: 'Profile and decision',
        items: [
          'T1–T9 work-style with server-side scoring',
          'Motivators (13 dimensions) with do/avoid insights — outside vacancy fit ranking',
          'Decision brief (interview, do/avoid, team composition) + PDF',
          'Compatibility, compare, saved groups, leadership, ranking vs nucleus',
          'Overview: T1–T9 heat, attention queue, mix×rubric, retention and climate',
        ],
      },
      {
        id: 'team',
        title: 'Team and climate',
        items: [
          'Team roster list + kanban, internal vs vacancy filters, timeline',
          'Management hypotheses + 1:1 log (rich notes, next steps)',
          'Anonymous climate surveys (/clima); aggregates with response floor; themes',
          'Team pulse (/pulso); employee space (/e) without an account',
          'In-app notifications and manager weekly digest',
        ],
      },
      {
        id: 'journey',
        title: 'Post-hire',
        items: [
          'D1 checklist (kit, HR, manager) on hire',
          'D30/D60/D90 check-ins with outcomes → development-plan items',
          'Development plans: cycle, owner, progress, Overview queue',
          'Continuous journey strip on Team (D1 → check-ins → plans)',
          'Actionable retention watch (question + plan + review)',
        ],
      },
    ],
    modulesLabel: 'Manager panel',
    modulesTitle: 'Dashboard modules',
    modules: [
      'Overview',
      'Team',
      'Compatibility',
      'Compare',
      'Groups',
      'Leadership',
      'Vacancies',
      'Motivators',
      'Climate',
      'Companies (admin)',
      'Users (admin)',
      'Help + assistant',
      'My profile',
    ],
    modulesNote:
      'Roles admin | direction | hr plus module whitelist. Public links already issued are not revoked when a manager capability is removed.',
    urlsLabel: 'Public surfaces',
    urlsTitle: 'Product URLs (tokens and SEO)',
    urls: [
      { path: '/', use: 'Product landing (this page) + CTA to sign in' },
      { path: '/login', use: 'Manager access; forgot password via email' },
      { path: '/t/{token}', use: 'Company Enneagram assessment (internal; noindex)' },
      { path: '/v/{token}', use: 'Vacancy Enneagram assessment (candidate; noindex)' },
      { path: '/assessment/motivators/{token}', use: 'Motivators' },
      { path: '/j', use: 'Public job index and SEO postings (JobPosting)' },
      { path: '/c/{slug}', use: 'Company careers page (opt-in)' },
      { path: '/r/{token}', use: 'Client shortlist report' },
      { path: '/clima/{token}', use: 'Anonymous climate survey' },
      { path: '/pulso/{token}', use: 'Short team pulse' },
      { path: '/e/{token}', use: 'Minimal employee space' },
    ],
    diffLabel: 'Difference',
    diffTitle: 'Not just ATS. Not just a test. Does not stop at hire.',
    diffs: [
      'Vs classic ATS: funnel plus profile reading and light management in one place.',
      'Vs standalone tests: results tied to role, rubric, team, and conversation — not only a PDF.',
      'Vs tools that stop at offer: journey, climate, and 1:1s after hiring.',
      'Multi-tenant by company; hypothesis language; authoritative server-side scoring.',
    ],
    diffNote:
      'T1–T9 is inspired by the Enneagram as work style — it does not replace technical interviews or clinical assessment.',
    faqLabel: 'FAQ',
    faqTitle: 'Questions for HR, managers, and search',
    faqs: [
      {
        q: 'Is 30Team a clinical personality test?',
        a: 'No. It is a work-style instrument (T1–T9) plus Motivators for HR and management, with hedged language. It does not diagnose and does not replace technical interviews.',
      },
      {
        q: 'Do candidates need an account?',
        a: 'No. Candidates and employees use token links only. Accounts are for managers in the panel.',
      },
      {
        q: 'Does 30Team replace a full ATS?',
        a: 'It is not a generic CV/calendar ATS. It covers vacancy funnel, profile, decision, and post-hire follow-up in one person context.',
      },
      {
        q: 'Is early access free?',
        a: 'In this pilot phase, early access for first partner users has no charge. Contact contact@3035tech.com.',
      },
      {
        q: 'Who builds 30Team?',
        a: '3035Tech. Multi-tenant product for companies: hiring, team profile, and light people ops.',
      },
    ],
    factsLabel: 'Product card',
    factsTitle: 'Structured facts for indexing and AIs',
    facts: [
      { k: 'Name', v: '30Team (30team)' },
      { k: 'Publisher', v: '3035Tech' },
      { k: 'Category', v: 'HR / hiring / light people-analytics software' },
      { k: 'Audience', v: 'HR, leadership, and managers (admin, direction, hr)' },
      { k: 'Instruments', v: 'T1–T9 (work style) + Motivators' },
      { k: 'UI languages', v: 'Portuguese (Brazil) and English' },
      { k: 'Candidate access', v: 'Token links — no account' },
      { k: 'Early access contact', v: PRODUCT_LANDING_CONTACT_EMAIL },
      { k: 'LLM document', v: '/llms.txt' },
    ],
    earlyLabel: 'Early access',
    earlyTitle: 'No cost for first users',
    earlyBody:
      'Pilot with partner HR teams. Early access with no charge in this phase — you validate the flow; we prioritize what matters day to day.',
    earlyContact: 'Write to',
    earlyMailSubject: '30Team — early access',
    earlyMailBody: 'Hi! I want early access to 30Team.\n\nCompany:\nName:\nRole (HR/manager):\n',
    closeTitle: 'Ready to go in?',
    closeBody: 'Managers with access use sign-in. New partners: request early access from 3035Tech.',
    footerBrand: '30Team · 3035Tech',
    footerLegal: 'Work profile and hiring — hypotheses, not diagnosis.',
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
    sameAs: [],
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
      cssSelector: ['#produto-hero', '#o-que-e', '#faq'],
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

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [organization, software, webPage, faqPage],
  };

  return serializeJsonLdForScript(graph);
}

/** Texto plano otimizado para crawlers de IA (llms.txt). */
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
    `Languages: pt-BR, en`,
    '',
    '## Summary (pt-BR)',
    pt.heroLead,
    pt.heroBody,
    '',
    '## Summary (en)',
    en.heroLead,
    en.heroBody,
    '',
    '## What it is / is not',
    ...pt.whatBody.map((x) => `- ${x}`),
    '',
    '## Capabilities',
  ];
  for (const pillar of pt.pillars) {
    lines.push(`### ${pillar.title}`);
    for (const item of pillar.items) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('## Dashboard modules');
  for (const m of pt.modules) lines.push(`- ${m}`);
  lines.push('', '## Public URLs');
  for (const u of pt.urls) lines.push(`- ${u.path} — ${u.use}`);
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
  lines.push('## Optional');
  lines.push(`- [${pt.metaTitle}](${base}/): product landing`);
  lines.push(`- Public jobs index: ${base}/j`);
  lines.push(`- Manager login: ${base}/login`);
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
      languages: {
        'pt-BR': url,
        en: url,
        'x-default': url,
      },
      types: {
        'text/plain': productLandingAbsoluteUrl('/llms.txt'),
      },
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
    other: {
      'ai-content-declaration': 'human-product-documentation',
    },
  };
}
