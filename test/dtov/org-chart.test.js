/** Local disposable fixture: manager moves, tenant isolation and concurrent cycles. */
import assert from 'node:assert/strict';
import { dtovEnv, assertDtovTarget } from './harness.js';
Object.assign(process.env, dtovEnv());
assertDtovTarget(process.env);
const { query, pool } = await import('../../lib/db.js');
const { setCandidateManager, listOrgChart } = await import('../../lib/people/org-chart.js');
const companies = [];
try {
  for (let i = 0; i < 2; i++) {
    const result = await query("INSERT INTO companies(name,slug) VALUES('Org chart test', 'org-chart-test-' || gen_random_uuid()) RETURNING id");
    companies.push(Number(result.rows[0].id));
  }
  const [companyId, foreignCompany] = companies;
  const ids = [];
  for (const [name, company] of [['Root', companyId], ['Manager', companyId], ['Report', companyId], ['Other tenant', foreignCompany]]) {
    const result = await query("INSERT INTO candidates(company_id,full_name,employment_status) VALUES($1,$2,'employee') RETURNING id", [company, name]);
    ids.push(Number(result.rows[0].id));
  }
  const [a,b,c,foreign] = ids;
  const set = (candidateId, managerCandidateId) => setCandidateManager(null, { companyId, candidateId, managerCandidateId });
  assert.equal((await set(b,a)).ok, true);
  assert.equal((await set(c,b)).ok, true);
  assert.equal((await set(a,c)).ok, false);
  assert.equal((await set(a,a)).ok, false);
  assert.equal((await set(a,foreign)).ok, false);
  assert.equal((await set(foreign,a)).ok, false);
  assert.equal((await set(b,null)).ok, true);
  let tree = await listOrgChart(null, { companyId });
  assert.equal(tree.roots.length, 2);
  assert.equal(tree.roots.find((node) => node.id === b).children[0].id, c);
  const outcomes = await Promise.all([set(a,b), set(b,a)]);
  assert.equal(outcomes.filter((result) => result.ok).length, 1, 'only one concurrent reciprocal change may succeed');
  tree = await listOrgChart(null, { companyId });
  assert.equal(tree.roots.length, 1);
  assert.equal(tree.total, 3);
  console.log('org-chart DTOV: hierarchy moves, descendants preserved, tenant isolation and concurrent cycle prevention passed');
} finally {
  if (companies.length) {
    await query('DELETE FROM candidates WHERE company_id=ANY($1::bigint[])', [companies]);
    await query('DELETE FROM companies WHERE id=ANY($1::bigint[])', [companies]);
  }
  await pool.end();
}
