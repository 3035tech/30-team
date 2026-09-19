/**
 * Read-only smoke against the deployed pilot.
 * Required: PILOT_SMOKE_BASE_URL
 * Optional: PILOT_SMOKE_COOKIE (team30_session=...), HEALTH_STATUS_TOKEN
 * Never prints secrets or response bodies.
 */

const baseUrl = String(process.env.PILOT_SMOKE_BASE_URL || '').trim().replace(/\/$/, '');
const sessionCookie = String(process.env.PILOT_SMOKE_COOKIE || '').trim();
const healthToken = String(process.env.HEALTH_STATUS_TOKEN || '').trim();

if (!/^https?:\/\//.test(baseUrl)) {
  throw new Error('PILOT_SMOKE_BASE_URL must be an absolute http(s) URL');
}

async function check(path, { headers = {}, expect = 200, requireRequestId = false } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== expect) {
    throw new Error(`${path}: HTTP ${response.status}, expected ${expect}`);
  }
  if (requireRequestId && !response.headers.get('x-request-id')) {
    throw new Error(`${path}: missing x-request-id`);
  }
  console.log(`ok ${path} HTTP ${response.status}`);
}

await check('/login');
await check('/jobs');

if (healthToken) {
  await check('/api/health/status', {
    headers: { authorization: `Bearer ${healthToken}` },
  });
} else {
  console.log('skip /api/health/status: HEALTH_STATUS_TOKEN not supplied');
}

if (sessionCookie) {
  const headers = { cookie: sessionCookie };
  await check('/api/admin/analytics/metrics', { headers, requireRequestId: true });
  await check('/api/admin/vacancies?page=1&pageSize=1', { headers });
} else {
  console.log('skip authenticated checks: PILOT_SMOKE_COOKIE not supplied');
}

console.log('done pilot deployment smoke');
