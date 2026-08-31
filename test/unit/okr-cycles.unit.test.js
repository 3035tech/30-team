/**
 * OKR phase 1: mean rollup + deadline urgency (pure).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activityUrgency, meanProgressPct } from '../../lib/okr-cycles.js';

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
