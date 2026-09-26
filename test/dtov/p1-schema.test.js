import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { dtovEnv, assertDtovTarget } from './harness.js';
const env = dtovEnv();
assertDtovTarget(env);
const db = new pg.Client({ host: env.POSTGRES_HOST, port: Number(env.POSTGRES_PORT), database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, ssl: false });
await db.connect();
await db.query('BEGIN');
try {
  const count = async () => (await db.query('SELECT count(*)::int AS n FROM formal_cycle_competencies')).rows[0].n;
  const before = await count();
  for (const name of ['130_formal_cycle_response_options.sql', '131_formal_cycle_competencies.sql', '132_work_format_history_domain.sql']) {
    const sql = await readFile(new URL(`../../migrations/${name}`, import.meta.url), 'utf8');
    await db.query(sql); await db.query(sql);
  }
  assert.equal(await count(), before, 'Migration retries preserve cycle relationships');
  const companies = (await db.query("INSERT INTO companies(name,slug) VALUES('P1 schema A','p1-schema-a-' || gen_random_uuid()),('P1 schema B','p1-schema-b-' || gen_random_uuid()) RETURNING id")).rows;
  const a = companies[0].id, b = companies[1].id;
  const competency = (await db.query("INSERT INTO company_competencies(company_id,name) VALUES($1,'Schema competency') RETURNING id", [a])).rows[0].id;
  const cycle = (await db.query("INSERT INTO formal_review_cycles(company_id,title,model) VALUES($1,'Schema cycle','90') RETURNING id", [a])).rows[0].id;
  await db.query("INSERT INTO formal_cycle_competencies(company_id,cycle_id,competency_id,label,sort_order) VALUES($1,$2,$3,'Original',0)", [a,cycle,competency]);
  async function rejects(sql, params, code) {
    await db.query('SAVEPOINT invalid_value');
    await assert.rejects(db.query(sql, params), error => error.code === code);
    await db.query('ROLLBACK TO SAVEPOINT invalid_value');
  }
  await rejects('UPDATE formal_cycle_competencies SET company_id = $1 WHERE cycle_id = $2 AND competency_id = $3', [b,cycle,competency], '23503');
  await rejects("INSERT INTO formal_cycle_competencies(company_id,cycle_id,competency_id,label,sort_order) VALUES($1,$2,$3,'Duplicate',1)", [a,cycle,competency], '23505');
  await rejects('UPDATE formal_review_cycles SET response_scale = $1 WHERE id = $2', ['unknown',cycle], '23514');
  await rejects("INSERT INTO formal_cycle_questions(cycle_id,prompt,sort_order) VALUES($1,'',0)", [cycle], '23514');
  await rejects("INSERT INTO formal_review_open_answers(rater_id,question_id,answer) VALUES(999999999,999999999,'Orphan')", [], '23503');
  console.log('P1 schema: idempotence, preservation, tenant FK, uniqueness, domain and orphan checks passed.');
} finally {
  await db.query('ROLLBACK');
  await db.end();
}
