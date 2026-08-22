/**
 * Smoke HTTP/API de todas as superfícies principais (DTOV + Next local).
 * Não é Playwright: valida status/JSON/HTML das rotas, não cliques de UI.
 *
 * Uso típico: npm run dtov:full-app
 * Ou servidor já no ar: BASE_URL=http://127.0.0.1:3010 DTOV=1 node test/dtov/http-smoke.js
 */

import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOK = {
  company: 'd0d0todosdadose5f60718293a4b5c6d7e8f01',
  vacancyOpen: 'e1e1todosdadose5f60718293a4b5c6d7e8f02',
  report: 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718',
  aeInvite: 'b4b4todosdadose5f60718293a4b5c6d7e8f05',
  candInvite: 'c5c5todosdadose5f60718293a4b5c6d7e8f06',
};

const HR = {
  email: 'hr@todos-os-dados.demo',
  password: process.env.DEMO_TODOS_PASSWORD || 'DemoTodosDados!2026',
};

const ADMIN = {
  email: process.env.DTOV_ADMIN_EMAIL || 'admin@3035tech.com',
  password: process.env.DTOV_ADMIN_PASSWORD || 'TroqueEstaSenha123!',
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

function parseSetCookie(res) {
  // Node fetch: getSetCookie() when available
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function cookieHeaderFromSetCookie(setCookies) {
  return setCookies
    .map((c) => String(c).split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function req(base, path, { method = 'GET', cookie = '', body, headers = {} } = {}) {
  const url = `${base.replace(/\/$/, '')}${path}`;
  const init = {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    redirect: 'manual',
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const ct = res.headers.get('content-type') || '';
  let data = null;
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { _raw: text.slice(0, 200) };
    }
  } else {
    data = text;
  }
  return { res, data, text, setCookie: parseSetCookie(res) };
}

async function expectStatus(suite, name, got, allowed, detail = '') {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(got)) {
    fail(suite, name, `status ${got}, expected ${list.join('|')}${detail ? ` · ${detail}` : ''}`);
    return false;
  }
  ok(suite, name, detail || `HTTP ${got}`);
  return true;
}

async function login(base, creds) {
  const { res, data, setCookie } = await req(base, '/api/auth/login', {
    method: 'POST',
    body: { email: creds.email, password: creds.password },
  });
  if (res.status !== 200 || !data?.ok) {
    throw new Error(`login failed ${res.status} ${JSON.stringify(data)}`);
  }
  const cookie = cookieHeaderFromSetCookie(setCookie);
  if (!cookie.includes('team30_session')) {
    throw new Error('login missing team30_session cookie');
  }
  return cookie;
}

export async function runHttpSmoke(baseUrl) {
  const base = String(baseUrl || process.env.BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
  process.stdout.write(`\n== http smoke @ ${base} ==\n`);

  // ── Health / public infra ─────────────────────────────────────────────
  {
    const { res } = await req(base, '/api/health');
    await expectStatus('health', 'basic', res.status, [200, 204, 503]);
  }
  {
    const token = process.env.HEALTH_STATUS_TOKEN || '';
    const { res, data } = await req(
      base,
      `/api/health/status${token ? `?token=${encodeURIComponent(token)}` : ''}`
    );
    // Sem token → 401; com token → 200/503
    if (!token) await expectStatus('health', 'status-no-token', res.status, [401]);
    else await expectStatus('health', 'status-authed', res.status, [200, 503], data?.status || '');
  }

  // ── Public JSON ───────────────────────────────────────────────────────
  for (const [name, path] of [
    ['areas', '/api/public/areas'],
    ['br-cities-sp', '/api/public/br-cities?uf=SP'],
    ['company-link', `/api/public/company-link?token=${TOK.company}`],
    ['vacancy-link', `/api/public/vacancy-link?token=${TOK.vacancyOpen}`],
    ['vacancy-report', `/api/public/vacancy-report?token=${TOK.report}`],
    ['ae-invite', `/api/public/ae-invite?token=${TOK.aeInvite}`],
    ['candidate-invite', `/api/public/candidate-invite?token=${TOK.candInvite}`],
  ]) {
    const { res, data } = await req(base, path);
    const okStatuses = name === 'candidate-invite' ? [200, 404, 410] : [200];
    // invite may expire in odd seeds — still accept 404 for cand invite
    const allowed = name.includes('invite') && name !== 'ae-invite' ? [200, 404, 410, 409] : okStatuses;
    await expectStatus('public-api', name, res.status, allowed, typeof data === 'object' && data?.errorCode ? data.errorCode : '');
  }

  // ── Public HTML pages ─────────────────────────────────────────────────
  for (const [name, path] of [
    ['home', '/'],
    ['login', '/login'],
    ['t-token', `/t/${TOK.company}`],
    ['v-token', `/v/${TOK.vacancyOpen}`],
    ['r-token', `/r/${TOK.report}`],
    ['ae-assessment', `/assessment/motivators/${TOK.aeInvite}`],
    ['vaga-open', '/vaga/todos-os-dados-demo/engenheiro-fullstack-plataforma'],
    ['vaga-closed', '/vaga/todos-os-dados-demo/analista-dados-encerrada'],
    ['vagas-index', '/vagas'],
  ]) {
    const { res, text } = await req(base, path);
    const okHtml = res.status === 200 && String(text).length > 200;
    if (!okHtml) fail('public-page', name, `status ${res.status} len=${String(text).length}`);
    else ok('public-page', name, `HTTP ${res.status} · ${String(text).length}b`);
  }

  // ── Auth HR ───────────────────────────────────────────────────────────
  let hrCookie = '';
  try {
    hrCookie = await login(base, HR);
    ok('auth', 'login-hr', HR.email);
  } catch (e) {
    fail('auth', 'login-hr', e.message);
    printSummary();
    return results;
  }

  {
    const { res, data } = await req(base, '/api/me', { cookie: hrCookie });
    await expectStatus('auth', 'me-hr', res.status, 200, data?.email || data?.user?.email || '');
  }
  {
    const { res } = await req(base, '/api/me/notifications', { cookie: hrCookie });
    await expectStatus('auth', 'notifications', res.status, [200]);
  }
  {
    const { res } = await req(base, '/api/me/locale', {
      method: 'PATCH',
      cookie: hrCookie,
      body: { locale: 'pt-BR' },
    });
    await expectStatus('auth', 'locale', res.status, [200, 204]);
  }

  // Dashboard SSR tabs (HR)
  for (const tab of [
    'overview',
    'team',
    'compatibility',
    'compare',
    'group',
    'leadership',
    'vacancies',
  ]) {
    const { res, text } = await req(base, `/dashboard?tab=${tab}`, { cookie: hrCookie });
    // 200 page or 307/302 if middleware redirects oddly
    if ([200, 307, 302].includes(res.status) && (res.status !== 200 || String(text).length > 100)) {
      ok('dashboard', tab, `HTTP ${res.status}`);
    } else {
      fail('dashboard', tab, `status ${res.status}`);
    }
  }

  // Recruiting APIs
  let vacancyId = null;
  let candidateId = null;
  {
    const { res, data } = await req(base, '/api/admin/vacancies?page=1&pageSize=20', { cookie: hrCookie });
    if (await expectStatus('vacancies', 'list', res.status, 200)) {
      const items = data?.items || data || [];
      vacancyId = items[0]?.id || null;
      ok('vacancies', 'has-rows', `n=${items.length}`);
    }
  }
  if (vacancyId) {
    const { res } = await req(base, `/api/admin/vacancies/${vacancyId}`, { cookie: hrCookie });
    await expectStatus('vacancies', 'get', res.status, 200);
    const { res: r2 } = await req(base, `/api/admin/vacancies/${vacancyId}/candidates`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'candidates', r2.status, 200);
    const { res: r3, data: d3 } = await req(base, `/api/admin/vacancies/${vacancyId}/candidates`, {
      cookie: hrCookie,
    });
    if (r3.status === 200) {
      const arr = Array.isArray(d3?.items) ? d3.items : [];
      candidateId = arr[0]?.candidateId || arr[0]?.candidate_id || arr[0]?.id || null;
      if (candidateId) ok('vacancies', 'candidate-id', String(candidateId));
    }
    const { res: r4 } = await req(base, `/api/admin/vacancies/${vacancyId}/ranking`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'ranking', r4.status, [200, 404]);
    const { res: r5 } = await req(base, `/api/admin/vacancies/${vacancyId}/invites`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'invites', r5.status, [200]);
    const { res: r6 } = await req(base, `/api/admin/vacancies/${vacancyId}/reports`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'reports', r6.status, [200]);
  }

  {
    const { res } = await req(base, '/api/admin/assessment-rows?page=1&pageSize=20', {
      cookie: hrCookie,
    });
    await expectStatus('team', 'assessment-rows', res.status, [200]);
  }
  {
    const { res } = await req(base, '/api/admin/export?limit=10', { cookie: hrCookie });
    await expectStatus('export', 'csv', res.status, [200, 400, 403]);
  }

  // AE admin (HR may or may not have config — status should respond)
  {
    const { res } = await req(base, '/api/admin/ae/status', { cookie: hrCookie });
    await expectStatus('ae', 'status', res.status, [200, 401, 403]);
  }
  {
    const { res } = await req(base, '/api/admin/ae/definitions', { cookie: hrCookie });
    await expectStatus('ae', 'definitions', res.status, [200, 401, 403]);
  }
  {
    const { res } = await req(base, '/api/admin/ae/attempts?page=1&pageSize=10', { cookie: hrCookie });
    await expectStatus('ae', 'attempts', res.status, [200, 401, 403]);
  }
  {
    const { res } = await req(base, '/api/admin/ae/invites?page=1&pageSize=10', { cookie: hrCookie });
    await expectStatus('ae', 'invites', res.status, [200, 401, 403]);
  }
  {
    const { res } = await req(base, '/api/admin/ae/analytics', { cookie: hrCookie });
    await expectStatus('ae', 'analytics', res.status, [200, 401, 403]);
  }

  // AE public start/questions (token)
  {
    const { res, data } = await req(base, '/api/ae/start', {
      method: 'POST',
      body: { token: TOK.aeInvite },
    });
    await expectStatus('ae-public', 'start', res.status, [200, 400, 404, 409, 410], data?.errorCode || '');
  }
  {
    const { res } = await req(base, `/api/ae/questions?token=${TOK.aeInvite}`);
    await expectStatus('ae-public', 'questions', res.status, [200, 400, 401, 404, 410]);
  }

  if (candidateId) {
    const { res } = await req(base, `/api/admin/candidates/${candidateId}`, { cookie: hrCookie });
    await expectStatus('people', 'candidate-get', res.status, [200, 404]);
    const { res: r2 } = await req(base, `/api/admin/candidates/${candidateId}/one-on-ones`, {
      cookie: hrCookie,
    });
    await expectStatus('people', 'one-on-ones', r2.status, [200, 404]);
  }

  // Companies/users — usually admin-only; HR should get 401/403
  {
    const { res } = await req(base, '/api/admin/companies?page=1&pageSize=10', { cookie: hrCookie });
    await expectStatus('acl', 'hr-companies-denied-or-ok', res.status, [200, 401, 403]);
  }
  {
    const { res } = await req(base, '/api/admin/users?page=1&pageSize=10', { cookie: hrCookie });
    await expectStatus('acl', 'hr-users-denied', res.status, [401, 403]);
  }

  // ── Auth Admin ────────────────────────────────────────────────────────
  let adminCookie = '';
  try {
    adminCookie = await login(base, ADMIN);
    ok('auth', 'login-admin', ADMIN.email);
  } catch (e) {
    fail('auth', 'login-admin', e.message);
  }

  if (adminCookie) {
    const { res } = await req(base, '/api/admin/companies?page=1&pageSize=10', {
      cookie: adminCookie,
    });
    await expectStatus('admin', 'companies', res.status, 200);
    const { res: r2 } = await req(base, '/api/admin/users?page=1&pageSize=10', {
      cookie: adminCookie,
    });
    await expectStatus('admin', 'users', r2.status, 200);
    const { res: r3 } = await req(base, '/dashboard?tab=companies', { cookie: adminCookie });
    await expectStatus('admin', 'dashboard-companies', r3.status, [200, 302, 307]);
    const { res: r4 } = await req(base, '/dashboard?tab=users', { cookie: adminCookie });
    await expectStatus('admin', 'dashboard-users', r4.status, [200, 302, 307]);
    const { res: r5 } = await req(base, '/api/admin/ae/config/questions', { cookie: adminCookie });
    await expectStatus('admin', 'ae-questions-config', r5.status, [200, 403]);
    const { res: r6 } = await req(base, '/api/admin/ae/config/dimensions', { cookie: adminCookie });
    await expectStatus('admin', 'ae-dimensions', r6.status, [200, 403]);
    const { res: r7 } = await req(base, '/api/admin/ae/config/templates', { cookie: adminCookie });
    await expectStatus('admin', 'ae-templates', r7.status, [200, 403]);
  }

  // Cron: sem secret = 401; com secret = 200/500 (smtp missing ok)
  {
    const { res } = await req(base, '/api/cron/invite-reminders', { method: 'POST' });
    await expectStatus('cron', 'invite-reminders-unauth', res.status, [401]);
  }
  {
    const secret = process.env.CRON_SECRET || '';
    if (secret) {
      for (const path of [
        '/api/cron/invite-reminders',
        '/api/cron/notification-retention',
        '/api/cron/vacancy-deadline-notifications',
      ]) {
        const { res } = await req(base, path, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}` },
        });
        await expectStatus('cron', path.split('/').pop(), res.status, [200, 500]);
      }
    } else {
      ok('cron', 'secret-skipped', 'CRON_SECRET not set');
    }
  }

  // Logout
  {
    const { res } = await req(base, '/api/auth/logout', { method: 'POST', cookie: hrCookie });
    await expectStatus('auth', 'logout', res.status, [200, 204]);
  }

  return printSummary();
}

function printSummary() {
  const failed = results.filter((r) => r.status === 'fail');
  const passed = results.filter((r) => r.status === 'pass');
  process.stdout.write('\n== http summary ==\n');
  process.stdout.write(`pass: ${passed.length}  fail: ${failed.length}\n`);
  if (failed.length) {
    for (const f of failed) process.stdout.write(`  - ${f.suite}/${f.name}: ${f.detail}\n`);
  }
  return { passed: passed.length, failed: failed.length, results };
}

async function main() {
  const summary = await runHttpSmoke(process.env.BASE_URL);
  process.exitCode = summary.failed ? 1 : 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
