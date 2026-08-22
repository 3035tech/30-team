/**
 * Regressão ampla (SQL + libs) — caça bugs “passados”, não o gate focado do DTOV smoke.
 *
 * Preferido (banco efêmero):
 *   npm run dtov:full
 *
 * Só a suíte (DB já seedado — DTOV ou outro Postgres com demo):
 *   DTOV=1 npm run test:full          # força alvo DTOV
 *   npm run test:full                 # usa POSTGRES_* do ambiente (.env) — cuidado
 *
 * Offline only (sem DB):
 *   npm run test:full -- --offline
 */

import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPgBaseConfig } from '../../lib/pg-config.js';
import { DTOV_DEFAULTS, assertDtovTarget, dtovEnv } from './harness.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const DEMO_SLUG = 'todos-os-dados-demo';
const TOK = {
  company: 'd0d0todosdadose5f60718293a4b5c6d7e8f01',
  vacancyOpen: 'e1e1todosdadose5f60718293a4b5c6d7e8f02',
  report: 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718',
  aeInvite: 'b4b4todosdadose5f60718293a4b5c6d7e8f05',
};

const results = [];

function ok(suite, name, detail = '') {
  results.push({ suite, name, status: 'pass', detail });
  process.stdout.write(`  ✓ ${suite}/${name}${detail ? ` — ${detail}` : ''}\n`);
}

function fail(suite, name, detail) {
  results.push({ suite, name, status: 'fail', detail: String(detail || '') });
  process.stderr.write(`  ✗ ${suite}/${name} — ${detail}\n`);
}

async function check(suite, name, fn) {
  try {
    const detail = await fn();
    ok(suite, name, typeof detail === 'string' ? detail : '');
  } catch (e) {
    fail(suite, name, e?.message || e);
  }
}

async function runOfflineLibs() {
  process.stdout.write('\n== offline libs ==\n');

  await check('lib', 'ae-scoring', async () => {
    const { computeMotivatorScores } = await import('../../lib/ae/scoring.js');
    const questions = [
      {
        id: '1',
        questionType: 'forced_choice',
        weight: 1,
        options: [
          { id: 'a', weights: { autonomia: 4 } },
          { id: 'b', weights: { seguranca: 4 } },
        ],
      },
    ];
    const out = computeMotivatorScores({
      questions,
      answers: [{ questionId: '1', optionId: 'a' }],
    });
    if (!out || typeof out !== 'object') throw new Error('empty scores');
    return 'ok';
  });

  await check('lib', 'assessment-score-export', async () => {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const src = await readFile(join(root, 'lib', 'assessment-score.js'), 'utf8');
    if (!src.includes('export function computeAssessmentFromAnswers')) {
      throw new Error('missing computeAssessmentFromAnswers export');
    }
    return 'source ok (node ESM skips Next resolution of i18n)';
  });

  await check('lib', 'permissions-hr', async () => {
    const { can, CAP } = await import('../../lib/permissions.js');
    const hr = { role: 'hr', companyId: 1 };
    if (!can(hr, CAP.VACANCIES_VIEW)) throw new Error('hr should view vacancies');
    if (can(hr, CAP.USERS_MANAGE)) throw new Error('hr must not manage users');
    return 'hr ACL ok';
  });

  await check('lib', 'permissions-admin-only', async () => {
    const { ADMIN_ONLY_CAPS, resolveCapabilities } = await import('../../lib/permissions.js');
    const set = resolveCapabilities({ role: 'hr', companyId: 1 });
    for (const c of ADMIN_ONLY_CAPS) {
      if (set.has(c)) throw new Error(`hr leaked admin cap ${c}`);
    }
    return 'no admin leak';
  });
  await check('lib', 'sanitize-html', async () => {
    const { sanitizeInterviewNotesHtml, htmlToPlainText } = await import('../../lib/sanitize-html.js');
    const dirty = '<p>oi</p><script>alert(1)</script>';
    const clean = sanitizeInterviewNotesHtml(dirty);
    if (/<script/i.test(clean)) throw new Error('script survived');
    if (!htmlToPlainText(clean).includes('oi')) throw new Error('text lost');
    return 'sanitized';
  });

  await check('lib', 'br-masks-salary', async () => {
    const { salaryAmountNumber, formatVacancySalaryRangeDisplay } = await import('../../lib/br-masks.js');
    if (salaryAmountNumber('3500.00') !== 3500) throw new Error(`expected 3500 got ${salaryAmountNumber('3500.00')}`);
    const range = formatVacancySalaryRangeDisplay('3500.00', '5000.00');
    if (!range || !range.includes('3.500')) throw new Error(`bad range ${range}`);
    return range;
  });

  await check('lib', 'vacancy-description-mode', async () => {
    const {
      isVacancyDescriptionSparse,
      resolveVacancyDescriptionMode,
      buildVacancyDescriptionTemplate,
    } = await import('../../lib/vacancy-description-template.js');
    if (!isVacancyDescriptionSparse('')) throw new Error('empty should be sparse');
    if (resolveVacancyDescriptionMode('auto', '') !== 'draft') throw new Error('expected draft');
    if (resolveVacancyDescriptionMode('auto', `<p>${'x'.repeat(50)}</p>`) !== 'improve') {
      throw new Error('expected improve');
    }
    if (!buildVacancyDescriptionTemplate('pt-BR').includes('<h2>')) throw new Error('no template');
    return 'modes ok';
  });

  await check('lib', 'job-posting-jsonld-guards', async () => {
    const { buildJobPostingJsonLd, serializeJsonLdForScript } = await import(
      '../../lib/public-vacancy-posting.js'
    );
    const closed = buildJobPostingJsonLd({
      status: 'closed',
      publicAllowIndex: true,
      title: 'X',
      vacancyId: 1,
    });
    if (closed != null) throw new Error('closed must not emit JobPosting');
    const open = buildJobPostingJsonLd({
      status: 'open',
      publicAllowIndex: true,
      title: 'Dev',
      vacancyId: 1,
      description: '<p>hi</p></script><p>x</p>',
      showSalary: true,
      salaryMin: '3500.00',
      salaryMax: null,
      showCompany: false,
      company: { id: 1 },
      pageUrl: 'http://localhost:3000/vaga/a/b',
      createdAt: new Date('2026-01-15'),
      targetDate: new Date('2026-08-01'),
    });
    if (!open || open['@type'] !== 'JobPosting') throw new Error('expected JobPosting');
    if (open.baseSalary?.value?.minValue !== 3500) {
      throw new Error(`salary wrong: ${JSON.stringify(open.baseSalary)}`);
    }
    if (!String(open.validThrough || '').startsWith('2026-08-01')) {
      throw new Error(`validThrough missing: ${open.validThrough}`);
    }
    const raw = serializeJsonLdForScript(open);
    if (raw.includes('</script>')) throw new Error('unescaped script closer');
    return 'jsonld ok';
  });
}

