import assert from 'node:assert/strict';
import { computeEnpsScore } from '../../lib/people/climate-surveys.js';
import {
  bandForScore100,
  nineBoxCellIndex,
  potentialScore100,
  NINE_BOX_BAND_EDGES,
} from '../../lib/people/nine-box.js';

assert.equal(computeEnpsScore([10, 9, 8, 7, 0]), 20);
assert.equal(computeEnpsScore([0, 1, 2, 3, 4, 5, 6]), -100);
assert.equal(computeEnpsScore([9, 10, 7]), Math.round(((2 / 3) * 100 - 0) * 10) / 10);
assert.equal(computeEnpsScore([]), null);

assert.equal(bandForScore100(20), 'low');
assert.equal(bandForScore100(NINE_BOX_BAND_EDGES.LOW_MAX), 'low');
assert.equal(bandForScore100(50), 'mid');
assert.equal(bandForScore100(90), 'high');
assert.equal(nineBoxCellIndex('high', 'high'), 9);
assert.equal(nineBoxCellIndex('low', 'low'), 1);

const pot = potentialScore100({
  hrScore: 70,
  assessmentScores: { 8: 20, 3: 15, 1: 10 },
});
assert.ok(pot != null && pot >= 0 && pot <= 100);

console.log('enps-nine-box unit ok');
