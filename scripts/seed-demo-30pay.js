/**
 * Seed DEMO isolado — empresa 30pay
 *
 * Cria/recria APENAS o tenant slug=30pay (não mexe em outras empresas).
 * Cobre: login RH, Equipe, Compat (tensão/sinergia), Vagas/kanban, Motivadores,
 * People 1:1, notas HTML, timeline, relatório cliente /r.
 *
 * Pré-requisitos:
 *   - migrations aplicadas
 *   - areas populadas
 *   - opcional: npm run db:seed-motivators (se ae_definitions.motivators não existir, o script avisa)
 *
 * Uso:
 *   node --env-file=.env scripts/seed-demo-30pay.js
 *   # ou com POSTGRES_* no ambiente
 *   npm run db:seed-demo-30pay
 *
 * Alternativa SQL (pgAdmin): scripts/seed-demo-30pay.sql
 *
 * Login demo:
 *   email:    hr@30pay.demo
 *   senha:    Demo30pay!2026   (override JS: DEMO_30PAY_PASSWORD)
 */

import crypto from 'node:crypto';
import process from 'node:process';
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { MOTIVATORS_DIMENSIONS } from '../lib/ae/motivators-dimensions.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

const SLUG = '30pay';
const COMPANY_NAME = '30pay';
const HR_EMAIL = 'hr@30pay.demo';
const HR_PASSWORD = process.env.DEMO_30PAY_PASSWORD || 'Demo30pay!2026';
const DOMAIN = '30pay.demo';

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
    scores[t] = v;
    if (v > max) max = v;
  }
  scores[topType] = Math.max(scores[topType], max + 1);
  return scores;
}

function motivatorsPayload(topKeys) {
  const dims = MOTIVATORS_DIMENSIONS.map((d) => d.key);
  const scores = {};
  for (const k of dims) {
    scores[k] = 25 + Math.floor(Math.random() * 35);
  }
  let high = 92;
  for (const k of topKeys) {
    scores[k] = high;
    high -= 6;
  }
  const ranking = [...dims].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  return { dimensionScores: scores, ranking };
}

/**
 * 10 personas — fintech pagamentos.
 * Tensão demonstrável: T1×T8, T3×T9, T5×T7
 * Sinergia: T1×T5, T3×T7, T2×T9, T5×T6
 */
