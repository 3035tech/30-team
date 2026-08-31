/**
 * B-2722 hour bank pure helpers (offline).
 * Run: node --test test/unit/hour-bank.unit.test.js
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TIME_PUNCH_KIND } from '../../lib/domain-status.js';
import {
  expectedNetMinutes,
  formatMinutesHm,
  overtimeMinutes,
  pairWorkedMinutes,
} from '../../lib/people/hour-bank.js';

describe('expectedNetMinutes', () => {
  it('subtracts break from span', () => {
    assert.equal(
      expectedNetMinutes({
        workdayStart: '09:00',
        workdayEnd: '18:00',
        breakMinutes: 60,
      }),
      480
    );
  });
});

describe('pairWorkedMinutes', () => {
  it('sums in→out pairs', () => {
    const mins = pairWorkedMinutes([
      { punchKind: TIME_PUNCH_KIND.IN, punchedAt: '2030-01-01T12:00:00.000Z' },
      { punchKind: TIME_PUNCH_KIND.OUT, punchedAt: '2030-01-01T21:00:00.000Z' },
    ]);
    assert.equal(mins, 540);
  });

  it('ignores trailing open IN', () => {
    const mins = pairWorkedMinutes([
      { punchKind: TIME_PUNCH_KIND.IN, punchedAt: '2030-01-01T12:00:00.000Z' },
      { punchKind: TIME_PUNCH_KIND.OUT, punchedAt: '2030-01-01T13:00:00.000Z' },
      { punchKind: TIME_PUNCH_KIND.IN, punchedAt: '2030-01-01T14:00:00.000Z' },
    ]);
    assert.equal(mins, 60);
  });
});

describe('overtimeMinutes', () => {
  it('returns 0 below threshold', () => {
    assert.equal(
      overtimeMinutes(490, {
        workdayStart: '09:00',
        workdayEnd: '18:00',
        breakMinutes: 60,
      }),
      0
    );
  });

  it('returns overtime when ≥15 over expected', () => {
    assert.equal(
      overtimeMinutes(500, {
        workdayStart: '09:00',
        workdayEnd: '18:00',
        breakMinutes: 60,
      }),
      20
    );
  });
});

describe('formatMinutesHm', () => {
  it('formats hours and minutes', () => {
    assert.equal(formatMinutesHm(125), '2h05');
    assert.equal(formatMinutesHm(-30), '-0h30');
  });
});
