import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('team rows use the shared RowActionsMenu (one open menu at a time)', () => {
  const src = read('app/dashboard/tabs/TeamTab.jsx');
  assert.match(src, /<RowActionsMenu\b/);
  assert.doesNotMatch(src, /<details className="group relative group-open:z-40">/);
});

test('single-person HR Score recalc does not filter candidates by a missing soft-delete column', () => {
  const src = read('app/api/admin/hr-score/recalculate/route.js');
  const candidateQuery = src.match(/FROM candidates[\s\S]*?LIMIT 1/)?.[0] || '';
  assert.ok(candidateQuery, 'candidate lookup query present');
  assert.doesNotMatch(candidateQuery, /deleted/);
});
