/**
 * Unit — upcoming birthdays / work anniversaries helpers (B-2300).
 */
import assert from 'node:assert/strict';
import {
  ANNIVERSARY_WINDOW_DAYS,
  upcomingMonthDayKeys,
} from '../../lib/people/upcoming-anniversaries.js';

const base = new Date(2026, 7, 27); // 27 Aug 2026 local
const keys = upcomingMonthDayKeys(base, 14);
assert.ok(keys.includes(827), 'includes Aug 27');
assert.ok(keys.includes(828), 'includes Aug 28');
assert.ok(keys.includes(910) || keys.includes(901), 'crosses into September');
assert.equal(keys.length, 15, 'today + 14 days');
assert.deepEqual(keys, [...new Set(keys)], 'unique month-day keys');

const short = upcomingMonthDayKeys(base, 0);
assert.deepEqual(short, [827]);

const defaultWin = upcomingMonthDayKeys(base);
assert.equal(defaultWin.length, ANNIVERSARY_WINDOW_DAYS + 1);

console.log('upcoming-anniversaries.test.js OK');
