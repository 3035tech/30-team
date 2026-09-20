import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const attachmentRoutes = [
  'app/api/employee/dp/documents/[docKey]/file/route.js',
  'app/api/employee/dp/leave/[id]/file/route.js',
  'app/api/admin/candidates/[id]/dp/documents/[docKey]/file/route.js',
];

test('application sources contain no numbered copy files', () => {
  const copies = ['app', 'lib'].flatMap((directory) =>
    readdirSync(new URL(`${directory}/`, root), { recursive: true })
      .filter((name) => / \d+\.(?:js|jsx|ts|tsx)$/.test(name))
      .map((name) => `${directory}/${name}`)
  );
  assert.deepEqual(copies, [], 'Keep one canonical source; use Git history for older versions');
});

test('DP attachment handlers retain canonical Next.js filenames and HTTP methods', () => {
  for (const route of attachmentRoutes) {
    const path = new URL(route, root);
    assert.ok(existsSync(path), fileURLToPath(path));
    const source = readFileSync(path, 'utf8');
    for (const method of ['GET', 'POST', 'DELETE']) {
      assert.match(source, new RegExp(`export (?:async function|const) ${method}\\b`), `${route}: ${method}`);
    }
  }
});

test('retired employer overview is not exposed by the employee mobile API', () => {
  assert.equal(existsSync(new URL('app/api/mobile/v1/overview/route.js', root)), false);
});
