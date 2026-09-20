/** Real HTTP + SQL + browser proof; local DTOV only. Run after the production build. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pg from 'pg';
import { chromium, expect } from '@playwright/test';
import { dtovEnv, assertDtovTarget } from './harness.js';
import { dismissManagerOnboarding } from '../e2e/fixtures.js';

const base = 'http://127.0.0.1:3010';
const env = dtovEnv({ JWT_SECRET: 'dtov-smoke-jwt-secret-min-32-chars-long', COOKIE_SECURE: 'false',
  PORT: '3010', HOSTNAME: '127.0.0.1', NEXT_PUBLIC_APP_URL: base, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-polish-build' });
assertDtovTarget(env);
const db = new pg.Client({ host: env.POSTGRES_HOST, port: Number(env.POSTGRES_PORT), database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, ssl: false });
let server, browser, page;
let cookie = '';
let checks = 0;
const request = (path, options = {}) => fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20000),
  ...options, headers: { cookie, 'content-type': 'application/json', ...options.headers } });
async function api(method, body, status = 200, suffix = '') {
  const response = await request('/api/admin/org-units' + suffix, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${suffix}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
async function login(path, email) {
  const response = await request(path, { method: 'POST', body: JSON.stringify({ email, password: 'DemoTodosDados!2026', locale: 'pt-BR' }) });
  assert.equal(response.status, 200);
  return response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}
try {
  await db.connect();
  const { rows: [employee] } = await db.query("SELECT id,company_id,manager_candidate_id,job_role_id FROM candidates WHERE email='colaborador@todos-os-dados.demo' AND employment_status='employee'");
  const candidateId = Number(employee.id), companyId = Number(employee.company_id);
  const { rows: [foreign] } = await db.query("INSERT INTO companies(name,slug) VALUES('Organization isolation','org-test-' || gen_random_uuid()) RETURNING id");
  const { rows: [foreignUnit] } = await db.query("INSERT INTO org_units(company_id,name) VALUES($1,'Private unit') RETURNING id", [foreign.id]);
  const { rows: [foreignPerson] } = await db.query("INSERT INTO candidates(company_id,full_name,employment_status) VALUES($1,'Private person','employee') RETURNING id", [foreign.id]);
  const migration = await readFile('migrations/121_organization_units.sql', 'utf8');
  const before = (await db.query('SELECT id,org_unit_id,manager_candidate_id,job_role_id FROM candidates ORDER BY id')).rows;
  await db.query(migration); await db.query(migration);
  assert.deepEqual((await db.query('SELECT id,org_unit_id,manager_candidate_id,job_role_id FROM candidates ORDER BY id')).rows, before, 'migration reruns preserve data'); checks++;
  await assert.rejects(db.query('UPDATE candidates SET org_unit_id=$1 WHERE id=$2', [foreignUnit.id, candidateId]), { code: '23503' }); checks++;
  server = spawn(process.execPath, ['.next-polish-build/standalone/server.js'], { env, stdio: 'inherit' });
  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    try { if ((await request('/login')).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'compiled server readiness');
  await api('GET', null, 401);
  cookie = await login('/api/auth/employee/login', 'colaborador@todos-os-dados.demo');
  await api('GET', null, 401);
  cookie = await login('/api/auth/login', 'hr@todos-os-dados.demo');
  const listed = await api('GET', null, 200, `?companyId=${foreign.id}`);
  assert.ok(!listed.units.some((u) => u.id === foreignUnit.id), 'company override cannot switch HR tenant');
  const stamp = Date.now();
  const root = await api('POST', { name: `Engineering ${stamp}`, parentId: null });
  const child = await api('POST', { name: `Product ${stamp}`, parentId: root.id });
  assert.equal((await api('POST', { name: ` engineering ${stamp} `, parentId: null }, 409)).errorCode, 'ORG_UNIT_DUPLICATE');
  await api('POST', { name: '', parentId: null }, 400);
  await api('POST', { name: 'Other tenant', parentId: foreignUnit.id }, 404);
  await api('PATCH', { id: foreignUnit.id, name: 'Changed', parentId: null }, 404);
  await api('GET', null, 404, `?candidateId=${foreignPerson.id}`);
  await api('PUT', { candidateId: Number(foreignPerson.id), orgUnitId: root.id }, 404);
  await api('PUT', { candidateId, orgUnitId: foreignUnit.id }, 404);
  assert.equal((await api('PATCH', { id: root.id, name: 'Cycle', parentId: child.id }, 400)).errorCode, 'ORG_UNIT_CYCLE');
  await api('PATCH', { id: root.id, name: 'Self', parentId: root.id }, 400);
  await api('PATCH', { id: root.id, active: false }, 409);
  await api('PUT', { candidateId, orgUnitId: child.id });
  await api('PATCH', { id: child.id, active: false }, 409);
  assert.equal((await api('GET', null, 200, `?candidateId=${candidateId}`)).orgUnitId, child.id);
  const preserved = (await db.query('SELECT manager_candidate_id,job_role_id FROM candidates WHERE id=$1', [candidateId])).rows[0];
  assert.deepEqual(preserved, { manager_candidate_id: employee.manager_candidate_id, job_role_id: employee.job_role_id }); checks++;
  const a = await api('POST', { name: `Concurrent A ${stamp}`, parentId: null });
  const b = await api('POST', { name: `Concurrent B ${stamp}`, parentId: null });
  const concurrent = await Promise.all([
    request('/api/admin/org-units', { method: 'PATCH', body: JSON.stringify({ id: a.id, name: `Concurrent A ${stamp}`, parentId: b.id }) }),
    request('/api/admin/org-units', { method: 'PATCH', body: JSON.stringify({ id: b.id, name: `Concurrent B ${stamp}`, parentId: a.id }) }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 400]); checks++;
  await api('PUT', { candidateId, orgUnitId: null });
  await api('PATCH', { id: child.id, active: false });
  assert.equal((await db.query('SELECT active FROM org_units WHERE id=$1', [child.id])).rows[0].active, false); checks++;
  await api('PUT', { candidateId, orgUnitId: child.id }, 404);
  const { rows: [alumni] } = await db.query("INSERT INTO candidates(company_id,full_name,employment_status,org_unit_id) VALUES($1,'Former employee','alumni',$2) RETURNING id", [companyId, root.id]);
  await api('PATCH', { id: root.id, active: false }, 409);
  await api('PUT', { candidateId: Number(alumni.id), orgUnitId: null });
  await api('PATCH', { id: root.id, active: false });
  assert.equal((await db.query('SELECT name FROM org_units WHERE id=$1', [foreignUnit.id])).rows[0].name, 'Private unit'); checks++;
  assert.ok((await db.query("SELECT id FROM audit_log WHERE company_id=$1 AND action='org_units.assign' LIMIT 1", [companyId])).rowCount); checks++;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  await context.addCookies(cookie.split('; ').map((entry) => { const i = entry.indexOf('='); return { name: entry.slice(0, i), value: entry.slice(i + 1), url: base }; }));
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base + '/dashboard?tab=organization');
  await dismissManagerOnboarding(page);
  await expect(page.getByRole('heading', { name: 'Organização', exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Criar unidade', exact: true }).click();
  const unitName = `Browser unit ${stamp}`;
  await page.getByRole('textbox', { name: 'Nome da unidade', exact: true }).fill(unitName);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: unitName, exact: true })).toBeVisible(); checks++;
  const browserUnit = (await api('GET')).units.find((u) => u.name === unitName);
  assert.ok(browserUnit);
  await page.goto(base + `/dashboard?tab=team&candidate=${candidateId}`);
  await page.getByRole('button', { name: /^Unidade \/ departamento/i }).click();
  const personDialog = page.getByRole('dialog', { name: 'Lucas Colaborador', exact: true });
  const unitSelect = personDialog.getByRole('combobox', { name: 'Unidade / departamento', exact: true });
  await unitSelect.click();
  await page.getByRole('option', { name: unitName, exact: true }).click();
  await personDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Alteração salva', { exact: true }).last()).toBeVisible();
  assert.equal((await api('GET', null, 200, `?candidateId=${candidateId}`)).orgUnitId, browserUnit.id); checks++;
  await page.goto(base + `/dashboard?tab=team&orgUnit=${browserUnit.id}&teamPage=999&teamPageSize=10`);
  await expect(page.getByRole('combobox', { name: 'Unidade / departamento', exact: true }).first()).toContainText(unitName);
  await expect(page.getByText('Lucas Colaborador', { exact: true }).first()).toBeVisible(); checks++;
  await page.goto(base + '/dashboard?tab=organization');
  await page.getByRole('button', { name: /^Organograma/i }).click();
  await expect(page.getByRole('button', { name: /Lucas Colaborador/ }).filter({ hasText: unitName })).toBeVisible(); checks++;
  for (const width of [390, 1365]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `overflow ${width}`);
    await page.screenshot({ path: `/private/tmp/team30-organization-${width}.png`, fullPage: true }); checks++;
  }
  // Request failure is not presented as an empty organization and offers retry.
  await page.route('**/api/admin/org-units?*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic network error' }) }));
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic network error' })).toBeVisible();
  await page.unroute('**/api/admin/org-units?*');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: unitName, exact: true })).toBeVisible(); checks++;
  console.log(`PASS organization: ${checks} checks (HTTP, SQL, browser, responsive, retry)`);
} catch (error) {
  if (page) {
    await page.screenshot({ path: '/private/tmp/team30-organization-failure.png', fullPage: true }).catch(() => {});
    console.error((await page.locator('body').innerText().catch(() => '')).slice(-8000));
  }
  throw error;
} finally {
  await browser?.close();
  if (server && server.exitCode == null) { server.kill('SIGTERM'); await once(server, 'exit').catch(() => {}); }
  await db.end();
}
