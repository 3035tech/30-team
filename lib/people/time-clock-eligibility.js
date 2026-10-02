/**
 * Per-collaborator time clock eligibility (migration 140).
 * candidates.time_clock_override: NULL = follow work format, TRUE/FALSE = HR exception.
 * Pure module: safe for client components and unit tests.
 */
import { WORK_FORMAT } from '../domain-status.js';

export const WORK_FORMATS_WITHOUT_TIME_CLOCK = Object.freeze([WORK_FORMAT.PJ, WORK_FORMAT.COOPERATIVE]);

export const TIME_CLOCK_REASON = Object.freeze({
  WORK_FORMAT: 'work_format',
  OVERRIDE: 'override',
});

/** @returns {null|boolean|undefined} undefined = invalid input */
export function normalizeTimeClockOverride(raw) {
  if (raw == null || raw === '' || raw === 'auto') return null;
  if (raw === true || raw === 'true') return true;
  if (raw === false || raw === 'false') return false;
  return undefined;
}

export function timeClockDefaultForWorkFormat(workFormat) {
  const wf = workFormat == null ? '' : String(workFormat).trim().toLowerCase();
  return !WORK_FORMATS_WITHOUT_TIME_CLOCK.includes(wf);
}

/** @returns {{ enabled: boolean, reason: string }} */
export function resolveTimeClockEligibility({ workFormat, override } = {}) {
  if (typeof override === 'boolean') return { enabled: override, reason: TIME_CLOCK_REASON.OVERRIDE };
  return { enabled: timeClockDefaultForWorkFormat(workFormat), reason: TIME_CLOCK_REASON.WORK_FORMAT };
}

export function isTimeClockEnabledFor(input) {
  return resolveTimeClockEligibility(input).enabled;
}

/** SQL boolean expression equivalent to isTimeClockEnabledFor (alias = candidates table alias). */
export function timeClockEnabledSql(alias = 'c') {
  const off = WORK_FORMATS_WITHOUT_TIME_CLOCK.map((f) => `'${f}'`).join(', ');
  return `COALESCE(${alias}.time_clock_override, COALESCE(${alias}.work_format, '') NOT IN (${off}))`;
}
