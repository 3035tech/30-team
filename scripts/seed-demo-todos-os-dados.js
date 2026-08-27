/**
 * Seed DEMO — empresa "Todos os Dados" (tenant isolado)
 *
 * Popula o máximo possível do produto para validar fluxos:
 * Equipe, Comparar, Vagas/pipeline, Motivadores, 1:1, notificações,
 * convites, relatório /r, links /t e /v, users hr+direction.
 *
 * Pré-requisitos:
 *   - migrations aplicadas (incl. 028 client_report_show_salary)
 *   - areas populadas
 *   - npm run db:seed-motivators  (ae_definitions slug=motivators)
 *
 * Uso:
 *   CONFIRM_DEMO_PURGE=1 npm run db:seed-demo-todos-os-dados
 *
 * Alternativa SQL (pgAdmin): scripts/seed-demo-todos-os-dados.sql
 *
 * Login:
 *   hr@todos-os-dados.demo / DemoTodosDados!2026
 *   direction@todos-os-dados.demo / DemoTodosDados!2026
 */

import crypto from 'node:crypto';
import process from 'node:process';
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { MOTIVATORS_DIMENSIONS, motivatorDimensionLabel } from '../lib/ae/motivators-dimensions.js';
import { AE_SCORING_ENGINE_VERSION } from '../lib/ae/ae-id.js';
import { computeAreaScore010 } from '../lib/area-fit.js';
import {
  fitTypeAlignment,
  normalizeRecommendation,
  normalizeReportWeights,
  recommendationFromStage,
  rubricWeightedTypes,
} from '../lib/vacancy-report-shared.js';
import { isRichTextEmpty, sanitizeRichTextHtml } from '../lib/sanitize-html.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const SLUG = 'todos-os-dados-demo';
const COMPANY_NAME = 'Todos os Dados';
const DOMAIN = 'todos-os-dados.demo';
const HR_EMAIL = `hr@${DOMAIN}`;
const DIR_EMAIL = `direction@${DOMAIN}`;
const PASSWORD = process.env.DEMO_TODOS_PASSWORD || 'DemoTodosDados!2026';
const SOURCE = 'demo_todos_os_dados';

/** Tokens fixos (48 hex) — facilitam smoke manual. */
const TOK = {
  company: 'd0d0todosdadose5f60718293a4b5c6d7e8f01',
  vacancyOpen: 'e1e1todosdadose5f60718293a4b5c6d7e8f02',
  vacancyClosed: 'f2f2todosdadose5f60718293a4b5c6d7e8f03',
  report: 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718',
  aeInvite: 'b4b4todosdadose5f60718293a4b5c6d7e8f05',
  candInvite: 'c5c5todosdadose5f60718293a4b5c6d7e8f06',
};

