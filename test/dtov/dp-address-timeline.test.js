/** SQL, HTTP and browser proof. Only disposable DTOV, never production. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pg from 'pg';
import { chromium, expect } from '@playwright/test';
import { dtovEnv, assertDtovTarget } from './harness.js';
import { validateHelpGuideCoverage } from '../../lib/help-sections.js';
import { t } from '../../lib/i18n.js';

const base = 'http://127.0.0.1:3010';
const env = dtovEnv({ JWT_SECRET: 'dtov-smoke-jwt-secret-min-32-chars-long', COOKIE_SECURE: 'false',
  PORT: '3010', HOSTNAME: '127.0.0.1', NEXT_PUBLIC_APP_URL: base, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-polish-build' });
assertDtovTarget(env);
const db = new pg.Client({ host: env.POSTGRES_HOST, port: Number(env.POSTGRES_PORT), database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, ssl: false });
let server, browser, page;
let cookie = '', checks = 0;
const request = (path, options = {}) => fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options,
  headers: { cookie, 'content-type': 'application/json', ...options.headers } });
async function api(path, method = 'GET', body, status = 200, headers = {}) {
  const response = await request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), headers });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${data.errorCode || ''}`); checks++;
  return data;
}
async function login(email, manager = false) {
  const res = await request(manager ? '/api/auth/login' : '/api/auth/employee/login', { method: 'POST', body: JSON.stringify({ email, password: 'DemoTodosDados!2026', locale: 'pt-BR' }) });
  assert.equal(res.status, 200);
  return res.headers.getSetCookie().map((s) => s.split(';')[0]).join('; ');
}
try {
  await db.connect();
  assert.deepEqual(validateHelpGuideCoverage(), { ok: true });
  for (const locale of ['pt-BR', 'en']) for (const key of ['panel.dp.addressNumber', 'panel.dp.addressNumberHelp', 'employeeHome.timeClock.timelineLabel']) assert.notEqual(t(locale, key), key);
  const { rows: [employee] } = await db.query("SELECT id,company_id FROM candidates WHERE email='colaborador@todos-os-dados.demo' AND employment_status='employee'");
  const profileBefore = (await db.query('SELECT * FROM candidate_dp_profiles WHERE candidate_id=$1', [employee.id])).rows[0];
  const migration = await readFile('migrations/123_dp_address_number.sql', 'utf8');
  await db.query(migration); await db.query(migration);
  assert.deepEqual((await db.query('SELECT * FROM candidate_dp_profiles WHERE candidate_id=$1', [employee.id])).rows[0], profileBefore); checks++;
  const { rows: [otherCompany] } = await db.query("INSERT INTO companies(name,slug) VALUES('DP isolation', 'dp-isolation-' || gen_random_uuid()) RETURNING id");
  const { rows: [other] } = await db.query("INSERT INTO candidates(company_id,full_name,employment_status) VALUES($1,'Private employee','employee') RETURNING id", [otherCompany.id]);
  await db.query("INSERT INTO candidate_dp_profiles(candidate_id,company_id,address_number) VALUES($1,$2,'99-private')", [other.id, otherCompany.id]);

  server = spawn(process.execPath, ['.next-polish-build/standalone/server.js'], { env, stdio: 'inherit' });
  let ready = false;
  for (const deadline = Date.now() + 45000; Date.now() < deadline;) {
    try { if ((await request('/login')).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(ready);
  await api('/api/employee/dp', 'PATCH', { addressNumber: '30A' }, 401);
  cookie = await login('colaborador@todos-os-dados.demo');
  const employeeCookie = cookie;
  const oldHome = await api('/api/employee/dp');
  const changed = await api('/api/employee/dp', 'PATCH', { addressNumber: ' 30A ', companyId: otherCompany.id, candidateId: other.id });
  assert.equal(changed.profile.addressNumber, '30A');
  assert.equal(changed.profile.addressLine, oldHome.profile.addressLine);
  assert.equal((await db.query('SELECT address_number FROM candidate_dp_profiles WHERE candidate_id=$1', [other.id])).rows[0].address_number, '99-private'); checks++;
  assert.equal((await api('/api/employee/dp', 'PATCH', { emergencyName: 'Test contact' })).profile.addressNumber, '30A');
  for (const bad of ['x'.repeat(21), 30, { number: '30' }]) await api('/api/employee/dp', 'PATCH', { addressNumber: bad }, 400);
  assert.equal((await api('/api/employee/dp', 'PATCH', { addressNumber: '' })).profile.addressNumber, '');
  assert.equal((await api('/api/employee/dp', 'PATCH', { addressNumber: 's/n' })).profile.addressNumber, 's/n');
  const mobile = await api('/api/mobile/v1/auth/login', 'POST', { email: 'colaborador@todos-os-dados.demo', password: 'DemoTodosDados!2026' });
  const bearer = { authorization: `Bearer ${mobile.session.tokens.accessToken}`, cookie: '' };
  assert.equal((await api('/api/mobile/v1/employee/dp', 'PATCH', { emergencyName: 'Mobile test' }, 200, bearer)).profile.addressNumber, 's/n');
  assert.equal((await api('/api/mobile/v1/employee/dp', 'PATCH', { addressNumber: '41B' }, 200, bearer)).profile.addressNumber, '41B');
  const ownProfile = (await api('/api/employee/dp')).profile;
  cookie = await login('hr@todos-os-dados.demo', true);
  await api(`/api/admin/candidates/${other.id}/dp`, 'PATCH', { addressNumber: 'intrusion' }, 404);
  const { addressNumber, ...legacy } = ownProfile;
  assert.equal((await api(`/api/admin/candidates/${employee.id}/dp`, 'PATCH', legacy)).profile.addressNumber, '41B');
  cookie = employeeCookie;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, reducedMotion: 'reduce' });
  await context.addCookies(cookie.split('; ').map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), value: s.slice(i + 1), url: base }; }));
  page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.goto(base + '/employee/dp');
  await page.getByRole('button', { name: 'Editar ficha', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar ficha', exact: true });
  const number = dialog.getByRole('textbox', { name: /^Número(?:\s|$)/ });
  await expect(number).toHaveValue('41B');
  await expect(number).toHaveAttribute('maxlength', '20');
  await number.fill('30A');
  await page.route('**/api/public/br-cep?*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, cep: '93701255', street: 'Rua de teste', neighborhood: 'Centro', city: 'Campo Bom', state: 'RS' }) }));
  await dialog.getByRole('textbox', { name: 'CEP', exact: true }).fill('93701255');
  await dialog.getByRole('textbox', { name: 'CEP', exact: true }).blur();
  await expect(dialog.getByRole('textbox', { name: 'Endereço', exact: true })).toHaveValue('Rua de teste, Centro');
  await expect(number).toHaveValue('30A'); checks++;
  await page.screenshot({ path: '/private/tmp/team30-dp-number.png', fullPage: true, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('30A', { exact: true })).toBeVisible(); checks++;
  await page.getByRole('button', { name: 'Editar ficha', exact: true }).click();
  await expect(number).toHaveValue('30A');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/private/tmp/team30-dp-number-mobile.png', fullPage: true, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();

  // Only this disposable fixture's clock records are replaced.
  await db.query('DELETE FROM employee_time_punches WHERE company_id=$1 AND candidate_id=$2', [employee.company_id, employee.id]);
  await page.goto(base + '/employee/time-clock');
  await expect(page.getByText('Nenhuma batida hoje ainda.', { exact: true })).toBeVisible(); checks++;
  const clock = await api('/api/employee/time-clock');
  await db.query(`INSERT INTO employee_time_punches(company_id,candidate_id,punched_at,punch_kind,flag)
    VALUES($1,$2,($3::timestamp AT TIME ZONE $4),'in',NULL),
          ($1,$2,($3::timestamp AT TIME ZONE $4)+interval '1 second','out','early_out'),
          ($1,$2,($3::timestamp AT TIME ZONE $4)+interval '2 seconds','in',NULL)`,
  [employee.company_id, employee.id, clock.day, clock.schedule.timezone]);
  await page.reload();
  const timeline = page.getByRole('list', { name: 'Registros de ponto do dia' });
  await expect(timeline.getByRole('listitem')).toHaveCount(3);
  await expect(timeline.getByRole('listitem').nth(0)).toContainText('Entrada');
  await expect(timeline.getByRole('listitem').nth(1)).toContainText('Saída cedo');
  await expect(timeline.getByRole('listitem').nth(2)).toContainText('Entrada'); checks++;
  for (const width of [390, 1365]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false);
    await page.screenshot({ path: `/private/tmp/team30-clock-timeline-${width}.png`, fullPage: true, animations: 'disabled' }); checks++;
  }
  await page.getByRole('button', { name: 'Bater saída', exact: true }).click();
  await expect(timeline.getByRole('listitem')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Bater entrada', exact: true })).toBeVisible(); checks++;
  await page.route('**/api/employee/time-clock', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ errorCode: 'INTERNAL' }) }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await page.unroute('**/api/employee/time-clock');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(timeline.getByRole('listitem')).toHaveCount(4); checks++;
  console.log(`PASS address and timeline: ${checks} checks (SQL, web/mobile compatibility, tenant, CEP, browser, punch, retry)`);
} catch (error) {
  if (page) await page.screenshot({ path: '/private/tmp/team30-dp-timeline-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  if (server && server.exitCode == null) { server.kill('SIGTERM'); await once(server, 'exit').catch(() => {}); }
  await db.end();
}
