import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { z } from 'zod';
import { getEmployeeOneOnOnePrep, submitEmployeeOneOnOnePrep } from '../../lib/employee-one-on-one-prep.js';

async function route(session) {
  const calls = [];
  const dependencies = {
    NextResponse: { json: (body, options) => ({ body, ...options }) }, z,
    apiError: (_request, code, status) => ({ code, status }),
    apiErrorFromResult: (_request, result) => result,
    HTTP_STATUS: { UNAUTHORIZED: 401, BAD_REQUEST: 400, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500 },
    ERR: { UNAUTHORIZED: 'UNAUTHORIZED', INVALID_DATA: 'INVALID_DATA', RATE_LIMIT: 'RATE_LIMIT', INTERNAL: 'INTERNAL' },
    authenticateMobileEmployee: async () => session,
    mobileEmployeeBearerToken: () => 'test',
    checkRateLimit: async () => ({ ok: true }), clientIpFromRequest: () => 'test',
    getEmployeeOneOnOne: async (_db, scope) => { calls.push(scope); return { ok: true, agreements: [], prompts: [], preparation: { preparedAt: null, noteToManager: '' } }; },
    submitEmployeeOneOnOnePrep: async (_db, scope) => { calls.push(scope); return { ok: true, preparedAt: null, noteToManager: scope.noteToManager }; },
  };
  const context = vm.createContext({ URL });
  const source = await readFile(new URL('../../app/api/mobile/v1/employee/one-on-one/route.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context });
  await module.link(async () => {
    const names = Object.keys(dependencies);
    return new vm.SyntheticModule(names, function () { for (const name of names) this.setExport(name, dependencies[name]); }, { context });
  });
  await module.evaluate();
  return { handlers: module.namespace, calls };
}

test('anonymous callers cannot read or write preparations', async () => {
  const { handlers, calls } = await route(null);
  assert.equal((await handlers.GET({})).status, 401);
  assert.equal((await handlers.POST({})).status, 401);
  assert.equal(calls.length, 0);
});

test('tenant A and B use only authenticated identity; injected scope is rejected', async () => {
  for (const companyId of [1, 2]) {
    const session = { companyId, candidateId: companyId * 10 };
    const { handlers, calls } = await route(session);
    const request = { url: 'https://example.com/employee/one-on-one?locale=en&companyId=999', json: async () => ({ noteToManager: 'Nota' }) };
    const read = await handlers.GET(request);
    assert.equal(read.headers['Cache-Control'], 'no-store');
    await handlers.POST(request);
    assert.deepEqual(calls.map((call) => call.companyId), [companyId, companyId]);
    assert.deepEqual(calls.map((call) => call.candidateId), [session.candidateId, session.candidateId]);
    for (const body of [{ noteToManager: 'Nota', companyId: 999 }, { noteToManager: 'x'.repeat(2001) }, { noteToManager: 1 }]) {
      assert.equal((await handlers.POST({ json: async () => body })).status, 400);
    }
    assert.equal(calls.length, 2);
  }
});

test('domain read and write reject an employee outside the tenant', async () => {
  const db = { query: async (sql, params) => {
    assert.match(sql, /id = \$1 AND company_id = \$2/);
    assert.match(sql, /employment_status = 'employee'/);
    assert.deepEqual(params.slice(0, 2), [10, 2]);
    return { rowCount: 0, rows: [] };
  } };
  assert.equal((await getEmployeeOneOnOnePrep(db, { candidateId: 10, companyId: 2 })).ok, false);
  assert.equal((await submitEmployeeOneOnOnePrep(db, { candidateId: 10, companyId: 2, noteToManager: 'Nota' })).ok, false);
});