function token(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function makeScoresBiased(topType) {
  const scores = {};
  let max = 0;
  for (let t = 1; t <= 9; t += 1) {
    const base = 10 + Math.floor(Math.random() * 8);
    const boost = t === topType ? 8 + Math.floor(Math.random() * 6) : Math.floor(Math.random() * 5) - 1;
    const v = clamp(base + boost, 6, 30);
    scores[String(t)] = v;
    if (v > max) max = v;
  }
  scores[String(topType)] = Math.max(scores[String(topType)], max + 1);
  return scores;
}

/** Local calendar date as YYYY-MM-DD shifted by dayOffset, then yearsAgo. */
function calendarYmd(dayOffset = 0, yearsAgo = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setFullYear(d.getFullYear() - yearsAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function motivatorsPayload(topKeys) {
  const dims = MOTIVATORS_DIMENSIONS.map((d) => d.key);
  const scores = {};
  for (const k of dims) scores[k] = 40;
  let high = 90;
  for (const k of topKeys) {
    scores[k] = high;
    high -= 4;
  }
  const ranking = [...dims].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  return { dimensionScores: scores, ranking };
}

function motivatorsTopFromKeys(keys, dimensionScores) {
  return (keys || []).slice(0, 3).map((key) => ({
    key,
    label: motivatorDimensionLabel(key, 'pt-BR'),
    score: Math.round(Number(dimensionScores?.[key]) || 0),
  }));
}

/** Colaboradores internos — um de cada T1–T9. */
const EMPLOYEES = [
  {
    key: 'ana',
    fullName: 'Ana Clara Mendes',
    topType: 1,
    areaKey: 'juridico',
    motivators: ['seguranca', 'proposito', 'desenvolvimento'],
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99100-1001',
    birthInDays: 2,
    ageYears: 34,
    workAnnivInDays: 7,
    tenureYears: 3,
  },
  {
    key: 'bruno',
    fullName: 'Bruno Oliveira',
    topType: 2,
    areaKey: 'rh',
    motivators: ['relacionamentos', 'equilibrio', 'proposito'],
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99100-1002',
    birthInDays: 5,
    ageYears: 29,
    workAnnivInDays: 11,
    tenureYears: 2,
  },
  {
    key: 'carla',
    fullName: 'Carla Souza',
    topType: 3,
    areaKey: 'comercial',
    motivators: ['reconhecimento', 'desafio', 'financeiro'],
    city: 'Campinas',
    state: 'SP',
    phone: '+55 19 99100-1003',
    birthInDays: 9,
    ageYears: 31,
    workAnnivInDays: 0,
    tenureYears: 1,
  },
  {
    key: 'diego',
    fullName: 'Diego Martins',
    topType: 4,
    areaKey: 'produto',
    motivators: ['criatividade', 'autonomia', 'proposito'],
    city: 'Rio de Janeiro',
    state: 'RJ',
    phone: '+55 21 99100-1004',
  },
  {
    key: 'elena',
    fullName: 'Elena Ferreira',
    topType: 5,
    areaKey: 'tecnologia',
    motivators: ['autonomia', 'desafio', 'crescimento'],
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99100-1005',
  },
  {
    key: 'fabio',
    fullName: 'Fábio Nunes',
    topType: 6,
    areaKey: 'operacoes',
    motivators: ['seguranca', 'equilibrio', 'relacionamentos'],
    city: 'Belo Horizonte',
    state: 'MG',
    phone: '+55 31 99100-1006',
  },
  {
    key: 'gabi',
    fullName: 'Gabriela Rocha',
    topType: 7,
    areaKey: 'marketing',
    motivators: ['crescimento', 'flexibilidade', 'desafio'],
    city: 'Curitiba',
    state: 'PR',
    phone: '+55 41 99100-1007',
  },
  {
    key: 'hugo',
    fullName: 'Hugo Almeida',
    topType: 8,
    areaKey: 'operacoes',
    motivators: ['lideranca', 'desafio', 'financeiro'],
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99100-1008',
  },
  {
    key: 'iris',
    fullName: 'Íris Campos',
    topType: 9,
    areaKey: 'cs',
    motivators: ['relacionamentos', 'equilibrio', 'proposito'],
    city: 'Porto Alegre',
    state: 'RS',
    phone: '+55 51 99100-1009',
  },
];

/** Candidatos da vaga aberta — cobrem todos os estágios do pipeline. */
const APPLICANTS = [
  {
    key: 'pedro',
    fullName: 'Pedro Henrique Santos',
    topType: 5,
    areaKey: 'tecnologia',
    pipeline: 'screening',
    vacancyStage: 'screening',
    motivators: ['autonomia', 'desafio', 'crescimento'],
    salary: '18500.00',
    availability: '30_days',
    source: 'linkedin',
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99200-2001',
    linkedin: 'https://linkedin.com/in/pedro-henrique-todosdados',
    scores: { 1: 15, 2: 11, 3: 13, 4: 12, 5: 27, 6: 18, 7: 10, 8: 14, 9: 9 },
    why: 'Forte aderência analítica à rubrica da vaga; stack e cases alinhados à plataforma.',
    watchOut: 'Pode demorar demais em análise antes de entregar.',
    interviewProbe: 'Como equilibra profundidade técnica com prazo de sprint?',
    recommendation: 'advance',
    interviewNotes: `<p><strong>Entrevista 1 (screening) — 13/08.</strong></p>
<ul>
<li>Stack: Node, React, Postgres; falou com clareza de índices e N+1.</li>
<li>Case: migração de conciliação com idempotência; perguntou trade-offs.</li>
<li>Fit cultural: perfil analítico (T5); gosta de aprofundar antes de commit.</li>
</ul>
<p><strong>Pontos positivos:</strong> raciocínio estruturado, curiosidade técnica, pretensão alinhada (R$ 18,5k).</p>
<p><strong>Atenção:</strong> pode alongar análise — explorar ritmo de sprint com o time do cliente.</p>
<p><strong>Próximo passo:</strong> avançar para entrevista técnica com o cliente.</p>`,
  },
  {
    key: 'marina',
    fullName: 'Marina Duarte',
    topType: 3,
    areaKey: 'tecnologia',
    pipeline: 'interview',
    vacancyStage: 'interview',
    motivators: ['reconhecimento', 'crescimento', 'desafio'],
    salary: '17000.00',
    availability: '15_days',
    source: 'referral',
    city: 'Curitiba',
    state: 'PR',
    phone: '+55 41 99200-2002',
    scores: { 1: 12, 2: 14, 3: 26, 4: 11, 5: 13, 6: 10, 7: 16, 8: 15, 9: 9 },
    why: 'Execução rápida; bom para ritmo de entrega — validar processo.',
    watchOut: 'Pode priorizar velocidade sobre processo.',
    interviewProbe: 'Conte um caso em que revisou uma decisão sob pressão.',
    recommendation: 'discuss',
    interviewNotes: `<p><strong>Entrevista 1 — 15/08 (agendada / em andamento).</strong></p>
<ul>
<li>Indicação interna; disponibilidade em até 15 dias.</li>
<li>Perfil executor (T3): foco em entrega e meta.</li>
<li>Experiência em produto digital; menos profundidade em SQL avançado.</li>
</ul>
<p><strong>Pontos positivos:</strong> comunicação objetiva, energia de entrega, pretensão R$ 17k ok.</p>
<p><strong>Atenção:</strong> validar se prioriza velocidade sobre processo/documentação.</p>
<p><strong>Próximo passo:</strong> concluir entrevista e decidir se entra na shortlist “conversar”.</p>`,
  },
  {
    key: 'gustavo',
    fullName: 'Gustavo Pires',
    topType: 6,
    areaKey: 'tecnologia',
    pipeline: 'rejected',
    vacancyStage: 'rejected',
    rejectionReason: 'skill_gap',
    motivators: ['seguranca', 'equilibrio', 'relacionamentos'],
    salary: '16000.00',
    availability: 'immediate',
    source: 'job_board',
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99200-2003',
    scores: { 1: 14, 2: 12, 3: 11, 4: 10, 5: 15, 6: 25, 7: 9, 8: 13, 9: 12 },
    recommendation: 'exclude',
    interviewNotes: `<p><strong>Entrevista 1 — 08/08.</strong></p>
<ul>
<li>Portal de vagas; disponibilidade imediata.</li>
<li>Perfil T6 — cauteloso; boa postura, porém gaps em settlement e filas.</li>
<li>Exercício técnico: dificuldade em modelar idempotência e retry.</li>
</ul>
<p><strong>Decisão:</strong> reprovado por <em>skill_gap</em> (fit técnico insuficiente para a vaga).</p>
<p><strong>Feedback interno:</strong> candidato educado; possível banco para vagas mais operacionais no futuro.</p>`,
  },
  {
    key: 'lara',
    fullName: 'Lara Mendonça',
    topType: 1,
    areaKey: 'tecnologia',
    pipeline: 'approved',
    vacancyStage: 'approved',
    motivators: ['proposito', 'desenvolvimento', 'seguranca'],
    salary: '19000.00',
    availability: '30_days',
    source: 'agency',
    city: 'Florianópolis',
    state: 'SC',
    phone: '+55 48 99200-2004',
    scores: { 1: 28, 2: 12, 3: 14, 4: 11, 5: 16, 6: 18, 7: 9, 8: 13, 9: 10 },
    why: 'Processo + qualidade; boa para compliance e previsibilidade da plataforma.',
    watchOut: 'Pode travar se o time for muito “atalho”.',
    interviewProbe: 'Como documenta decisões técnicas?',
    recommendation: 'advance',
    interviewNotes: `<p><strong>Entrevista 1 + 2 — triagem e aprovação interna.</strong></p>
<ul>
<li>Agência; pretensão R$ 19k; disponibilidade 30 dias.</li>
<li>Perfil T1 — qualidade e processo; excelente para compliance de plataforma.</li>
<li>Case: revisão de PR e checklist de release; documentação clara.</li>
</ul>
<p><strong>Pontos positivos:</strong> disciplina, alinhamento à rubrica (T1), maturidade de entrega.</p>
<p><strong>Atenção:</strong> pode travar com times muito “atalho” — explorar no cliente.</p>
<p><strong>Status:</strong> aprovada internamente; pronta para shortlist do relatório ao cliente.</p>`,
  },
  {
    key: 'otavio',
    fullName: 'Otávio Ribeiro',
    topType: 7,
    areaKey: 'tecnologia',
    pipeline: 'test_completed',
    vacancyStage: 'test_completed',
    motivators: ['flexibilidade', 'criatividade', 'crescimento'],
    salary: '15500.00',
    availability: '60_days',
    source: 'linkedin',
    city: 'Recife',
    state: 'PE',
    phone: '+55 81 99200-2005',
    scores: { 1: 11, 2: 13, 3: 15, 4: 12, 5: 14, 6: 10, 7: 27, 8: 16, 9: 9 },
    recommendation: 'bank',
    interviewNotes: `<p><strong>Pós-teste (test_completed) — 16/08.</strong></p>
<ul>
<li>LinkedIn; Recife; disponibilidade 60 dias (mais longo).</li>
<li>Perfil T7 — exploração e ritmo; teste ok, entrevista ainda não marcada.</li>
<li>Motivadores: flexibilidade / criatividade / crescimento.</li>
</ul>
<p><strong>Leitura:</strong> banco por ora — timing de disponibilidade e menor aderência à rubrica (T5/T1/T6).</p>
<p><strong>Próximo passo:</strong> manter em banco; reavaliar se a shortlist principal não fechar.</p>`,
  },
  {
    key: 'nina',
    fullName: 'Nina Barbosa',
    topType: 2,
    areaKey: 'tecnologia',
    pipeline: 'new',
    vacancyStage: 'new',
    salary: '14000.00',
    availability: 'immediate',
    source: 'other',
    city: 'Brasília',
    state: 'DF',
    phone: '+55 61 99200-2006',
    scores: { 1: 14, 2: 26, 3: 15, 4: 12, 5: 11, 6: 16, 7: 13, 8: 10, 9: 17 },
    pendingAeInvite: true,
    interviewNotes: `<p><strong>Pré-cadastro / screening inicial — 19/08.</strong></p>
<ul>
<li>Contato frio (fonte: outro); disponibilidade imediata.</li>
<li>Perfil T2 — colaborativo; ainda sem Motivadores respondidos.</li>
<li>Convite de Eneagrama: <strong>enviado</strong>; aguardando abertura do link.</li>
</ul>
<p><strong>Notas da call rápida (15 min):</strong> interesse genuíno na vaga; experiência mid em front; backend mais raso.</p>
<p><strong>Próximo passo:</strong> aguardar conclusão do teste + enviar Motivadores; só então marcar entrevista estruturada.</p>`,
  },
  {
    key: 'ricardo',
    fullName: 'Ricardo Alves',
    topType: 8,
    areaKey: 'tecnologia',
    pipeline: 'archived',
    vacancyStage: 'archived',
    motivators: ['lideranca', 'desafio', 'autonomia'],
    salary: '21000.00',
    availability: 'other',
    source: 'referral',
    city: 'São Paulo',
    state: 'SP',
    phone: '+55 11 99200-2007',
    scores: { 1: 13, 2: 10, 3: 14, 4: 11, 5: 15, 6: 12, 7: 16, 8: 28, 9: 9 },
    recommendation: 'exclude',
    interviewNotes: `<p><strong>Processo encerrado (arquivado) — 01/08.</strong></p>
<ul>
<li>Indicação; pretensão acima do teto da vaga (R$ 21k).</li>
<li>Perfil T8 — liderança forte; excesso de seniority para a abertura atual.</li>
</ul>
<p><strong>Motivo do arquivo:</strong> desalinhamento de escopo/senioridade e expectativa salarial.</p>
<p><strong>Nota:</strong> não reabrir nesta vaga; eventual fit em papel de tech lead futuro.</p>`,
  },
];

async function main() {
  if (process.env.CONFIRM_DEMO_PURGE !== '1') {
    console.error(
      'ABORTADO: defina CONFIRM_DEMO_PURGE=1 para apagar/recriar apenas o tenant slug=%s',
      SLUG
    );
    process.exit(1);
  }

  const client = new Client(getPgBaseConfig());
  await client.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id FROM companies WHERE LOWER(slug) = $1 AND deleted = FALSE LIMIT 1`,
      [SLUG]
    );
    let companyId = existing.rows[0]?.id || null;

    if (companyId) {
      const badUsers = await client.query(
        `SELECT COUNT(*)::int AS n FROM users
         WHERE company_id = $1 AND email NOT ILIKE '%.demo' AND deleted = FALSE`,
        [companyId]
      );
      if (badUsers.rows[0].n > 0) {
        throw new Error(`ABORTADO: company_id=${companyId} parece tenant real (usuários sem *.demo).`);
      }

      await client.query(`DELETE FROM manager_notifications WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM vacancy_report_shares WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM one_on_ones WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM ae_attempts WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM ae_invites WHERE company_id = $1`, [companyId]);
      await client.query(
        `DELETE FROM vacancy_candidate_pipeline_history h
         USING vacancy_candidates vc
         WHERE h.vacancy_candidate_id = vc.id AND vc.company_id = $1`,
        [companyId]
      );
      await client.query(`DELETE FROM vacancy_candidates WHERE company_id = $1`, [companyId]);
      await client.query(
        `DELETE FROM assessment_pipeline_history h
         USING assessments a
         WHERE h.assessment_id = a.id AND a.company_id = $1`,
        [companyId]
      );
      await client.query(`DELETE FROM assessments WHERE company_id = $1`, [companyId]);
      await client.query(
        `DELETE FROM vacancy_rubrics r USING vacancies v
         WHERE r.vacancy_id = v.id AND v.company_id = $1`,
        [companyId]
      );
      await client.query(
        `DELETE FROM vacancy_links l USING vacancies v
         WHERE l.vacancy_id = v.id AND v.company_id = $1`,
        [companyId]
      );
      await client.query(`DELETE FROM candidate_invites WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM vacancies WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM candidates WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM company_links WHERE company_id = $1`, [companyId]);
      await client.query(
        `DELETE FROM user_capability_overrides o USING users u
         WHERE o.user_id = u.id AND u.company_id = $1`,
        [companyId]
      );
      await client.query(`DELETE FROM users WHERE company_id = $1`, [companyId]);
      await client.query(`DELETE FROM companies WHERE id = $1`, [companyId]);
    }

    const co = await client.query(
      `INSERT INTO companies (name, slug, active, deleted, anniversary_date)
       VALUES ($1, $2, TRUE, FALSE, $3::date) RETURNING id`,
      [COMPANY_NAME, SLUG, calendarYmd(5, 12)]
    );
    companyId = co.rows[0].id;

    const pwdHash = await bcrypt.hash(PASSWORD, 10);

    const hr = await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, locale, display_name, active, deleted)
       VALUES ($1, $2, $3, 'hr', 'pt-BR', 'RH Todos os Dados', TRUE, FALSE)
       RETURNING id`,
      [companyId, HR_EMAIL, pwdHash]
    );
    const hrUserId = hr.rows[0].id;

    const dir = await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, locale, display_name, active, deleted)
       VALUES ($1, $2, $3, 'direction', 'pt-BR', 'Direção Todos os Dados', TRUE, FALSE)
       RETURNING id`,
      [companyId, DIR_EMAIL, pwdHash]
    );
    const dirUserId = dir.rows[0].id;

    // Override de exemplo (whitelist) só no direction — valida UI de capabilities
    await client.query(
      `INSERT INTO user_capability_overrides (user_id, capability, granted) VALUES
         ($1, 'overview.view', TRUE),
         ($1, 'team.view', TRUE),
         ($1, 'compatibility.view', TRUE),
         ($1, 'compare.view', TRUE),
         ($1, 'vacancies.view', TRUE),
         ($1, 'motivators.view', TRUE),
         ($1, 'help.view', TRUE)`,
      [dirUserId]
    );

    await client.query(
      `INSERT INTO company_links (company_id, token, active, expires_at, require_candidate_email)
       VALUES ($1, $2, TRUE, NOW() + INTERVAL '365 days', TRUE)`,
      [companyId, TOK.company]
    );

    const areasRes = await client.query(`SELECT id, key, label FROM areas ORDER BY id`);
    const areaByKey = Object.fromEntries(areasRes.rows.map((a) => [a.key, a]));
    const fallbackArea = areasRes.rows[0];

    const defRes = await client.query(
      `SELECT id FROM ae_definitions WHERE LOWER(slug) = 'motivators' AND active = TRUE LIMIT 1`
    );
    const motivatorsDefId = defRes.rows[0]?.id || null;

    // Vaga aberta (recrutamento — mostra pretensão no /r)
    const vacOpen = await client.query(
      `INSERT INTO vacancies (
         company_id, title, slug, status, positions_count, target_date, deleted,
         description, salary_min, salary_max, client_report_show_salary
       ) VALUES (
         $1, $2, $3, 'open', 2, (CURRENT_DATE + 21), FALSE,
         $4, $5, $6, TRUE
       ) RETURNING id`,
      [
        companyId,
        'Engenheiro(a) Fullstack — Plataforma',
        'engenheiro-fullstack-plataforma',
        '<p><strong>Missão:</strong> evoluir o produto 30Team (Next.js + Postgres).</p><ul><li>React / Node</li><li>SQL e performance</li><li>Cultura de entrega com qualidade</li></ul>',
        '14000.00',
        '22000.00',
      ]
    );
    const vacancyOpenId = vacOpen.rows[0].id;

    await client.query(
      `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at, require_candidate_email)
       VALUES ($1, $2, TRUE, NOW() + INTERVAL '180 days', TRUE)`,
      [vacancyOpenId, TOK.vacancyOpen]
    );

    await client.query(
      `INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (vacancy_id) DO UPDATE SET
         desired_type_weights = EXCLUDED.desired_type_weights,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [
        vacancyOpenId,
        JSON.stringify({ 5: 3, 1: 2, 6: 2, 3: 1 }),
        '<p>Priorizar <strong>T5/T1/T6</strong> (análise + processo). T3 como executor complementar.</p>',
      ]
    );

    // Vaga fechada (outsourcing — pretensão oculta) + prazo passado (notificação)
    const vacClosed = await client.query(
      `INSERT INTO vacancies (
         company_id, title, slug, status, positions_count, target_date, deleted,
         description, salary_min, salary_max, client_report_show_salary
       ) VALUES (
         $1, $2, $3, 'closed', 1, (CURRENT_DATE - 3), FALSE,
         $4, $5, $6, FALSE
       ) RETURNING id`,
      [
        companyId,
        'Analista de Dados (encerrada)',
        'analista-dados-encerrada',
        '<p>Vaga encerrada — útil para validar status closed e notificação.</p>',
        '8000.00',
        '12000.00',
      ]
    );
    const vacancyClosedId = vacClosed.rows[0].id;

    await client.query(
      `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
       VALUES ($1, $2, FALSE, NOW() - INTERVAL '1 day')`,
      [vacancyClosedId, TOK.vacancyClosed]
    );

    const created = [];

    async function insertPerson(p, { employee }) {
      const area = areaByKey[p.areaKey] || fallbackArea;
      const scores = p.scores || makeScoresBiased(p.topType);
      const email = `${p.key.replace(/[^a-z]/g, '')}@${DOMAIN}`;
      const hrNotes = employee
        ? `<p><strong>Colaborador demo T${p.topType}.</strong> Dados completos para Equipe / Comparar / 1:1.</p>`
        : p.interviewNotes ||
          `<p><strong>Candidato — ${p.vacancyStage || p.pipeline}.</strong> Pipeline de validação.</p>`;

      const cand = await client.query(
        `INSERT INTO candidates (
           company_id, full_name, email, phone, linkedin_url, city, state,
           salary_expectation, availability, source, consent_at,
           employment_status, hired_at, start_date, birth_date, hr_notes
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW() - INTERVAL '20 days',
           $11, $12::timestamptz, $13::date, $14::date, $15
         ) RETURNING id`,
        [
          companyId,
          p.fullName,
          email,
          p.phone || null,
          p.linkedin || `https://linkedin.com/in/${p.key}-todosdados`,
          p.city || null,
          p.state || null,
          p.salary || null,
          p.availability || (employee ? 'immediate' : null),
          p.source || (employee ? 'referral' : 'linkedin'),
          employee ? 'employee' : 'candidate',
          employee ? new Date(Date.now() - 100 * 86400000).toISOString() : null,
          employee ? p.startDate || calendarYmd(p.workAnnivInDays ?? 40, p.tenureYears ?? 2) : null,
          employee ? p.birthDate || calendarYmd(p.birthInDays ?? 20, p.ageYears ?? 32) : null,
          hrNotes,
        ]
      );
      const candidateId = cand.rows[0].id;
      const employeeStartDate = employee
        ? p.startDate || calendarYmd(p.workAnnivInDays ?? 40, p.tenureYears ?? 2)
        : null;

      const assVacancyId = employee ? null : vacancyOpenId;
      const ass = await client.query(
        `INSERT INTO assessments (
           candidate_id, company_id, area_id, top_type, scores, source,
           vacancy_id, pipeline_stage, rejection_reason, hired_at, start_date,
           fill_duration_ms, copy_event_count, created_at
         ) VALUES (
           $1,$2,$3,$4,$5::jsonb,$6,
           $7,$8,$9,
           $10::timestamptz, $11::date,
           $12, $13, NOW() - ($14 || ' days')::interval
         ) RETURNING id`,
        [
          candidateId,
          companyId,
          area.id,
          p.topType,
          JSON.stringify(scores),
          SOURCE,
          assVacancyId,
          employee ? 'hired' : p.pipeline || 'test_completed',
          p.rejectionReason || null,
          employee ? new Date(Date.now() - 100 * 86400000).toISOString() : null,
          employeeStartDate,
          150000 + Math.floor(Math.random() * 100000),
          employee ? 0 : Math.floor(Math.random() * 3),
          String(employee ? 60 + Math.floor(Math.random() * 30) : 3 + Math.floor(Math.random() * 12)),
        ]
      );
      const assessmentId = ass.rows[0].id;

      if (employee) {
        await client.query(
          `INSERT INTO assessment_pipeline_history
             (assessment_id, from_stage, to_stage, changed_by_user_id, changed_at)
           VALUES
             ($1, 'new', 'interview', $2, NOW() - INTERVAL '110 days'),
             ($1, 'interview', 'test_completed', $2, NOW() - INTERVAL '105 days'),
             ($1, 'test_completed', 'screening', $2, NOW() - INTERVAL '102 days'),
             ($1, 'screening', 'approved', $2, NOW() - INTERVAL '101 days'),
             ($1, 'approved', 'hired', $2, NOW() - INTERVAL '100 days')`,
          [assessmentId, hrUserId]
        );
      }

      let vacancyCandidateId = null;
      if (!employee) {
        const vc = await client.query(
          `INSERT INTO vacancy_candidates (
             vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage,
             rejection_reason, created_by_user_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id`,
          [
            vacancyOpenId,
            candidateId,
            companyId,
            p.interviewNotes ||
              `<p>Notas de entrevista — estágio <strong>${p.vacancyStage}</strong>.</p>`,
            p.vacancyStage || p.pipeline || 'interview',
            p.rejectionReason || null,
            hrUserId,
          ]
        );
        vacancyCandidateId = vc.rows[0].id;
      }

      let attemptId = null;
      let motivatorsTop = [];
      let dimensionScores = null;
      if (p.motivators && motivatorsDefId) {
        const payload = motivatorsPayload(p.motivators);
        dimensionScores = payload.dimensionScores;
        motivatorsTop = motivatorsTopFromKeys(p.motivators, dimensionScores);
        const ae = await client.query(
          `INSERT INTO ae_attempts (
             definition_id, company_id, candidate_id, area_id, status,
             started_at, completed_at, dimension_scores, ranking, profile_summary,
             manager_recommendations, algorithm_version
           ) VALUES (
             $1,$2,$3,$4,'completed',
             NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days',
             $5::jsonb, $6::jsonb, $7, $8, $9
           ) RETURNING id`,
          [
            motivatorsDefId,
            companyId,
            candidateId,
            area.id,
            JSON.stringify(payload.dimensionScores),
            JSON.stringify(payload.ranking),
            `Demo Todos os Dados: tende a buscar ${p.motivators.slice(0, 2).join(' e ')}.`,
            JSON.stringify({
              do: [`Alinhar expectativas em torno de ${p.motivators[0]}`],
              avoid: ['Rotular a pessoa só pelo tipo predominante'],
            }),
            AE_SCORING_ENGINE_VERSION,
          ]
        );
        attemptId = ae.rows[0].id;
      }

      if (employee) {
        await client.query(
          `INSERT INTO one_on_ones (
             company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
           ) VALUES (
             $1,$2, CURRENT_DATE - $3::int, $4, $5, $6
           )`,
          [
            companyId,
            candidateId,
            String(2 + (p.topType % 5)),
            `<p>1:1 com ${p.fullName} (T${p.topType}).</p><ul><li>Prioridades do trimestre</li><li>Colaboração no time</li></ul>`,
            `<p>Revisitar em 2 semanas; validar hipóteses de gestão.</p>`,
            hrUserId,
          ]
        );
      }

      return {
        ...p,
        email,
        candidateId,
        assessmentId,
        attemptId,
        vacancyCandidateId,
        scores,
        motivatorsTop,
        areaLabel: area.label,
        areaId: area.id,
      };
    }

    for (const p of EMPLOYEES) {
      created.push(await insertPerson(p, { employee: true }));
    }
    for (const p of APPLICANTS) {
      created.push(await insertPerson(p, { employee: false }));
    }

    // Convite eneagrama (sent) — nina
    const nina = created.find((c) => c.key === 'nina');
    if (nina) {
      await client.query(
        `INSERT INTO candidate_invites (
           vacancy_id, company_id, candidate_name, candidate_email, token, status,
           sent_at, candidate_id, created_by_user_id
         ) VALUES (
           $1,$2,$3,$4,$5,'sent', NOW() - INTERVAL '2 days', $6, $7
         )`,
        [vacancyOpenId, companyId, nina.fullName, nina.email, TOK.candInvite, nina.candidateId, hrUserId]
      );
    }

    // Convite Motivadores aberto (pending)
    if (motivatorsDefId && nina) {
      await client.query(
        `INSERT INTO ae_invites (
           definition_id, company_id, candidate_id, candidate_name, candidate_email,
           token, status, expires_at, created_by_user_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,'sent', NOW() + INTERVAL '30 days', $7
         )`,
        [
          motivatorsDefId,
          companyId,
          nina.candidateId,
          nina.fullName,
          nina.email,
          TOK.aeInvite,
          hrUserId,
        ]
      );
    }

    // Relatório /r rico (shortlist: Pedro + Lara advance, Marina discuss)
    const RUBRIC_WEIGHTS = normalizeReportWeights({ 5: 3, 1: 2, 6: 2, 3: 1 });
    const reportKeys = ['pedro', 'lara', 'marina'];
    const executiveNoteRaw = `<p><strong>Quem avançar:</strong> Pedro Henrique Santos (T5) e Lara Mendonça (T1) — aderência à rubrica (análise + processo) e maturidade de entrega.</p>
<p><strong>Por quê (fit / contexto da vaga):</strong> A vaga Engenheiro(a) Fullstack — Plataforma prioriza T5/T1/T6. Pedro lidera em perfil investigativo; Lara complementa qualidade. Marina Duarte (T3) em conversar: boa execução, validar ritmo vs processo.</p>
<p><strong>Alertas / pontos a explorar na entrevista:</strong> Pedro — profundidade sem travar o sprint. Lara — colaboração com times mais “atalho”. Marina — decisão sob pressão e documentação.</p>
<p><strong>Próximo passo sugerido:</strong> Agendar entrevistas técnicas com o time do cliente para Pedro e Lara; segunda passagem com Marina se houver capacidade. Gustavo fora (gap técnico); Otávio em banco interno.</p>`;
    const vacancyDesc =
      '<p><strong>Missão:</strong> evoluir o produto 30Team (Next.js + Postgres) com qualidade e previsibilidade.</p><ul><li>React / Node em produto multi-tenant</li><li>SQL, índices e performance em listagens</li><li>Cultura de entrega com revisão e documentação</li></ul>';
    const note = sanitizeRichTextHtml(executiveNoteRaw, 8000);
    const description = sanitizeRichTextHtml(vacancyDesc, 12000);
    const weightedTypes = rubricWeightedTypes(RUBRIC_WEIGHTS);

    const snapshot = {
      generatedAt: new Date().toISOString(),
      vacancy: {
        id: Number(vacancyOpenId),
        title: 'Engenheiro(a) Fullstack — Plataforma',
        companyName: COMPANY_NAME,
        positionsCount: 2,
        status: 'open',
        description: description && !isRichTextEmpty(description) ? description : null,
      },
      privacy: { showSalaryExpectation: true },
      rubricSummary: {
        hasRubric: weightedTypes.length > 0,
        weightedTypes,
        notes: 'Priorizar T5/T1/T6 (análise + processo). T3 como executor complementar.',
      },
      executiveNote: note && !isRichTextEmpty(note) ? note : null,
      candidates: reportKeys
        .map((key) => created.find((c) => c.key === key))
        .filter(Boolean)
        .map((p) => {
          const fit = computeAreaScore010(p.scores, RUBRIC_WEIGHTS);
          const align = fitTypeAlignment(p.scores, RUBRIC_WEIGHTS);
          const baseRec = p.recommendation || recommendationFromStage(p.vacancyStage || p.pipeline);
          return {
            name: p.fullName,
            topType: p.topType,
            scores: p.scores,
            pipelineStage: p.vacancyStage || p.pipeline,
            recommendation: normalizeRecommendation(p.recommendation, baseRec),
            why: p.why || null,
            watchOut: p.watchOut || null,
            interviewProbe: p.interviewProbe || null,
            consultantNote: null,
            city: p.city || null,
            state: p.state || null,
            salaryExpectation: p.salary || null,
            availability: p.availability || null,
            areaLabel: p.areaLabel || 'Tecnologia',
            vacancyFitScore010: fit.score010,
            vacancyFitLabel: fit.label,
            fitAlignedTypes: align.alignedTypes,
            fitGapTypes: align.gapTypes,
            motivatorsTop: p.motivatorsTop || [],
          };
        }),
    };

    await client.query(
      `INSERT INTO vacancy_report_shares (
         vacancy_id, company_id, token, title, executive_note, snapshot,
         active, expires_at, created_by_user_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6::jsonb, TRUE, NOW() + INTERVAL '30 days', $7
       )`,
      [
        vacancyOpenId,
        companyId,
        TOK.report,
        'Shortlist — Fullstack Plataforma',
        snapshot.executiveNote,
        JSON.stringify(snapshot),
        hrUserId,
      ]
    );

    // Notificações (lidas + não lidas) para HR e Direction
    const pedro = created.find((c) => c.key === 'pedro');
    const elena = created.find((c) => c.key === 'elena');
    const notifs = [];
    if (pedro) {
      notifs.push({
        type: 'enneagram_completed',
        recipient: hrUserId,
        payload: {
          candidateId: pedro.candidateId,
          assessmentId: pedro.assessmentId,
          candidateName: pedro.fullName,
          topType: pedro.topType,
          vacancyId: vacancyOpenId,
        },
        entityType: 'candidate',
        entityId: pedro.candidateId,
        read: false,
      });
      if (pedro.attemptId) {
        notifs.push({
          type: 'motivators_completed',
          recipient: hrUserId,
          payload: {
            candidateId: pedro.candidateId,
            attemptId: pedro.attemptId,
            candidateName: pedro.fullName,
          },
          entityType: 'candidate',
          entityId: pedro.candidateId,
          read: false,
        });
      }
    }
    if (elena) {
      notifs.push({
        type: 'enneagram_completed',
        recipient: dirUserId,
        payload: {
          candidateId: elena.candidateId,
          assessmentId: elena.assessmentId,
          candidateName: elena.fullName,
          topType: elena.topType,
        },
        entityType: 'candidate',
        entityId: elena.candidateId,
        read: true,
      });
    }
    notifs.push({
      type: 'vacancy_deadline_approaching',
      recipient: hrUserId,
      payload: {
        vacancyId: vacancyOpenId,
        vacancyTitle: 'Engenheiro(a) Fullstack — Plataforma',
        targetDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      },
      entityType: 'vacancy',
      entityId: vacancyOpenId,
      dedupe: `vacancy_deadline:${vacancyOpenId}:open`,
      read: false,
    });
    notifs.push({
      type: 'vacancy_closed',
      recipient: hrUserId,
      payload: {
        vacancyId: vacancyClosedId,
        vacancyTitle: 'Analista de Dados (encerrada)',
      },
      entityType: 'vacancy',
      entityId: vacancyClosedId,
      dedupe: `vacancy_closed:${vacancyClosedId}`,
      read: false,
    });
    notifs.push({
      type: 'vacancy_deadline_approaching',
      recipient: dirUserId,
      payload: {
        vacancyId: vacancyOpenId,
        vacancyTitle: 'Engenheiro(a) Fullstack — Plataforma',
        targetDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      },
      entityType: 'vacancy',
      entityId: vacancyOpenId,
      dedupe: `vacancy_deadline:${vacancyOpenId}:open`,
      read: false,
    });

    for (const n of notifs) {
      await client.query(
        `INSERT INTO manager_notifications (
           company_id, recipient_user_id, type, payload,
           entity_type, entity_id, dedupe_key, read_at, created_at
         ) VALUES (
           $1,$2,$3,$4::jsonb,$5,$6,$7,
           $8::timestamptz,
           NOW() - ($9 || ' hours')::interval
         )`,
        [
          companyId,
          n.recipient,
          n.type,
          JSON.stringify(n.payload),
          n.entityType || null,
          n.entityId || null,
          n.dedupe || null,
          n.read ? new Date().toISOString() : null,
          String(Math.floor(Math.random() * 48) + 1),
        ]
      );
    }

    await client.query(
      `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'demo_seed_todos_os_dados', 'company', $2, $3::jsonb)`,
      [hrUserId, String(companyId), JSON.stringify({ slug: SLUG, people: created.length })]
    ).catch(() => {});

    await client.query('COMMIT');

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    console.log('\n══════════════════════════════════════════════════');
    console.log('  DEMO Todos os Dados pronta (tenant isolado)');
    console.log('══════════════════════════════════════════════════');
    console.log(`  Empresa:      ${COMPANY_NAME}  slug=${SLUG}  id=${companyId}`);
    console.log(`  Login HR:     ${HR_EMAIL}`);
    console.log(`  Login Dir:    ${DIR_EMAIL}`);
    console.log(`  Senha:        ${PASSWORD}`);
    console.log(`  Pessoas:      ${created.length}`);
    console.log(`  Motivadores:  ${motivatorsDefId ? 'ok' : 'PULAR — npm run db:seed-motivators'}`);
    console.log('');
    console.log('  Links:');
    console.log(`    Painel:      ${appUrl}/login`);
    console.log(`    Empresa /t:  ${appUrl}/t/${TOK.company}`);
    console.log(`    Vaga /v:     ${appUrl}/v/${TOK.vacancyOpen}`);
    console.log(`    Relatório:   ${appUrl}/r/${TOK.report}`);
    if (motivatorsDefId) {
      console.log(`    Motivadores: ${appUrl}/assessment/motivators/${TOK.aeInvite}`);
    }
    console.log('');
    console.log('  Validar: Overview, Equipe (T1–T9), Comparar, Vagas (todos estágios),');
    console.log('  Motivadores, 1:1, notificações (bolinha), relatório /r, flag salário.');
    console.log('══════════════════════════════════════════════════\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
