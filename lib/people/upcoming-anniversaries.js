/**
 * Upcoming birthdays (birth_date) + work anniversaries (start_date) + company anniversary.
 * Tenant-scoped; capped for Overview card.
 */

import { queryRead } from '../db.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';

export const ANNIVERSARY_WINDOW_DAYS = 14;
export const ANNIVERSARY_LIST_CAP = 40;

function partsFromPgDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // DATE from pg is UTC midnight
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), date: d };
}

function ymdFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** @param {Date} d */
function ymdLocal(d) {
  return ymdFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** month*100+day for next `days` calendar days from today (local). */
export function upcomingMonthDayKeys(fromDate = new Date(), days = ANNIVERSARY_WINDOW_DAYS) {
  const keys = [];
  const seen = new Set();
  const base = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i <= Math.max(0, days); i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const md = (d.getMonth() + 1) * 100 + d.getDate();
    if (!seen.has(md)) {
      seen.add(md);
      keys.push(md);
    }
  }
  return keys;
}

function nextOccurrenceIso(month, day, fromDate = new Date()) {
  const y = fromDate.getFullYear();
  let candidate = new Date(y, month - 1, day);
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  if (Number.isNaN(candidate.getTime())) {
    // Feb 29 → Feb 28 in non-leap years
    candidate = new Date(y, month - 1, Math.min(day, 28));
  }
  if (candidate < today) {
    candidate = new Date(y + 1, month - 1, day);
    if (Number.isNaN(candidate.getTime())) {
      candidate = new Date(y + 1, month - 1, Math.min(day, 28));
    }
  }
  return ymdLocal(candidate);
}

function yearsCompletedOnNext(sourceDate, nextIso) {
  if (!sourceDate || !nextIso) return null;
  const src = sourceDate instanceof Date ? sourceDate : new Date(sourceDate);
  if (Number.isNaN(src.getTime())) return null;
  const nextY = Number(String(nextIso).slice(0, 4));
  const years = nextY - src.getUTCFullYear();
  return years > 0 ? years : null;
}

/**
 * @param {object} [db]
 * @param {{ companyId: number, daysAhead?: number, limit?: number, now?: Date }} opts
 */
export async function getUpcomingAnniversaries(db, opts) {
  const q = db?.queryRead || db?.query || queryRead;
  const companyId = Number(opts?.companyId);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: 'COMPANY_REQUIRED' };
  }
  const daysAhead = Math.min(
    60,
    Math.max(1, Number(opts?.daysAhead) || ANNIVERSARY_WINDOW_DAYS)
  );
  const limit = Math.min(80, Math.max(1, Number(opts?.limit) || ANNIVERSARY_LIST_CAP));
  const now = opts?.now instanceof Date ? opts.now : new Date();
  const mdKeys = upcomingMonthDayKeys(now, daysAhead);
  if (mdKeys.length === 0) {
    return { ok: true, windowDays: daysAhead, items: [], company: null };
  }

  const [birthR, workR, coR] = await Promise.all([
    q(
      `SELECT c.id,
              c.full_name AS "fullName",
              c.birth_date AS "birthDate",
              (EXTRACT(MONTH FROM c.birth_date)::int * 100 + EXTRACT(DAY FROM c.birth_date)::int) AS md
       FROM candidates c
       WHERE c.company_id = $1
         AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
         AND c.birth_date IS NOT NULL
         AND (EXTRACT(MONTH FROM c.birth_date)::int * 100 + EXTRACT(DAY FROM c.birth_date)::int) = ANY($2::int[])
       ORDER BY md ASC, LOWER(c.full_name) ASC
       LIMIT $3`,
      [companyId, mdKeys, limit]
    ),
    q(
      `SELECT c.id,
              c.full_name AS "fullName",
              c.start_date AS "startDate",
              (EXTRACT(MONTH FROM c.start_date)::int * 100 + EXTRACT(DAY FROM c.start_date)::int) AS md
       FROM candidates c
       WHERE c.company_id = $1
         AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
         AND c.start_date IS NOT NULL
         AND (EXTRACT(MONTH FROM c.start_date)::int * 100 + EXTRACT(DAY FROM c.start_date)::int) = ANY($2::int[])
       ORDER BY md ASC, LOWER(c.full_name) ASC
       LIMIT $3`,
      [companyId, mdKeys, limit]
    ),
    q(
      `SELECT id, name, anniversary_date AS "anniversaryDate"
       FROM companies
       WHERE id = $1 AND deleted = FALSE
       LIMIT 1`,
      [companyId]
    ),
  ]);

  const items = [];

  for (const row of birthR.rows || []) {
    const parts = partsFromPgDate(row.birthDate);
    if (!parts) continue;
    const nextOn = nextOccurrenceIso(parts.month, parts.day, now);
    items.push({
      kind: 'birth',
      candidateId: Number(row.id),
      fullName: row.fullName,
      nextOn,
      sourceDate: ymdFromParts(parts.date.getUTCFullYear(), parts.month, parts.day),
      years: null,
    });
  }

  for (const row of workR.rows || []) {
    const parts = partsFromPgDate(row.startDate);
    if (!parts) continue;
    const nextOn = nextOccurrenceIso(parts.month, parts.day, now);
    items.push({
      kind: 'work',
      candidateId: Number(row.id),
      fullName: row.fullName,
      nextOn,
      sourceDate: ymdFromParts(parts.date.getUTCFullYear(), parts.month, parts.day),
      years: yearsCompletedOnNext(parts.date, nextOn),
    });
  }

  let company = null;
  const co = coR.rows?.[0];
  if (co?.anniversaryDate) {
    const parts = partsFromPgDate(co.anniversaryDate);
    if (parts) {
      const md = parts.month * 100 + parts.day;
      if (mdKeys.includes(md)) {
        const nextOn = nextOccurrenceIso(parts.month, parts.day, now);
        company = {
          kind: 'company',
          companyId: Number(co.id),
          name: co.name,
          nextOn,
          sourceDate: ymdFromParts(parts.date.getUTCFullYear(), parts.month, parts.day),
          years: yearsCompletedOnNext(parts.date, nextOn),
        };
      }
    }
  }

  items.sort((a, b) => {
    const c = String(a.nextOn).localeCompare(String(b.nextOn));
    if (c !== 0) return c;
    if (a.kind !== b.kind) return a.kind === 'birth' ? -1 : 1;
    return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'pt-BR');
  });

  return {
    ok: true,
    windowDays: daysAhead,
    items: items.slice(0, limit),
    company,
  };
}