const PEOPLE = [
  {
    key: 'camila',
    fullName: 'Camila Ribeiro',
    email: `camila.ribeiro@${DOMAIN}`,
    phone: '+55 11 98001-1001',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/camila-ribeiro-30pay',
    areaKey: 'juridico',
    topType: 1,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['seguranca', 'proposito', 'desenvolvimento'],
    oneOnOne: true,
    hrNotes:
      '<p><strong>Compliance / PLD.</strong> Perfil metódico; tende a priorizar processo e documentação.</p><ul><li>Forte em auditoria de fluxo PIX</li><li>Atenção: tensão natural com lideranças mais “atalho” (ex.: André T8)</li></ul>',
  },
  {
    key: 'beatriz',
    fullName: 'Beatriz Nogueira',
    email: `beatriz.nogueira@${DOMAIN}`,
    phone: '+55 11 98001-1002',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/beatriz-nogueira-rh',
    areaKey: 'rh',
    topType: 2,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['relacionamentos', 'proposito', 'equilibrio'],
    oneOnOne: true,
    hrNotes:
      '<p><strong>People Partner.</strong> Facilita 1:1 e onboarding. Boa leitura de clima entre Growth e Risk.</p>',
  },
  {
    key: 'rafael',
    fullName: 'Rafael Mendes',
    email: `rafael.mendes@${DOMAIN}`,
    phone: '+55 11 98001-1003',
    city: 'Campinas',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/rafael-mendes-growth',
    areaKey: 'comercial',
    topType: 3,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['reconhecimento', 'desafio', 'financeiro'],
    oneOnOne: true,
    hrNotes:
      '<p><strong>Head of Growth.</strong> Orientado a meta. Em Comparar: tensão típica com T9 (Fernanda) e sinergia com T7 (Thiago).</p>',
  },
  {
    key: 'sofia',
    fullName: 'Sofia Almeida',
    email: `sofia.almeida@${DOMAIN}`,
    phone: '+55 21 98001-1004',
    city: 'Rio de Janeiro',
    state: 'RJ',
    linkedin: 'https://linkedin.com/in/sofia-almeida-produto',
    areaKey: 'produto',
    topType: 4,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['criatividade', 'autonomia', 'proposito'],
    oneOnOne: false,
    hrNotes: '<p>Product Design — jornadas de checkout e chargeback. Sensível a feedback genérico.</p>',
  },
  {
    key: 'lucas',
    fullName: 'Lucas Ferreira',
    email: `lucas.ferreira@${DOMAIN}`,
    phone: '+55 11 98001-1005',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/lucas-ferreira-risk',
    areaKey: 'tecnologia',
    topType: 5,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['autonomia', 'desafio', 'crescimento'],
    oneOnOne: true,
    hrNotes:
      '<p><strong>Staff Risk Eng.</strong> Sinergia forte com Camila (T1). Tensão clássica com Thiago (T7) em ritmo de entrega.</p>',
  },
  {
    key: 'juliana',
    fullName: 'Juliana Martins',
    email: `juliana.martins@${DOMAIN}`,
    phone: '+55 11 98001-1006',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/juliana-martins-ops',
    areaKey: 'operacoes',
    topType: 6,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['seguranca', 'relacionamentos', 'equilibrio'],
    oneOnOne: false,
    hrNotes: '<p>Risk Ops — conciliação e filas de disputa. Valoriza previsibilidade.</p>',
  },
  {
    key: 'thiago',
    fullName: 'Thiago Barbosa',
    email: `thiago.barbosa@${DOMAIN}`,
    phone: '+55 11 98001-1007',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/thiago-barbosa-pm',
    areaKey: 'marketing',
    topType: 7,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['crescimento', 'flexibilidade', 'desafio'],
    oneOnOne: false,
    hrNotes:
      '<p>Growth PM — experimentos rápidos. Use Comparar com Lucas (T5) para mostrar <em>tensão</em> de ritmo.</p>',
  },
  {
    key: 'andre',
    fullName: 'André Cavalcanti',
    email: `andre.cavalcanti@${DOMAIN}`,
    phone: '+55 11 98001-1008',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/andre-cavalcanti',
    areaKey: 'operacoes',
    topType: 8,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['lideranca', 'desafio', 'financeiro'],
    oneOnOne: true,
    hrNotes:
      '<p><strong>VP Operations.</strong> Decisão rápida. Em Compat: tensão com Camila (T1) — ótimo para demo de “onde o time trava”.</p>',
  },
  {
    key: 'fernanda',
    fullName: 'Fernanda Lopes',
    email: `fernanda.lopes@${DOMAIN}`,
    phone: '+55 11 98001-1009',
    city: 'Belo Horizonte',
    state: 'MG',
    linkedin: 'https://linkedin.com/in/fernanda-lopes-cs',
    areaKey: 'cs',
    topType: 9,
    employment: 'employee',
    pipeline: 'hired',
    vacancy: false,
    motivators: ['relacionamentos', 'equilibrio', 'proposito'],
    oneOnOne: false,
    hrNotes: '<p>CS Lead — retenção merchants. Tensão com Rafael (T3) em pressão de meta vs harmonia.</p>',
  },
  {
    key: 'pedro',
    fullName: 'Pedro Henrique Santos',
    email: `pedro.santos.candidato@${DOMAIN}`,
    phone: '+55 11 98001-1010',
    city: 'São Paulo',
    state: 'SP',
    linkedin: 'https://linkedin.com/in/pedro-henrique-backend',
    areaKey: 'tecnologia',
    topType: 5,
    employment: 'candidate',
    pipeline: 'screening',
    vacancy: true,
    vacancyStage: 'screening',
    motivators: ['autonomia', 'crescimento', 'desafio'],
    oneOnOne: false,
    hrNotes:
      '<p><strong>Candidato — Eng. Pagamentos.</strong> Entrevista ok; teste T5. Em triagem técnica.</p><ul><li>Disponibilidade: 30 dias</li><li>Expectativa: R$ 18–22k</li></ul>',
    availability: '30_days',
    source: 'linkedin',
    salary: '20000',
  },
];

