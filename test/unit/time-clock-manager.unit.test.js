/**
 * Manager time clock pure helpers (offline): day summary, calendar math, formatters.
 * Run: node --test test/unit/time-clock-manager.unit.test.js
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TIME_DAY_OCCURRENCE,
  TIME_PUNCH_KIND,
  TIME_PUNCH_REVIEW,
} from '../../lib/domain-status.js';
import {
  addDaysIso,
  daySpan,
  isWorkdayIso,
  summarizeTimeDay,
} from '../../lib/people/time-clock-manager.js';
import { isDayInLocks } from '../../lib/people/time-clock.js';
import { formatMinutesClock, formatMinutesHm, shiftIsoDay } from '../../lib/time-clock-format.js';

const schedule = {
  workdayStart: '09:00',
  workdayEnd: '18:00',
  breakMinutes: 60,
  lateGraceMinutes: 10,
  timezone: 'UTC',
};

const punch = (id, iso, kind, extra = {}) => ({
  id,
  punchedAt: iso,
  punchKind: kind,
  reviewStatus: TIME_PUNCH_REVIEW.NONE,
  voidedAt: null,
  ...extra,
});

const fullDay = [
  punch(1, '2026-09-28T09:00:00Z', TIME_PUNCH_KIND.IN),
  punch(2, '2026-09-28T12:00:00Z', TIME_PUNCH_KIND.OUT),
  punch(3, '2026-09-28T13:00:00Z', TIME_PUNCH_KIND.IN),
  punch(4, '2026-09-28T18:00:00Z', TIME_PUNCH_KIND.OUT),
];

describe('summarizeTimeDay', () => {
  it('regular day within tolerance', () => {
    const s = summarizeTimeDay({ punches: fullDay, schedule });
    assert.equal(s.workedMinutes, 480);
    assert.equal(s.extraMinutes, 0);
    assert.equal(s.missingMinutes, 0);
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.OK);
  });

  it('extra beyond tolerance counts in full', () => {
    const punches = [...fullDay.slice(0, 3), punch(4, '2026-09-28T18:30:00Z', TIME_PUNCH_KIND.OUT)];
    const s = summarizeTimeDay({ punches, schedule });
    assert.equal(s.extraMinutes, 30);
  });

  it('small differences stay inside the daily tolerance', () => {
    const punches = [...fullDay.slice(0, 3), punch(4, '2026-09-28T17:55:00Z', TIME_PUNCH_KIND.OUT)];
    const s = summarizeTimeDay({ punches, schedule });
    assert.equal(s.missingMinutes, 0);
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.OK);
  });

  it('workday without punches is an absence with full missing hours', () => {
    const s = summarizeTimeDay({ punches: [], schedule });
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.ABSENCE);
    assert.equal(s.missingMinutes, 480);
  });

  it('justification waives missing hours', () => {
    const s = summarizeTimeDay({ punches: [], schedule, justification: { reason: 'holiday' } });
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.JUSTIFIED);
    assert.equal(s.missingMinutes, 0);
  });

  it('weekend and before-start days are rest, not absence', () => {
    assert.equal(summarizeTimeDay({ punches: [], schedule, isWorkday: false }).occurrence, TIME_DAY_OCCURRENCE.REST);
    assert.equal(summarizeTimeDay({ punches: [], schedule, beforeStart: true }).occurrence, TIME_DAY_OCCURRENCE.REST);
    assert.equal(summarizeTimeDay({ punches: [], schedule, isWorkday: false }).missingMinutes, 0);
  });

  it('unpaired punch on a past day is incomplete', () => {
    const s = summarizeTimeDay({ punches: fullDay.slice(0, 3), schedule });
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.INCOMPLETE);
  });

  it('open punch today is in progress and never missing', () => {
    const s = summarizeTimeDay({ punches: fullDay.slice(0, 1), schedule, isToday: true });
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.IN_PROGRESS);
    assert.equal(s.missingMinutes, 0);
  });

  it('voided punches are ignored but counted', () => {
    const punches = [...fullDay, punch(5, '2026-09-28T20:00:00Z', TIME_PUNCH_KIND.IN, { voidedAt: '2026-09-29T10:00:00Z' })];
    const s = summarizeTimeDay({ punches, schedule });
    assert.equal(s.occurrence, TIME_DAY_OCCURRENCE.OK);
    assert.equal(s.voidedCount, 1);
    assert.equal(s.activeCount, 4);
  });

  it('flagged active punch asks for review', () => {
    const punches = fullDay.map((p, i) => (i === 0 ? { ...p, reviewStatus: TIME_PUNCH_REVIEW.FLAGGED } : p));
    assert.equal(summarizeTimeDay({ punches, schedule }).occurrence, TIME_DAY_OCCURRENCE.REVIEW);
  });
});

describe('calendar helpers', () => {
  it('adds days across month end and counts span', () => {
    assert.equal(addDaysIso('2026-09-30', 1), '2026-10-01');
    assert.equal(shiftIsoDay('2026-03-01', -1), '2026-02-28');
    assert.equal(daySpan('2026-09-01', '2026-09-30'), 29);
  });

  it('Mon–Fri are workdays', () => {
    assert.equal(isWorkdayIso('2026-09-28'), true);
    assert.equal(isWorkdayIso('2026-09-27'), false);
  });

  it('isDayInLocks checks inclusive ranges', () => {
    const locks = [{ periodStart: '2026-08-01', periodEnd: '2026-08-31' }];
    assert.equal(isDayInLocks('2026-08-31', locks), true);
    assert.equal(isDayInLocks('2026-09-01', locks), false);
  });
});

describe('time-clock-format', () => {
  it('formats signed clock minutes', () => {
    assert.equal(formatMinutesClock(6), '00:06');
    assert.equal(formatMinutesClock(-997), '-16:37');
    assert.equal(formatMinutesHm(65), '1h05');
  });
});
