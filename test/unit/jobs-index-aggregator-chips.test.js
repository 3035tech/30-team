import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('/jobs only links aggregators that pass the publish threshold', () => {
  const page = read('app/jobs/page.jsx');
  assert.match(page, /listPublicCityCounts\(\{\s*minCount:\s*aggregatorMinCount\(\)/);
  assert.match(page, /resolveRemoteAggregator\(\)\.catch\(/);
  assert.match(page, /showRemoteChip=\{remoteAggregator\.ok\}/);
});

test('index view hides the remote chip by default and the nav when empty', () => {
  const view = read('app/_components/PublicVacancyPosting.jsx');
  assert.match(view, /showRemoteChip = false/);
  assert.match(view, /\{showRemoteChip \|\| cityChips\?\.length \? \(/);
  assert.match(view, /\{showRemoteChip \? \(\s*<Link href=\{remotePath\}/);
});