/** Candidatos extras só no kanban (ainda contam no total? User asked 10 — keep 10 in PEOPLE; add 2 more for richer kanban) */
const EXTRA_APPLICANTS = [
  {
    key: 'marina',
    fullName: 'Marina Duarte',
    email: `marina.duarte.candidato@${DOMAIN}`,
    phone: '+55 11 98001-1011',
    city: 'Curitiba',
    state: 'PR',
    linkedin: null,
    areaKey: 'tecnologia',
    topType: 3,
    employment: 'candidate',
    pipeline: 'interview',
    vacancy: true,
    vacancyStage: 'interview',
    motivators: null,
    oneOnOne: false,
    hrNotes: '<p>Candidata — entrevista agendada. Perfil mais executor (T3).</p>',
    availability: '15_days',
    source: 'referral',
  },
  {
    key: 'gustavo',
    fullName: 'Gustavo Pires',
    email: `gustavo.pires.candidato@${DOMAIN}`,
    phone: '+55 11 98001-1012',
    city: 'São Paulo',
    state: 'SP',
    linkedin: null,
    areaKey: 'tecnologia',
    topType: 6,
    employment: 'candidate',
    pipeline: 'rejected',
    vacancy: true,
    vacancyStage: 'rejected',
    rejectionReason: 'skill_gap',
    motivators: null,
    oneOnOne: false,
    hrNotes: '<p>Reprovado em fit técnico (gap em settlement). Bom para mostrar etapa Reprovado na timeline.</p>',
    availability: 'immediate',
    source: 'job_board',
  },
];

async function purgeCompany(client, companyId) {
  // Ordem segura (FKs). Escopo: só este company_id.
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
    `DELETE FROM vacancy_rubrics r USING vacancies v WHERE r.vacancy_id = v.id AND v.company_id = $1`,
    [companyId]
  );
  await client.query(
    `DELETE FROM vacancy_links l USING vacancies v WHERE l.vacancy_id = v.id AND v.company_id = $1`,
    [companyId]
  );
  await client.query(
    `DELETE FROM candidate_invites WHERE company_id = $1`,
    [companyId]
  ).catch(() => {});
  await client.query(`DELETE FROM vacancies WHERE company_id = $1`, [companyId]);
  await client.query(`DELETE FROM candidates WHERE company_id = $1`, [companyId]);
  await client.query(`DELETE FROM company_links WHERE company_id = $1`, [companyId]);
  await client.query(`DELETE FROM users WHERE company_id = $1`, [companyId]);
  await client.query(`DELETE FROM companies WHERE id = $1`, [companyId]);
}

