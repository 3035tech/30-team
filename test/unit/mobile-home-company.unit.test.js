import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('mobile home exposes only the authenticated company introduction', async () => {
  for (const companyId of [1, 2, null]) {
    const calls = [];
    const dependencies = {
      NextResponse: { json: (body) => body },
      apiError: (_request, code, status) => ({ code, status }),
      HTTP_STATUS: { UNAUTHORIZED: 401, INTERNAL_SERVER_ERROR: 500 }, ERR: { UNAUTHORIZED: 'UNAUTHORIZED', INTERNAL: 'INTERNAL' },
      authenticateMobileEmployee: async () => companyId ? { companyId, candidateId: companyId * 10 } : null,
      mobileEmployeeBearerToken: () => 'test', t: () => 'Task',
      getEmployeeHome: async (_db, scope) => {
        calls.push(scope);
        return { ok: true, person: { fullName: 'Pessoa' }, company: { name: `Empresa ${scope.companyId}`, aboutHtml: '<p>História</p>', website: 'https://example.com', logoUrl: 'private-unused-field' }, tasks: [], plans: [], courses: [], okrActivities: [] };
      },
    };
    const context = vm.createContext({ console });
    const module = new vm.SourceTextModule(await readFile(new URL('../../app/api/mobile/v1/employee/home/route.js', import.meta.url), 'utf8'), { context });
    await module.link(async () => new vm.SyntheticModule(Object.keys(dependencies), function () { for (const [name, value] of Object.entries(dependencies)) this.setExport(name, value); }, { context }));
    await module.evaluate();
    const response = await module.namespace.GET({ url: 'https://example.com/home?companyId=999' });
    if (!companyId) { assert.equal(response.status, 401); assert.equal(calls.length, 0); continue; }
    assert.equal(calls[0].companyId, companyId);
    assert.equal(calls[0].candidateId, companyId * 10);
    assert.equal(response.company.name, `Empresa ${companyId}`);
    assert.deepEqual(Object.keys(response.company).sort(), ['aboutHtml', 'name', 'website']);
  }
});
