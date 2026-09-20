import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('mobile postal lookup authenticates, bounds input and scopes limits without writing data', async () => {
  for (const scenario of ['anonymous', 'a', 'b', 'invalid', 'tenant', 'duplicate', 'limited', 'missing', 'failure']) {
    const calls = [];
    const companyId = scenario === 'b' ? 2 : 1;
    const dependencies = {
      NextResponse: { json: (body, options) => ({ body, ...options }) },
      apiError: (_r, code, status) => ({ code, status }),
      apiErrorFromResult: (_r, result) => ({ code: result.errorCode }),
      ERR: { UNAUTHORIZED: 'UNAUTHORIZED', INVALID_DATA: 'INVALID_DATA', RATE_LIMIT: 'RATE_LIMIT', INTERNAL: 'INTERNAL' },
      HTTP_STATUS: { UNAUTHORIZED: 401, BAD_REQUEST: 400, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500 },
      authenticateMobileEmployee: async () => scenario === 'anonymous' ? null : { companyId, candidateId: 7 },
      mobileEmployeeBearerToken: () => 'local-test',
      checkRateLimit: async (key) => { calls.push(key); return { ok: scenario !== 'limited' }; },
      lookupCep: async (cep) => {
        calls.push(cep);
        if (scenario === 'failure') throw new Error('upstream');
        if (scenario === 'missing') return { ok: false, errorCode: 'CEP_NOT_FOUND' };
        return { ok: true, cep, street: 'Street', neighborhood: '', city: 'City', state: 'RS', unused: 'not exposed' };
      },
    };
    const context = vm.createContext({ URL });
    const module = new vm.SourceTextModule(await readFile(new URL('../../app/api/mobile/v1/employee/dp/postal-address/route.js', import.meta.url), 'utf8'), { context });
    await module.link(async () => new vm.SyntheticModule(Object.keys(dependencies), function () { for (const [key, value] of Object.entries(dependencies)) this.setExport(key, value); }, { context }));
    await module.evaluate();
    const query = scenario === 'invalid' ? 'cep=123' : scenario === 'tenant' ? 'cep=93701255&companyId=2' : scenario === 'duplicate' ? 'cep=93701255&cep=12345678' : 'cep=93701255';
    const result = await module.namespace.GET({ url: `https://local.invalid/?${query}` });
    if (scenario === 'anonymous') { assert.equal(result.status, 401); assert.equal(calls.length, 0); }
    else if (['invalid', 'tenant', 'duplicate'].includes(scenario)) { assert.equal(result.status, 400); assert.equal(calls.length, 0); }
    else if (scenario === 'limited') { assert.equal(result.status, 429); assert.equal(calls.length, 1); }
    else if (scenario === 'missing') assert.equal(result.code, 'CEP_NOT_FOUND');
    else if (scenario === 'failure') assert.equal(result.status, 500);
    else { assert.deepEqual(calls, [`mobile-postal:${companyId}:7`, '93701255']); assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(result.body.unused, undefined); assert.equal(result.body.cep, '93701255'); }
  }
});
