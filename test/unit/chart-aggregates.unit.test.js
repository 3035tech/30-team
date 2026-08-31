/**
 * Unit proof — B-3020 chart aggregates (P1 + P2). No DB.
 */
import assert from 'node:assert/strict';
import {
  CHART_MIN_N,
  hrScoreAreaBars,
  nineBoxOccupancy,
  okrLevelRollup,
  salaryBandTotals,
  scoreHistogram,
  successionCoverage,
  topCategoryCounts,
} from '../../lib/chart-aggregates.js';

function main() {
  assert.equal(CHART_MIN_N, 3);

  const top = topCategoryCounts(
    [
      { exitReason: 'compensation', count: 2 },
      { exitReason: 'burnout', count: 5 },
      { exitReason: 'compensation', count: 1 },
      { exitReason: 'other', count: 1 },
    ],
    { key: 'exitReason', limit: 2 }
  );
  assert.deepEqual(top, [
    { id: 'burnout', value: 5 },
    { id: 'compensation', value: 3 },
  ]);

  const hist = scoreHistogram([10, 25, 50, 75, 90, null, 'x', 100]);
  assert.equal(hist.scored, 6);
  assert.equal(hist.bins.find((b) => b.id === '0-19').value, 1);
  assert.equal(hist.bins.find((b) => b.id === '80-100').value, 2);

  const box = nineBoxOccupancy([
    { nineBoxCell: 5 },
    { nineBoxCell: 5 },
    { nineBoxCell: 9 },
    { nineBoxCell: null },
  ]);
  assert.equal(box.placed, 3);
  assert.equal(box.cells[5], 2);
  assert.equal(box.cells[9], 1);

  const bands = salaryBandTotals([
    { below: 1, inBand: 2, above: 0, headcount: 3, payrollSum: 10.555 },
    { below: 0, inBand: 1, above: 1, headcount: 2, payrollSum: 5 },
  ]);
  assert.equal(bands.below, 1);
  assert.equal(bands.inBand, 3);
  assert.equal(bands.above, 1);
  assert.equal(bands.banded, 5);
  assert.equal(bands.payrollSum, 15.56);

  const cov = successionCoverage([
    { readyCount: 1, developingCount: 0, notReadyCount: 0, successorCount: 1 },
    { readyCount: 0, developingCount: 2, notReadyCount: 0, successorCount: 2 },
    { readyCount: 0, developingCount: 0, notReadyCount: 0, successorCount: 0 },
  ]);
  assert.equal(cov.hasReady, 1);
  assert.equal(cov.developingOnly, 1);
  assert.equal(cov.empty, 1);
  assert.equal(cov.roles, 3);

  const rollup = okrLevelRollup([
    {
      level: 'company',
      keyResults: [
        { currentValue: 50, targetValue: 100 },
        { currentValue: 100, targetValue: 100 },
      ],
    },
    { level: 'team', keyResults: [{ currentValue: 25, targetValue: 100 }] },
    { level: 'person', keyResults: [] },
  ]);
  assert.equal(rollup.length, 2);
  assert.equal(rollup.find((r) => r.id === 'company').avgPct, 75);
  assert.equal(rollup.find((r) => r.id === 'team').avgPct, 25);

  const areas = hrScoreAreaBars(
    [
      { area: 'Eng', avgScore: 60.4, count: 3 },
      { area: 'Sales', avgScore: 80, count: 2 },
      { area: '', avgScore: 90, count: 1 },
    ],
    { limit: 5 }
  );
  assert.equal(areas[0].id, 'Sales');
  assert.equal(areas[0].value, 80);
  assert.equal(areas.length, 2);

  console.log('chart-aggregates.unit.test.js OK');
}

main();
