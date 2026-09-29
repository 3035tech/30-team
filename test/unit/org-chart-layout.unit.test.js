import assert from 'node:assert/strict';
import test from 'node:test';
import { orgChartLayout, orgDescendantIds, filterOrgPeople, ORG_CARD_WIDTH, ORG_CARD_HEIGHT } from '../../lib/people/org-chart-layout.js';
import { listOrgChart, setCandidateManager } from '../../lib/people/org-chart.js';
const roots = [{ id: 1, children: [{ id: 2, children: [{ id: 4, children: [] }] }, { id: 3, children: [] }] }];
test('search matches accents and terms across name, role and unit', () => {
  const people = [{ id: 1, name: 'João Silva', jobRoleName: 'Técnico', orgUnitName: 'Operações' }, { id: 2, name: 'Ana', jobRoleName: null }];
  assert.deepEqual(filterOrgPeople(people, '  OPERACOES   joao ').map((p) => p.id), [1]);
  assert.deepEqual(filterOrgPeople(people, 'tecnico').map((p) => p.id), [1]);
  assert.deepEqual(filterOrgPeople(people, 'ana tecnico'), []);
  assert.equal(filterOrgPeople(people, ' ').length, 2);
});
test('tree positions connect levels without overlapping cards', () => {
  const layout = orgChartLayout(roots);
  assert.equal(layout.nodes.length, 4); assert.equal(layout.edges.length, 3);
  for (const { from, to } of layout.edges) assert.ok(to.y > from.y + ORG_CARD_HEIGHT);
  for (const a of layout.nodes) for (const b of layout.nodes) {
    if (a.id === b.id || a.y !== b.y) continue;
    assert.ok(a.x + ORG_CARD_WIDTH <= b.x || b.x + ORG_CARD_WIDTH <= a.x);
  }
  assert.equal(layout.nodes.find((node) => node.id === 4).depth, 2);
});
test('collapse preserves manager but hides whole subtree; descendants are excluded from reassignment', () => {
  assert.deepEqual(orgChartLayout(roots, new Set([2])).nodes.map((node) => node.id), [1, 2, 3]);
  assert.deepEqual([...orgDescendantIds(roots[0].children[0])], [2, 4]);
});
test('expanded details reserve space for descendants and wrapped roots without overlaps', () => {
  const forest = [...roots, ...Array.from({ length: 8 }, (_, index) => ({ id: index + 10, children: [] }))];
  const compact = orgChartLayout(forest);
  const expanded = orgChartLayout(forest, new Set(), new Set([1, 2, 10]));
  assert.ok(expanded.nodes.find((node) => node.id === 4).y > compact.nodes.find((node) => node.id === 4).y);
  for (const { from, to } of expanded.edges) assert.ok(to.y > from.y + from.height);
  for (const a of expanded.nodes) for (const b of expanded.nodes) {
    if (a.id === b.id) continue;
    assert.ok(a.x + ORG_CARD_WIDTH <= b.x || b.x + ORG_CARD_WIDTH <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  }
  assert.deepEqual(orgChartLayout(forest), compact);
  assert.deepEqual(orgChartLayout(roots, new Set([1]), new Set([1, 2])).nodes.map((node) => node.id), [1]);
});
test('disconnected roots wrap and deep employees remain visible', () => {
  const forest = Array.from({ length: 200 }, (_, id) => ({ id, children: [] }));
  const layout = orgChartLayout(forest);
  assert.equal(layout.nodes.length, 200); assert.ok(layout.width < 1200);
  let chain = { id: 12, children: [] };
  for (let id = 11; id; id--) chain = { id, children: [chain] };
  assert.equal(orgChartLayout([chain]).nodes.length, 12);
});
test('legacy cycles do not hide employees or create recursive JSON', async () => {
  const result = await listOrgChart(async () => ({ rows: [{ id: 1, name: 'A', managerCandidateId: 2 }, { id: 2, name: 'B', managerCandidateId: 1 }, { id: 3, name: 'C', managerCandidateId: 2 }] }), { companyId: 1 });
  assert.equal(result.total, 3); assert.equal(result.roots.length, 3);
  assert.doesNotThrow(() => JSON.stringify(result));
});
test('manager mutation rejects self, foreign managers and descendants before UPDATE', async () => {
  const db = { query: async (sql, params) => {
    assert.ok(!sql.includes('UPDATE'));
    if (sql.includes('SELECT id FROM')) return { rowCount: params[0] === 2 ? 1 : 0, rows: [] };
    return { rowCount: 1, rows: [{ mid: 1 }] };
  } };
  for (const managerCandidateId of [1, 2, 999]) {
    const result = await setCandidateManager(db, { companyId: 1, candidateId: 1, managerCandidateId });
    assert.equal(result.ok, false);
  }
});
