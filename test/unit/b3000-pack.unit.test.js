/**
 * Unit proof — B-3000 helpers (calibration, salary sim, variable pay rule).
 */
import assert from 'node:assert/strict';
import { deriveOverallScoreFromOutcomes } from '../../lib/people/performance-calibration.js';
import { simulateRaiseImpact } from '../../lib/people/salary-map.js';
import { shouldSuggestVariablePay } from '../../lib/people/variable-pay.js';

function main() {
  assert.equal(deriveOverallScoreFromOutcomes(null), null);
  assert.equal(
    deriveOverallScoreFromOutcomes({
      1: { outcome: 'exceeded' },
      2: { outcome: 'met' },
    }),
    87.5
  );
  assert.equal(
    deriveOverallScoreFromOutcomes({ 1: { outcome: 'not_met' } }),
    25
  );

  assert.equal(shouldSuggestVariablePay({}), false);
  assert.equal(
    shouldSuggestVariablePay({ a: { outcome: 'exceeded' }, b: { outcome: 'not_met' } }),
    true
  );
  assert.equal(
    shouldSuggestVariablePay({
      a: { outcome: 'met' },
      b: { outcome: 'met' },
      c: { outcome: 'develop' },
      d: { outcome: 'not_met' },
    }),
    true
  );
  assert.equal(
    shouldSuggestVariablePay({
      a: { outcome: 'met' },
      b: { outcome: 'develop' },
      c: { outcome: 'not_met' },
    }),
    false
  );

  const sim = simulateRaiseImpact({
    items: [
      { jobRoleId: 1, payrollSum: 10000, withSalary: 2 },
      { jobRoleId: 2, payrollSum: 5000, withSalary: 1 },
    ],
    mode: 'pct',
    value: 10,
  });
  assert.equal(sim.ok, true);
  assert.equal(sim.currentPayroll, 15000);
  assert.equal(sim.delta, 1500);
  assert.equal(sim.nextPayroll, 16500);

  const one = simulateRaiseImpact({
    items: [{ jobRoleId: 1, payrollSum: 10000, withSalary: 2 }],
    jobRoleId: 1,
    mode: 'amount',
    value: 100,
  });
  assert.equal(one.delta, 200);

  console.log('b3000-pack.unit.test.js OK');
}

main();
