/**
 * OKR phase 1–2: mean/weighted rollup + deadline urgency (pure).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activityUrgency,
  meanProgressPct,
  weightedProgressPct,
  clampWeight,
} from '../../lib/okr-cycles.js';

describe('meanProgressPct', () => {
  it('returns null for empty', () => {
    assert.equal(meanProgressPct([]), null);
    assert.equal(meanProgressPct(null), null);
  });

  it('averages and rounds', () => {
    assert.equal(meanProgressPct([100, 50]), 75);
    assert.equal(meanProgressPct([10, 20, 30]), 20);
  });
});

describe('weightedProgressPct', () => {
  it('returns null for empty', () => {
    assert.equal(weightedProgressPct([]), null);
  });

  it('equals mean when weights are equal', () => {
    assert.equal(
      weightedProgressPct([
        { progressPct: 100, weight: 1 },
        { progressPct: 50, weight: 1 },
      ]),
      75
    );
  });

  it('weights higher activities more', () => {
    assert.equal(
      weightedProgressPct([
        { progressPct: 100, weight: 3 },
        { progressPct: 0, weight: 1 },
      ]),
      75
    );
  });
});

describe('clampWeight', () => {
  it('defaults and clamps', () => {
    assert.equal(clampWeight(0), 1);
    assert.equal(clampWeight(null), 1);
    assert.equal(clampWeight(50), 50);
    assert.equal(clampWeight(200), 100);
  });
});

describe('activityUrgency', () => {
  it('done when 100%', () => {
    assert.equal(
      activityUrgency({ progressPct: 100, deadline: '2026-01-01' }, { today: '2026-06-01' }),
      'done'
    );
  });

  it('overdue when past deadline and incomplete', () => {
    assert.equal(
      activityUrgency({ progressPct: 40, deadline: '2026-01-01' }, { today: '2026-01-15' }),
      'overdue'
    );
  });

  it('critical within 14d and low %', () => {
    assert.equal(
      activityUrgency({ progressPct: 20, deadline: '2026-01-10' }, { today: '2026-01-01' }),
      'critical'
    );
  });

  it('warn within 30d and mid %', () => {
    assert.equal(
      activityUrgency({ progressPct: 50, deadline: '2026-01-25' }, { today: '2026-01-01' }),
      'warn'
    );
  });

  it('none without deadline', () => {
    assert.equal(activityUrgency({ progressPct: 10 }, { today: '2026-01-01' }), 'none');
  });
});