async function runSqlSuite(client) {
  process.stdout.write('\n== sql integrity (demo tenant) ==\n');

  const company = await client.query(
    `SELECT id FROM companies WHERE slug = $1 AND deleted = FALSE LIMIT 1`,
    [DEMO_SLUG]
  );
  if (!company.rowCount) {
    fail('sql', 'demo-company', `missing company slug=${DEMO_SLUG} — run npm run dtov:reset`);
    return;
  }
  const companyId = company.rows[0].id;
  ok('sql', 'demo-company', `id=${companyId}`);

  await check('sql', 'schema-migrations', async () => {
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM schema_migrations`);
    if (r.rows[0].n < 20) throw new Error(`too few migrations: ${r.rows[0].n}`);
    return `${r.rows[0].n} applied`;
  });

  await check('sql', 'soft-delete-companies', async () => {
    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM companies WHERE deleted = TRUE AND slug = $1`,
      [DEMO_SLUG]
    );
    // live demo must not be deleted
    const live = await client.query(
      `SELECT 1 FROM companies WHERE id = $1 AND deleted = FALSE`,
      [companyId]
    );
    if (!live.rowCount) throw new Error('demo company deleted');
    return `tombstones=${r.rows[0].n}`;
  });

  await check('sql', 'hr-user', async () => {
    const r = await client.query(
      `SELECT id, role FROM users WHERE company_id = $1 AND LOWER(email) = $2 AND deleted = FALSE`,
      [companyId, 'hr@todos-os-dados.demo']
    );
    if (!r.rowCount || r.rows[0].role !== 'hr') throw new Error('hr user missing');
    return `id=${r.rows[0].id}`;
  });

  await check('sql', 'direction-user', async () => {
    const r = await client.query(
      `SELECT 1 FROM users WHERE company_id = $1 AND role = 'direction' AND deleted = FALSE LIMIT 1`,
      [companyId]
    );
    if (!r.rowCount) throw new Error('direction user missing');
  });

  await check('sql', 'company-link-token', async () => {
    const r = await client.query(
      `SELECT 1 FROM company_links WHERE company_id = $1 AND token = $2 AND active = TRUE LIMIT 1`,
      [companyId, TOK.company]
    );
    if (!r.rowCount) throw new Error('company link token missing');
  });

  await check('sql', 'vacancy-open-link', async () => {
    const r = await client.query(
      `SELECT v.id FROM vacancies v
       JOIN vacancy_links l ON l.vacancy_id = v.id
       WHERE v.company_id = $1 AND l.token = $2 AND v.status = 'open' AND v.deleted = FALSE
       LIMIT 1`,
      [companyId, TOK.vacancyOpen]
    );
    if (!r.rowCount) throw new Error('open vacancy link missing');
  });

  await check('sql', 'vacancy-closed-exists', async () => {
    const r = await client.query(
      `SELECT 1 FROM vacancies WHERE company_id = $1 AND status = 'closed' AND deleted = FALSE LIMIT 1`,
      [companyId]
    );
    if (!r.rowCount) throw new Error('no closed vacancy');
  });

  await check('sql', 'public-page-open-indexed', async () => {
    const r = await client.query(
      `SELECT 1 FROM vacancies
       WHERE company_id = $1 AND public_page_enabled AND public_allow_index AND status = 'open'
         AND deleted = FALSE LIMIT 1`,
      [companyId]
    );
    if (!r.rowCount) throw new Error('missing public indexed open vacancy — seed public-vacancy-page');
  });

  await check('sql', 'public-page-closed', async () => {
    const r = await client.query(
      `SELECT 1 FROM vacancies
       WHERE company_id = $1 AND public_page_enabled AND status = 'closed' AND deleted = FALSE LIMIT 1`,
      [companyId]
    );
    if (!r.rowCount) throw new Error('missing public closed vacancy');
  });

  await check('sql', 'company-website-about', async () => {
    const r = await client.query(
      `SELECT website, about_html FROM companies WHERE id = $1`,
      [companyId]
    );
    if (!r.rows[0]?.website || !r.rows[0]?.about_html) throw new Error('company profile empty');
  });

  await check('sql', 'candidates-in-company', async () => {
    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM candidates WHERE company_id = $1`,
      [companyId]
    );
    if (r.rows[0].n < 3) throw new Error(`expected several candidates, got ${r.rows[0].n}`);
    return `${r.rows[0].n} candidates`;
  });

  await check('sql', 'assessments-present', async () => {
    const r = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM assessments a
       JOIN candidates c ON c.id = a.candidate_id
       WHERE c.company_id = $1`,
      [companyId]
    );
    if (r.rows[0].n < 1) throw new Error('no assessments');
    return `${r.rows[0].n} assessments`;
  });

  await check('sql', 'pipeline-stages', async () => {
    const r = await client.query(
      `SELECT COUNT(DISTINCT pipeline_stage)::int AS n
       FROM vacancy_candidates vc
       JOIN vacancies v ON v.id = vc.vacancy_id
       WHERE v.company_id = $1`,
      [companyId]
    );
    if (r.rows[0].n < 2) throw new Error(`narrow pipeline diversity: ${r.rows[0].n}`);
    return `${r.rows[0].n} stages`;
  });

  await check('sql', 'motivators-definition', async () => {
    const r = await client.query(
      `SELECT 1 FROM ae_definitions WHERE LOWER(slug) = 'motivators' AND active = TRUE LIMIT 1`
    );
    if (!r.rowCount) throw new Error('motivators def missing');
  });

  await check('sql', 'motivators-questions', async () => {
    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM ae_questions q
       JOIN ae_definitions d ON d.id = q.definition_id
       WHERE LOWER(d.slug) = 'motivators' AND q.active = TRUE`
    );
    if (r.rows[0].n < 5) throw new Error(`few questions: ${r.rows[0].n}`);
    return `${r.rows[0].n} questions`;
  });

  await check('sql', 'ae-invite-token', async () => {
    const r = await client.query(
      `SELECT 1 FROM ae_invites WHERE token = $1 AND company_id = $2 LIMIT 1`,
      [TOK.aeInvite, companyId]
    );
    if (!r.rowCount) throw new Error('ae invite token missing');
  });

  await check('sql', 'one-on-ones', async () => {
    const r = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM one_on_ones o
       JOIN candidates c ON c.id = o.candidate_id
       WHERE c.company_id = $1`,
      [companyId]
    );
    if (r.rows[0].n < 1) throw new Error('no 1:1 rows');
    return `${r.rows[0].n} one_on_ones`;
  });

  await check('sql', 'report-share-token', async () => {
    const r = await client.query(
      `SELECT 1 FROM vacancy_report_shares WHERE token = $1 LIMIT 1`,
      [TOK.report]
    );
    if (!r.rowCount) throw new Error('report share token missing');
  });

  await check('sql', 'tenant-isolation-sample', async () => {
    // Candidates of demo company must not reference another company_id via join mistakes
    const r = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM assessments a
       JOIN candidates c ON c.id = a.candidate_id
       WHERE c.company_id = $1 AND a.vacancy_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM vacancies v WHERE v.id = a.vacancy_id AND v.company_id = c.company_id
         )`,
      [companyId]
    );
    if (r.rows[0].n > 0) throw new Error(`${r.rows[0].n} assessments with cross-tenant vacancy`);
    return 'no cross-tenant vacancy link';
  });

  await check('sql', 'orphan-vacancy-links', async () => {
    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM vacancy_links l
       LEFT JOIN vacancies v ON v.id = l.vacancy_id
       WHERE v.id IS NULL`
    );
    if (r.rows[0].n > 0) throw new Error(`${r.rows[0].n} orphan vacancy_links`);
  });

  // Lib resolve against live DTOV data
  await check('sql', 'resolve-public-vacancy-open', async () => {
    const { resolvePublicVacancyPosting } = await import('../../lib/public-vacancy-posting.js');
    const company = await client.query(`SELECT slug FROM companies WHERE id = $1`, [companyId]);
    const vac = await client.query(
      `SELECT slug FROM vacancies
       WHERE company_id = $1 AND public_page_enabled AND status = 'open' AND deleted = FALSE
       LIMIT 1`,
      [companyId]
    );
    const resolved = await resolvePublicVacancyPosting(company.rows[0].slug, vac.rows[0].slug);
    if (!resolved.ok) throw new Error(resolved.errorCode || 'resolve failed');
    if (resolved.posting.status !== 'open') throw new Error('expected open');
    return resolved.posting.title;
  });

  await check('sql', 'resolve-public-vacancy-closed', async () => {
    const { resolvePublicVacancyPosting, listOpenPublicVacancies } = await import(
      '../../lib/public-vacancy-posting.js'
    );
    const company = await client.query(`SELECT slug FROM companies WHERE id = $1`, [companyId]);
    const vac = await client.query(
      `SELECT id, slug FROM vacancies
       WHERE company_id = $1 AND public_page_enabled AND status = 'closed' AND deleted = FALSE
       LIMIT 1`,
      [companyId]
    );
    const resolved = await resolvePublicVacancyPosting(company.rows[0].slug, vac.rows[0].slug);
    if (!resolved.ok) throw new Error(resolved.errorCode || 'resolve failed');
    if (resolved.posting.publicAllowIndex) throw new Error('closed must not be indexable');
    const related = await listOpenPublicVacancies({
      companyId,
      excludeVacancyId: vac.rows[0].id,
      limit: 5,
    });
    if (!related.length) throw new Error('closed page should have related open public vacancies');
    return `related=${related.length}`;
  });
}