async function main() {
  const client = new Client(getPgBaseConfig());
  await client.connect();

  const areasRes = await client.query(`SELECT id, key, label FROM areas`);
  if (areasRes.rowCount === 0) {
    throw new Error('Tabela areas vazia. Rode migrations / bootstrap antes.');
  }
  const areaByKey = Object.fromEntries(areasRes.rows.map((r) => [r.key, r]));

  const defRes = await client.query(
    `SELECT id FROM ae_definitions WHERE LOWER(slug) = 'motivators' AND active = TRUE LIMIT 1`
  );
  const motivatorsDefId = defRes.rowCount ? defRes.rows[0].id : null;

  await client.query('BEGIN');
  try {
    const existing = await client.query(
      `SELECT id FROM companies WHERE LOWER(slug) = LOWER($1) AND deleted = FALSE LIMIT 1`,
      [SLUG]
    );
    if (existing.rowCount) {
      console.log(`↻ Removendo tenant demo anterior id=${existing.rows[0].id}…`);
      await purgeCompany(client, existing.rows[0].id);
    }

    const co = await client.query(
      `INSERT INTO companies (name, slug, active, deleted)
       VALUES ($1, $2, TRUE, FALSE)
       RETURNING id`,
      [COMPANY_NAME, SLUG]
    );
    const companyId = co.rows[0].id;

    const passwordHash = await hashPassword(HR_PASSWORD);
    const userIns = await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, locale, active, deleted)
       VALUES ($1, $2, $3, 'hr', 'pt-BR', TRUE, FALSE)
       RETURNING id, email, role`,
      [companyId, HR_EMAIL, passwordHash]
    );
    const hrUserId = userIns.rows[0].id;

    const companyLinkToken = token(18);
    await client.query(
      `INSERT INTO company_links (company_id, token, active, expires_at, require_candidate_email)
       VALUES ($1, $2, TRUE, NOW() + INTERVAL '365 days', TRUE)`,
      [companyId, companyLinkToken]
    );

    const vac = await client.query(
      `INSERT INTO vacancies (
         company_id, title, slug, status, positions_count, deleted, description,
         salary_min, salary_max
       ) VALUES (
         $1, $2, $3, 'open', 2, FALSE,
         $4, $5, $6
       ) RETURNING id, title`,
      [
        companyId,
        'Engenheiro(a) de Pagamentos',
        'engenheiro-pagamentos',
        '<p><strong>Missão:</strong> evoluir liquidação PIX/TED e conciliação.</p><ul><li>Node.js / Postgres</li><li>Experiência com filas e idempotência</li></ul>',
        '16000',
        '22000',
      ]
    );
    const vacancyId = vac.rows[0].id;

    const vacancyLinkToken = token(18);
    await client.query(
      `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
       VALUES ($1, $2, TRUE, NOW() + INTERVAL '180 days')`,
      [vacancyId, vacancyLinkToken]
    );

    await client.query(
      `INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (vacancy_id) DO UPDATE SET
         desired_type_weights = EXCLUDED.desired_type_weights,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [
        vacancyId,
        JSON.stringify({ 5: 3, 1: 2, 6: 2, 3: 1 }),
        '<p>Preferência por <strong>T5/T1/T6</strong> (análise + processo). Evitar só T7 sem lastro técnico.</p>',
      ]
    );

    const allPeople = [...PEOPLE, ...EXTRA_APPLICANTS];
    const created = [];

    for (const p of allPeople) {
      const area = areaByKey[p.areaKey] || areaByKey.outros || areasRes.rows[0];
      const scores = makeScoresBiased(p.topType);
      const cand = await client.query(
        `INSERT INTO candidates (
           company_id, full_name, email, phone, linkedin_url, city, state,
           salary_expectation, availability, source, consent_at,
           employment_status, hired_at, start_date, hr_notes
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW() - INTERVAL '40 days',
           $11,
           $12::timestamptz,
           $13::date,
           $14
         ) RETURNING id`,
        [
          companyId,
          p.fullName,
          p.email,
          p.phone || null,
          p.linkedin || null,
          p.city || null,
          p.state || null,
          p.salary || null,
          p.availability || (p.employment === 'employee' ? 'immediate' : null),
          p.source || (p.employment === 'employee' ? 'referral' : 'linkedin'),
          p.employment,
          p.employment === 'employee' ? new Date(Date.now() - 90 * 86400000).toISOString() : null,
          p.employment === 'employee' ? '2026-01-15' : null,
          p.hrNotes || null,
        ]
      );
      const candidateId = cand.rows[0].id;

      const assVacancyId = p.vacancy ? vacancyId : null;
      const ass = await client.query(
        `INSERT INTO assessments (
           candidate_id, company_id, area_id, top_type, scores, source,
           vacancy_id, pipeline_stage, rejection_reason, hired_at, start_date,
           fill_duration_ms, created_at
         ) VALUES (
           $1,$2,$3,$4,$5::jsonb,'demo_30pay',
           $6,$7,$8,
           $9::timestamptz, $10::date,
           $11, NOW() - ($12 || ' days')::interval
         ) RETURNING id`,
        [
          candidateId,
          companyId,
          area.id,
          p.topType,
          JSON.stringify(scores),
          assVacancyId,
          p.pipeline || 'test_completed',
          p.rejectionReason || null,
          p.employment === 'employee' ? new Date(Date.now() - 90 * 86400000).toISOString() : null,
          p.employment === 'employee' ? '2026-01-15' : null,
          180000 + Math.floor(Math.random() * 120000),
          String(20 + Math.floor(Math.random() * 40)),
        ]
      );
      const assessmentId = ass.rows[0].id;

      if (p.employment === 'employee') {
        await client.query(
          `INSERT INTO assessment_pipeline_history
             (assessment_id, from_stage, to_stage, changed_at)
           VALUES
             ($1, 'new', 'interview', NOW() - INTERVAL '100 days'),
             ($1, 'interview', 'test_completed', NOW() - INTERVAL '95 days'),
             ($1, 'test_completed', 'screening', NOW() - INTERVAL '92 days'),
             ($1, 'screening', 'approved', NOW() - INTERVAL '91 days'),
             ($1, 'approved', 'hired', NOW() - INTERVAL '90 days')`,
          [assessmentId]
        ).catch(() => {});
      }

      if (p.vacancy) {
        const vc = await client.query(
          `INSERT INTO vacancy_candidates (
             vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage,
             rejection_reason, created_by_user_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id`,
          [
            vacancyId,
            candidateId,
            companyId,
            p.hrNotes || null,
            p.vacancyStage || p.pipeline || 'interview',
            p.rejectionReason || null,
            hrUserId,
          ]
        );
        const vcId = vc.rows[0].id;
        if (p.vacancyStage === 'rejected') {
          await client.query(
            `INSERT INTO vacancy_candidate_pipeline_history
               (vacancy_candidate_id, from_stage, to_stage, reason, changed_at)
             VALUES
               ($1, 'new', 'interview', NULL, NOW() - INTERVAL '12 days'),
               ($1, 'interview', 'test_completed', NULL, NOW() - INTERVAL '8 days'),
               ($1, 'test_completed', 'rejected', $2, NOW() - INTERVAL '3 days')`,
            [vcId, p.rejectionReason || 'skill_gap']
          ).catch(() => {});
        } else if (p.vacancyStage === 'screening') {
          await client.query(
            `INSERT INTO vacancy_candidate_pipeline_history
               (vacancy_candidate_id, from_stage, to_stage, changed_at)
             VALUES
               ($1, 'new', 'interview', NOW() - INTERVAL '10 days'),
               ($1, 'interview', 'test_completed', NOW() - INTERVAL '6 days'),
               ($1, 'test_completed', 'screening', NOW() - INTERVAL '2 days')`,
            [vcId]
          ).catch(() => {});
        }
      }

      if (p.motivators && motivatorsDefId) {
        const { dimensionScores, ranking } = motivatorsPayload(p.motivators);
        await client.query(
          `INSERT INTO ae_attempts (
             definition_id, company_id, candidate_id, area_id, status,
             started_at, completed_at, dimension_scores, ranking, profile_summary,
             algorithm_version
           ) VALUES (
             $1,$2,$3,$4,'completed',
             NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
             $5::jsonb, $6::jsonb, $7, 'demo-seed'
           )`,
          [
            motivatorsDefId,
            companyId,
            candidateId,
            area.id,
            JSON.stringify(dimensionScores),
            JSON.stringify(ranking),
            `Demo: tende a buscar ${p.motivators.slice(0, 2).join(' e ')} no dia a dia.`,
          ]
        );
      }

      if (p.oneOnOne) {
        await client.query(
          `INSERT INTO one_on_ones (
             company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
           ) VALUES (
             $1,$2, CURRENT_DATE - 7,
             $3, $4, $5
           )`,
          [
            companyId,
            candidateId,
            `<p>1:1 de acompanhamento — alinhamos prioridades do trimestre e pontos de colaboração no time.</p><ul><li>Tema: ritmo vs qualidade</li><li>Tipo predominante: T${p.topType}</li></ul>`,
            `<p>Próximo passo: revisitar em 2 semanas; envolver contraparte de compatibilidade se houver atrito.</p>`,
            hrUserId,
          ]
        );
      }

      created.push({ ...p, candidateId, assessmentId, scores, areaLabel: area.label });
    }

    // Relatório cliente
    const shortlist = created.filter((p) =>
      ['pedro', 'marina'].includes(p.key) || (p.vacancy && p.vacancyStage === 'screening')
    );
    const reportPeople = created.filter((p) => p.key === 'pedro' || p.key === 'marina');
    const snapshot = {
      generatedAt: new Date().toISOString(),
      vacancy: {
        id: Number(vacancyId),
        title: 'Engenheiro(a) de Pagamentos',
        companyName: COMPANY_NAME,
        positionsCount: 2,
        status: 'open',
      },
      executiveNote:
        '<p><strong>Shortlist demo 30pay.</strong> Dois perfis técnicos com aderência a Risk/Pagamentos.</p>',
      candidates: reportPeople.map((p) => ({
        name: p.fullName,
        topType: p.topType,
        scores: p.scores,
        pipelineStage: p.vacancyStage || p.pipeline,
        areaLabel: p.areaLabel,
        vacancyFitScore010: p.topType === 5 ? 8.4 : 6.2,
        vacancyFitLabel: p.topType === 5 ? 'Alta aderência' : 'Aderência moderada',
      })),
    };
    const reportToken = token(20);
    await client.query(
      `INSERT INTO vacancy_report_shares (
         vacancy_id, company_id, token, title, executive_note, snapshot,
         active, expires_at, created_by_user_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6::jsonb, TRUE, NOW() + INTERVAL '30 days', $7
       )`,
      [
        vacancyId,
        companyId,
        reportToken,
        'Shortlist — Eng. Pagamentos (demo)',
        snapshot.executiveNote,
        JSON.stringify(snapshot),
        hrUserId,
      ]
    );

    await client.query('COMMIT');

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    console.log('\n══════════════════════════════════════════════════');
    console.log('  DEMO 30pay pronta (tenant isolado)');
    console.log('══════════════════════════════════════════════════');
    console.log(`  Empresa:     ${COMPANY_NAME} (id=${companyId})`);
    console.log(`  Login HR:    ${HR_EMAIL}`);
    console.log(`  Senha:       ${HR_PASSWORD}`);
    console.log(`  Pessoas:     ${created.length} (Equipe + kanban)`);
    console.log(`  Motivadores: ${motivatorsDefId ? 'ok' : 'PULAR — rode npm run db:seed-motivators'}`);
    console.log('');
    console.log('  Links:');
    console.log(`    Painel:     ${appUrl}/login`);
    console.log(`    Link /t:    ${appUrl}/t/${companyLinkToken}`);
    console.log(`    Vaga /v:    ${appUrl}/v/${vacancyLinkToken}`);
    console.log(`    Relatório:  ${appUrl}/r/${reportToken}`);
    console.log('');
    console.log('  Roteiro rápido da demo:');
    console.log('    1. Login HR → Overview / Equipe (lista + detalhe + timeline + notas)');
    console.log('    2. Comparar / Compat: Camila(T1)×André(T8) = tensão; Lucas(T5)×Camila = sinergia');
    console.log('    3. Rafael(T3)×Fernanda(T9) e Lucas(T5)×Thiago(T7) = tensão');
    console.log('    4. Vagas → kanban Eng. Pagamentos (Pedro triagem, Marina entrevista, Gustavo reprovado)');
    console.log('    5. Equipe → expandir Camila/Lucas → Gestão & 1:1 + hipóteses (se Motivadores ok)');
    console.log('    6. Relatório cliente no link /r acima');
    console.log('══════════════════════════════════════════════════\n');

    if (shortlist.length === 0) {
      /* noop */
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('seed-demo-30pay failed:', err.message || err);
  process.exit(1);
});
