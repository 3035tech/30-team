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

/** Demo employee (seed Todos os Dados) — used for People/1:1 HTTP coverage. */
const FIXTURE_PEOPLE = {
  searchName: 'Elena Ferreira',
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
    ['set-password-bad', '/api/public/set-password?token=invalid'],
  ]) {
    const { res, data } = await req(base, path);
    const okStatuses =
      name === 'candidate-invite'
        ? [200, 404, 410]
        : name === 'set-password-bad'
          ? [400]
          : [200];
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
    ['j-index', '/j'],
  ]) {
    const { res, text } = await req(base, path);
    const okHtml = res.status === 200 && String(text).length > 200;
    if (!okHtml) fail('public-page', name, `status ${res.status} len=${String(text).length}`);
    else ok('public-page', name, `HTTP ${res.status} · ${String(text).length}b`);
  }

  // Legacy /vagas → /j
  {
    const { res } = await req(base, '/vagas');
    const loc = res.headers.get('location') || '';
    if (![301, 308].includes(res.status) || !String(loc).includes('/j')) {
      fail('seo', 'vagas-index-redirect', `status ${res.status} loc=${loc}`);
    } else ok('seo', 'vagas-index-redirect', `HTTP ${res.status} → ${loc}`);
  }

  // Legacy /vaga → canônica /j/{slug}-{id}
  let canonicalOpenPath = '';
  let canonicalClosedPath = '';
  {
    const legacyOpen = '/vaga/todos-os-dados-demo/engenheiro-fullstack-plataforma';
    const { res } = await req(base, legacyOpen);
    const loc = res.headers.get('location') || '';
    if (![301, 308].includes(res.status) || !/\/j\/engenheiro-fullstack-plataforma-\d+/.test(loc)) {
      fail('seo', 'vaga-legacy-open-redirect', `status ${res.status} loc=${loc}`);
    } else {
      ok('seo', 'vaga-legacy-open-redirect', `HTTP ${res.status} → ${loc}`);
      try {
        canonicalOpenPath = new URL(loc, base).pathname;
      } catch {
        canonicalOpenPath = loc.startsWith('/') ? loc : `/${loc}`;
      }
    }
  }
  {
    const legacyClosed = '/vaga/todos-os-dados-demo/analista-dados-encerrada';
    const { res } = await req(base, legacyClosed);
    const loc = res.headers.get('location') || '';
    if (![301, 308].includes(res.status) || !/\/j\/analista-dados-encerrada-\d+/.test(loc)) {
      fail('seo', 'vaga-legacy-closed-redirect', `status ${res.status} loc=${loc}`);
    } else {
      ok('seo', 'vaga-legacy-closed-redirect', `HTTP ${res.status} → ${loc}`);
      try {
        canonicalClosedPath = new URL(loc, base).pathname;
      } catch {
        canonicalClosedPath = loc.startsWith('/') ? loc : `/${loc}`;
      }
    }
  }
  if (canonicalOpenPath) {
    const { res, text } = await req(base, canonicalOpenPath);
    if (res.status !== 200 || String(text).length < 200) {
      fail('public-page', 'vaga-open', `status ${res.status} len=${String(text).length}`);
    } else ok('public-page', 'vaga-open', `HTTP ${res.status} · ${canonicalOpenPath}`);
  }
  if (canonicalClosedPath) {
    const { res, text } = await req(base, canonicalClosedPath);
    if (res.status !== 200 || String(text).length < 200) {
      fail('public-page', 'vaga-closed', `status ${res.status} len=${String(text).length}`);
    } else ok('public-page', 'vaga-closed', `HTTP ${res.status} · ${canonicalClosedPath}`);
  }

  // ── SEO: robots + sitemap ─────────────────────────────────────────────
  {
    const { res, text } = await req(base, '/robots.txt');
    const body = String(text || '');
    if (res.status !== 200) fail('seo', 'robots', `status ${res.status}`);
    else if (!/sitemap/i.test(body)) fail('seo', 'robots', 'missing Sitemap line');
    else if (!/Disallow:\s*\/dashboard/i.test(body)) fail('seo', 'robots', 'missing dashboard disallow');
    else ok('seo', 'robots', `HTTP ${res.status}`);
  }
  {
    const { res, text } = await req(base, '/sitemap.xml');
    const body = String(text || '');
    if (res.status !== 200) fail('seo', 'sitemap', `status ${res.status}`);
    else if (!body.includes('/j') && !body.includes('urlset')) {
      fail('seo', 'sitemap', `unexpected body len=${body.length}`);
    } else ok('seo', 'sitemap', `HTTP ${res.status} · ${body.length}b`);
  }

  // ── Job funnel + UTM attribution cookie ───────────────────────────────
  let publicVacancyId = null;
  if (canonicalOpenPath) {
    const m = canonicalOpenPath.match(/-(\d+)$/);
    if (m) publicVacancyId = Number(m[1]);
  }
  {
    const pathWithUtm = `${canonicalOpenPath || '/j'}?utm_source=linkedin&utm_medium=social&utm_campaign=dtov&ref=DTOVREF`;
    const { res, setCookie } = await req(base, pathWithUtm);
    const joined = (setCookie || []).join('; ');
    if (res.status !== 200 && res.status !== 308 && res.status !== 301) {
      fail('funnel', 'utm-cookie-page', `status ${res.status}`);
    } else if (!/team30_job_attr=/i.test(joined)) {
      fail('funnel', 'utm-cookie-page', `missing team30_job_attr in Set-Cookie: ${joined.slice(0, 120)}`);
    } else {
      ok('funnel', 'utm-cookie-page', 'team30_job_attr set');
    }
  }
  if (publicVacancyId) {
    const { res, data } = await req(base, '/api/public/job-funnel', {
      method: 'POST',
      body: { eventType: 'job_view', vacancyId: publicVacancyId },
    });
    await expectStatus('funnel', 'job-view', res.status, 200, data?.skipped ? 'skipped' : 'recorded');
    const { res: r2, data: d2 } = await req(base, '/api/public/job-funnel', {
      method: 'POST',
      body: { eventType: 'apply_start', vacancyId: publicVacancyId },
    });
    await expectStatus('funnel', 'apply-start', r2.status, 200, d2?.skipped ? 'skipped' : 'recorded');
  } else {
    fail('funnel', 'public-vacancy-id', 'could not parse id from canonical path');
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
    const { res: r4, data: d4 } = await req(base, `/api/admin/vacancies/${vacancyId}/ranking`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'ranking', r4.status, [200, 404]);
    if (r4.status === 200) {
      const first = Array.isArray(d4?.ranking) ? d4.ranking[0] : null;
      if (first && first.stageEnteredAt == null && first.createdAt == null) {
        fail('vacancies', 'ranking-aging', 'missing stageEnteredAt/createdAt');
      } else if (first) {
        ok('vacancies', 'ranking-aging', 'stageEnteredAt present');
      } else {
        ok('vacancies', 'ranking-aging-empty', 'no rows');
      }
    }

    // Clone vacancy (B-409)
    {
      const { res: cloneRes, data: cloneData } = await req(
        base,
        `/api/admin/vacancies/${vacancyId}/clone`,
        { method: 'POST', cookie: hrCookie }
      );
      if (await expectStatus('vacancies', 'clone', cloneRes.status, [201])) {
        const cid = cloneData?.id;
        if (cid) {
          ok('vacancies', 'clone-id', String(cid));
          const { res: delClone } = await req(base, `/api/admin/vacancies/${cid}`, {
            method: 'DELETE',
            cookie: hrCookie,
          });
          await expectStatus('vacancies', 'clone-cleanup', delClone.status, [200, 204]);
        } else {
          fail('vacancies', 'clone-shape', JSON.stringify(cloneData).slice(0, 160));
        }
      }
    }

    // Saved groups (B-404) — list + create + delete against demo company
    {
      const { res: tgList, data: tgData } = await req(base, '/api/admin/team-groups', {
        cookie: hrCookie,
      });
      // HR has company on session — no query needed
      if (await expectStatus('groups', 'list', tgList.status, [200, 400])) {
        if (tgList.status === 200 && !Array.isArray(tgData?.items)) {
          fail('groups', 'list-shape', 'items missing');
        } else if (tgList.status === 200) {
          ok('groups', 'list', `n=${tgData.items.length}`);
        }
      }
      const { res: rowsRes, data: rowsData } = await req(
        base,
        '/api/admin/assessment-rows?page=1&pageSize=5&roster=all',
        { cookie: hrCookie }
      );
      const rows = Array.isArray(rowsData?.rows)
        ? rowsData.rows
        : Array.isArray(rowsData?.items)
          ? rowsData.items
          : Array.isArray(rowsData)
            ? rowsData
            : [];
      const withType = rows.filter((r) => r.assessmentId != null && r.topType != null);
      if (rowsRes.status === 200 && withType.length >= 2) {
        const baseId = withType[0].assessmentId;
        const memberId = withType[1].assessmentId;
        const { res: createRes, data: createData } = await req(base, '/api/admin/team-groups', {
          method: 'POST',
          cookie: hrCookie,
          body: {
            name: 'DTOV Squad',
            baseAssessmentId: baseId,
            memberAssessmentIds: [memberId],
          },
        });
        if (await expectStatus('groups', 'create', createRes.status, 201)) {
          const gid = createData?.item?.id;
          if (gid) {
            ok('groups', 'create-id', String(gid));
            const { res: delRes } = await req(base, `/api/admin/team-groups/${gid}`, {
              method: 'DELETE',
              cookie: hrCookie,
            });
            await expectStatus('groups', 'delete', delRes.status, 200);
          } else {
            fail('groups', 'create-shape', JSON.stringify(createData).slice(0, 160));
          }
        } else if (createData?.errorCode) {
          fail('groups', 'create-error', createData.errorCode);
        }
      } else {
        ok('groups', 'create-skipped', 'need 2 assessments');
      }
    }

    const { res: r5 } = await req(base, `/api/admin/vacancies/${vacancyId}/invites`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'invites', r5.status, [200]);
    const { res: r6 } = await req(base, `/api/admin/vacancies/${vacancyId}/reports`, {
      cookie: hrCookie,
    });
    await expectStatus('vacancies', 'reports', r6.status, [200]);
    const analyticsId = publicVacancyId || vacancyId;
    const { res: r7, data: d7 } = await req(base, `/api/admin/vacancies/${analyticsId}/analytics`, {
      cookie: hrCookie,
    });
    if (await expectStatus('vacancies', 'analytics', r7.status, 200)) {
      if (typeof d7?.views !== 'number' || !Array.isArray(d7?.sources)) {
        fail('vacancies', 'analytics-shape', JSON.stringify(d7).slice(0, 160));
      } else {
        ok('vacancies', 'analytics-shape', `views=${d7.views} apps=${d7.applications}`);
      }
    }
  }

  {
    const { res, data } = await req(base, '/api/admin/referral-codes', { cookie: hrCookie });
    if (await expectStatus('referral', 'list', res.status, 200)) {
      const items = data?.items || [];
      const hit = items.find((i) => String(i.code || '').toUpperCase() === 'DTOVREF');
      if (!hit) fail('referral', 'list-has-dtovref', `n=${items.length}`);
      else ok('referral', 'list-has-dtovref', String(hit.id));
    }
    const { res: ra, data: da } = await req(base, '/api/admin/referral-codes/analytics', {
      cookie: hrCookie,
    });
    if (await expectStatus('referral', 'analytics', ra.status, 200)) {
      const row = (da?.items || []).find((i) => i.code === 'DTOVREF');
      if (!row || row.applications < 1) {
        fail('referral', 'analytics-dtovref', JSON.stringify(da).slice(0, 200));
      } else {
        ok('referral', 'analytics-dtovref', `apps=${row.applications} hires=${row.hires}`);
      }
    }
    const { res: rc, data: dc } = await req(base, '/api/admin/referral-codes', {
      method: 'POST',
      cookie: hrCookie,
      body: {
        code: `T${Date.now().toString(36).toUpperCase().slice(-6)}`,
        label: 'http-smoke temp',
        vacancyId: publicVacancyId || vacancyId,
      },
    });
    if (await expectStatus('referral', 'create', rc.status, 201)) {
      if (!dc?.code || !dc?.id) fail('referral', 'create-shape', JSON.stringify(dc).slice(0, 120));
      else ok('referral', 'create-shape', dc.code);
    }
  }

  let peopleCandidateId = null;
  {
    const q = encodeURIComponent(FIXTURE_PEOPLE.searchName);
    const { res, data } = await req(
      base,
      `/api/admin/assessment-rows?page=1&pageSize=5&roster=internal&search=${q}`,
      { cookie: hrCookie }
    );
    if (await expectStatus('team', 'assessment-rows', res.status, [200])) {
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      peopleCandidateId = rows[0]?.candidateId || rows[0]?.candidate_id || null;
    }
    if (!peopleCandidateId) {
      const { res: rAll, data: dAll } = await req(
        base,
        '/api/admin/assessment-rows?page=1&pageSize=20&roster=all',
        { cookie: hrCookie }
      );
      if (rAll.status === 200) {
        const rows = Array.isArray(dAll?.rows) ? dAll.rows : [];
        peopleCandidateId = rows[0]?.candidateId || rows[0]?.candidate_id || null;
      }
    }
    if (!peopleCandidateId && candidateId) {
      peopleCandidateId = candidateId;
    }
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
    const { res: batchGet, data: batchData } = await req(base, '/api/admin/ae/invites/batch', {
      cookie: hrCookie,
    });
    if (await expectStatus('ae', 'invites-batch-roster', batchGet.status, [200, 401, 403])) {
      if (batchGet.status === 200) {
        if (!Array.isArray(batchData?.items) && !Array.isArray(batchData?.eligible)) {
          fail('ae', 'invites-batch-shape', JSON.stringify(batchData).slice(0, 120));
        } else {
          ok(
            'ae',
            'invites-batch-eligible',
            `total=${batchData.total ?? 0} eligible=${batchData.eligibleCount ?? batchData.eligible?.length ?? 0}`
          );
          if ((batchData.total || 0) < 1) {
            fail('ae', 'invites-batch-roster-empty', 'expected internal roster rows');
          }
        }
        const pick = (batchData.eligible || []).slice(0, 1).map((p) => p.candidateId);
        if (pick.length > 0) {
          const { res: batchPost, data: batchPostData } = await req(base, '/api/admin/ae/invites/batch', {
            method: 'POST',
            cookie: hrCookie,
            body: { candidateIds: pick },
          });
          if (await expectStatus('ae', 'invites-batch-post', batchPost.status, [200, 400, 502, 503])) {
            if (batchPost.status === 200) {
              ok(
                'ae',
                'invites-batch-post-counts',
                `sent=${batchPostData.sentCount || 0} failed=${batchPostData.failedCount || 0}`
              );
            }
          }
        } else {
          ok('ae', 'invites-batch-post-skipped', 'no eligible');
        }
      }
    }
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

  // People / 1:1 — always against fixture candidate (not tied to first vacancy)
  if (peopleCandidateId) {
    ok('people', 'fixture-candidate', String(peopleCandidateId));
    const { res, data } = await req(base, `/api/admin/candidates/${peopleCandidateId}?locale=pt-BR`, {
      cookie: hrCookie,
    });
    await expectStatus('people', 'candidate-get', res.status, 200);
    if (res.status === 200) {
      const brief = data?.people?.decisionBrief;
      if (!brief || typeof brief !== 'object') {
        fail('people', 'decision-brief', 'missing people.decisionBrief');
      } else if (typeof brief.hasAny !== 'boolean') {
        fail('people', 'decision-brief', 'decisionBrief.hasAny missing');
      } else {
        ok('people', 'decision-brief', brief.hasAny ? 'hasAny' : 'empty-ok');
      }
    }
    const { res: r2 } = await req(base, `/api/admin/candidates/${peopleCandidateId}/one-on-ones`, {
      cookie: hrCookie,
    });
    await expectStatus('people', 'one-on-ones', r2.status, 200);
  } else {
    fail('people', 'fixture-candidate', 'no candidate in HR company (demo seed missing?)');
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
    const { res, data: companiesBody } = await req(base, '/api/admin/companies?page=1&pageSize=10', {
      cookie: adminCookie,
    });
    await expectStatus('admin', 'companies', res.status, 200);
    if (
      !companiesBody ||
      (companiesBody.logoStorageConfigured !== false && companiesBody.logoStorageConfigured !== true)
    ) {
      fail('admin', 'companies-logo-flag', 'missing logoStorageConfigured');
    } else {
      ok('admin', 'companies-logo-flag', String(companiesBody.logoStorageConfigured));
    }
    const firstCo = Array.isArray(companiesBody.items) ? companiesBody.items[0] : null;
    if (firstCo?.id) {
      const { res: logoGet } = await req(
        base,
        `/api/admin/companies/${firstCo.id}/logo`,
        { cookie: adminCookie }
      );
      await expectStatus('admin', 'company-logo-get', logoGet.status, 200);
      const { res: logoPost } = await req(base, `/api/admin/companies/${firstCo.id}/logo`, {
        method: 'POST',
        cookie: adminCookie,
        body: {},
      });
      // Sem S3 → 503; com S3 + body JSON inválido → 400
      await expectStatus('admin', 'company-logo-post', logoPost.status, [400, 503]);
    }
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
        '/api/cron/manager-weekly-digest?email=0',
      ]) {
        const { res } = await req(base, path, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}` },
        });
        await expectStatus('cron', path.split('/').pop().split('?')[0], res.status, [200, 500]);
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
