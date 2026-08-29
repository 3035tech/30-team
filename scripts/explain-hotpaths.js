/**
 * EXPLAIN checklist for B-2800/B-2801 hot paths (read-only).
 *
 * Prefer DTOV:
 *   npm run dtov:reset
 *   npm run dtov:explain
 *   npm run dtov:down
 *
 * Safety: refuses non-DTOV hosts (same rules as harness).
 */

import pg from 'pg';
import { getPgBaseConfig } from '../lib/pg-config.js';

const { Client } = pg;

function assertDtovTarget(cfg) {
  const host = String(cfg.host || '');
  const port = Number(cfg.port);
  const db = String(cfg.database || '');
  const user = String(cfg.user || '');
  const ok =
    (host === '127.0.0.1' || host === 'localhost') &&
    port === 55432 &&
    db === 'enneagram_dtov' &&
    user === 'dtov';
  if (!ok) {
    throw new Error(
      `Refuse EXPLAIN outside DTOV (got ${user}@${host}:${port}/${db}). Use npm run dtov:reset first.`
    );
  }
}

const HOTPATHS = [
  {
    id: 'assessments_company_created',
    note: 'Dashboard list / overview funnel — expect Index Scan on company+created',
    sql: `
EXPLAIN (FORMAT TEXT)
SELECT ass.id
FROM assessments ass
JOIN candidates c ON c.id = ass.candidate_id
WHERE c.company_id = $1
ORDER BY ass.created_at DESC
LIMIT 20`,
  },
  {
    id: 'candidates_employees_company',
    note: 'HR Score / Turnover scan — employees by company',
    sql: `
EXPLAIN (FORMAT TEXT)
SELECT id
FROM candidates
WHERE company_id = $1
  AND employment_status = 'employee'
ORDER BY id
LIMIT 100`,
  },
  {
    id: 'vacancy_candidates_by_vacancy',
    note: 'listVacancyCandidates COUNT + page',
    sql: `
EXPLAIN (FORMAT TEXT)
SELECT COUNT(*)::int AS n
FROM vacancy_candidates
WHERE vacancy_id = $1`,
  },
  {
    id: 'ae_attempts_candidate_completed',
    note: 'Motivators DISTINCT ON batch for HR/Turnover',
    sql: `
EXPLAIN (FORMAT TEXT)
SELECT DISTINCT ON (candidate_id) candidate_id, dimension_scores
FROM ae_attempts
WHERE candidate_id = ANY($1::bigint[])
  AND status = 'completed'
  AND dimension_scores IS NOT NULL
ORDER BY candidate_id, completed_at DESC`,
  },
  {
    id: 'open_vacancies_company',
    note: 'Overview open vacancy list',
    sql: `
EXPLAIN (FORMAT TEXT)
SELECT v.id, v.title
FROM vacancies v
JOIN companies co ON co.id = v.company_id
WHERE v.company_id = $1
  AND v.deleted = FALSE
  AND co.deleted = FALSE
  AND v.status = 'open'
ORDER BY v.target_date ASC NULLS LAST, v.created_at DESC
LIMIT 8`,
  },
];

async function main() {
  const cfg = getPgBaseConfig();
  assertDtovTarget(cfg);

  const client = new Client(cfg);
  await client.connect();

  const companyRes = await client.query(
    `SELECT id FROM companies WHERE deleted = FALSE ORDER BY id LIMIT 1`
  );
  const companyId = companyRes.rows[0]?.id;
  if (!companyId) throw new Error('No company in DTOV — run dtov:reset / seed');

  const vacRes = await client.query(
    `SELECT id FROM vacancies WHERE company_id = $1 AND deleted = FALSE ORDER BY id LIMIT 1`,
    [companyId]
  );
  const vacancyId = vacRes.rows[0]?.id || 1;

  const candRes = await client.query(
    `SELECT id FROM candidates WHERE company_id = $1 ORDER BY id LIMIT 5`,
    [companyId]
  );
  const candidateIds = candRes.rows.map((r) => r.id);
  if (candidateIds.length === 0) candidateIds.push(1);

  let failed = 0;
  for (const hp of HOTPATHS) {
    const params =
      hp.id === 'vacancy_candidates_by_vacancy'
        ? [vacancyId]
        : hp.id === 'ae_attempts_candidate_completed'
          ? [candidateIds]
          : [companyId];
    process.stdout.write(`\n## ${hp.id}\n${hp.note}\n`);
    try {
      const res = await client.query(hp.sql, params);
      const plan = res.rows.map((r) => Object.values(r)[0]).join('\n');
      console.log(plan);
      if (/Seq Scan on (assessments|candidates|vacancy_candidates|ae_attempts)\b/i.test(plan)) {
        console.log('⚠ note: Seq Scan present — review indexes if this is a hot tenant path');
      } else {
        console.log('✓ no obvious Seq Scan on primary hot tables');
      }
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${hp.id}:`, err.message);
    }
  }

  await client.end();
  if (failed) process.exit(1);
  console.log('\nok · explain-hotpaths');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