function printSummary() {
  const failed = results.filter((r) => r.status === 'fail');
  const passed = results.filter((r) => r.status === 'pass');
  process.stdout.write('\n== summary ==\n');
  process.stdout.write(`pass: ${passed.length}  fail: ${failed.length}\n`);
  if (failed.length) {
    process.stdout.write('failures:\n');
    for (const f of failed) process.stdout.write(`  - ${f.suite}/${f.name}: ${f.detail}\n`);
  }
  return failed.length === 0;
}

async function main() {
  const argv = process.argv.slice(2);
  const offline = argv.includes('--offline');
  const forceDtov = argv.includes('--dtov') || process.env.DTOV === '1';

  process.stdout.write('30Team full regression\n');

  // DTOV env must be set BEFORE any import of lib/db.js (pool is created at load).
  if (forceDtov) {
    Object.assign(process.env, dtovEnv());
    assertDtovTarget(process.env);
    process.stdout.write(`DB target: DTOV ${DTOV_DEFAULTS.POSTGRES_HOST}:${DTOV_DEFAULTS.POSTGRES_PORT}\n`);
  } else if (!offline) {
    process.stdout.write(
      `DB target: ${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'} / ${process.env.POSTGRES_DB || 'enneagram'} (set DTOV=1 or --dtov for ephemeral)\n`
    );
  }

  await runOfflineLibs();

  if (offline) {
    const allOk = printSummary();
    process.exitCode = allOk ? 0 : 1;
    return;
  }

  const client = new Client(getPgBaseConfig());
  try {
    await client.connect();
  } catch (e) {
    fail('sql', 'connect', e.message || e);
    printSummary();
    process.exitCode = 2;
    return;
  }

  try {
    await runSqlSuite(client);
  } finally {
    await client.end();
  }

  const allOk = printSummary();
  process.exitCode = allOk ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
