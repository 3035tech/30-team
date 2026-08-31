/**
 * B-2722 — Hour bank / compensatory time on top of digital time clock.
 * Not payroll, eSocial, or overtime multiplier tables.
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import {
  EMPLOYMENT_STATUS,
  HOUR_BANK_ENTRY_KIND,
  HOUR_BANK_ENTRY_KINDS,
  HOUR_BANK_SOURCE,
  HOUR_BANK_STATUS,
  HOUR_BANK_STATUSES,
  TIME_PUNCH_KIND,
} from '../domain-status.js';
import {
  DEFAULT_SCHEDULE,
  getCompanyTimeSchedule,
  listCompanyTimePunches,
} from './time-clock.js';

export const HOUR_BANK_LIST_CAP = 200;
export const HOUR_BANK_BALANCES_CAP = 300;
/** Minimum overtime minutes before a time-clock credit is generated. */
export const HOUR_BANK_MIN_OVERTIME_MINUTES = 15;
export const HOUR_BANK_DEFAULT_MAX_MINUTES = 2400;

function clipNote(s) {
  return String(s || '').trim().slice(0, 500);
}

function parseIsoDay(raw) {
  const s = String(raw || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function hmToMinutes(hm) {
  const [h, m] = String(hm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Expected net worked minutes for a scheduled day (start→end minus break).
 */
export function expectedNetMinutes(schedule) {
  const sched = schedule || DEFAULT_SCHEDULE;
  const span = hmToMinutes(sched.workdayEnd) - hmToMinutes(sched.workdayStart);
  const brk = Math.max(0, Number(sched.breakMinutes) || 0);
  return Math.max(0, span - brk);
}

/**
 * Sum paired in→out intervals (minutes). Unpaired trailing IN is ignored.
 */
export function pairWorkedMinutes(punches = []) {
  const ordered = [...(punches || [])].sort(
    (a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime()
  );
  let total = 0;
  let openIn = null;
  for (const p of ordered) {
    const kind = String(p.punchKind || '').toLowerCase();
    const t = new Date(p.punchedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (kind === TIME_PUNCH_KIND.IN) {
      openIn = t;
      continue;
    }
    if (kind === TIME_PUNCH_KIND.OUT && openIn != null) {
      const mins = Math.round((t - openIn) / 60000);
      if (mins > 0) total += mins;
      openIn = null;
    }
  }
  return total;
}

/**
 * Overtime vs schedule. Returns 0 below the minimum threshold.
 */
export function overtimeMinutes(workedMinutes, schedule, {
  minOvertime = HOUR_BANK_MIN_OVERTIME_MINUTES,
} = {}) {
  const expected = expectedNetMinutes(schedule);
  const raw = Math.max(0, Number(workedMinutes) || 0) - expected;
  if (raw < (Number(minOvertime) || 0)) return 0;
  return Math.min(1440, Math.floor(raw));
}

export function formatMinutesHm(totalMinutes) {
  const n = Math.round(Number(totalMinutes) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

function mapEntry(row) {
  return {
    id: Number(row.id),
    companyId: Number(row.companyId),
    candidateId: Number(row.candidateId),
    entryKind: row.entryKind,
    minutes: Number(row.minutes),
    status: row.status,
    source: row.source,
    workOn: row.workOn instanceof Date
      ? row.workOn.toISOString().slice(0, 10)
      : String(row.workOn).slice(0, 10),
    note: row.note || '',
    dedupeKey: row.dedupeKey || null,
    createdByUserId: row.createdByUserId != null ? Number(row.createdByUserId) : null,
    createdByCandidateId:
      row.createdByCandidateId != null ? Number(row.createdByCandidateId) : null,
    decidedByUserId: row.decidedByUserId != null ? Number(row.decidedByUserId) : null,
    decidedAt: row.decidedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || null,
    candidateName: row.candidateName || null,
    candidateEmail: row.candidateEmail || null,
  };
}

function clockDedupeKey(candidateId, workOn) {
  return `tc:${Number(candidateId)}:${workOn}`;
}

async function assertEmployee(db, { companyId, candidateId }) {
  const emp = await db.query(
    `SELECT id FROM candidates
     WHERE id = $1 AND company_id = $2 AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     LIMIT 1`,
    [candidateId, companyId]
  );
  return emp.rowCount > 0;
}

async function requireHourBankEnabled(db, companyId) {
  const schedRes = await getCompanyTimeSchedule(db, { companyId });
  if (!schedRes.ok) return schedRes;
  if (!schedRes.schedule.hourBankEnabled) {
    return { ok: false, errorCode: ERR.HOUR_BANK_DISABLED, schedule: schedRes.schedule };
  }
  return { ok: true, schedule: schedRes.schedule };
}

/**
 * Approved balance in minutes (credits − debits).
 */
export async function getHourBankBalance(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  if (![cid, cand].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  const r = await db.query(
    `SELECT COALESCE(SUM(
       CASE
         WHEN entry_kind = '${HOUR_BANK_ENTRY_KIND.CREDIT}' THEN minutes
         WHEN entry_kind = '${HOUR_BANK_ENTRY_KIND.DEBIT}' THEN -minutes
         ELSE 0
       END
     ), 0)::int AS balance
     FROM employee_hour_bank_entries
     WHERE company_id = $1 AND candidate_id = $2 AND status = '${HOUR_BANK_STATUS.APPROVED}'`,
    [cid, cand]
  );
  return { ok: true, balanceMinutes: Number(r.rows[0]?.balance) || 0 };
}

export async function listHourBankBalances(dbOrQuery, {
  companyId,
  q = '',
  limit = HOUR_BANK_BALANCES_CAP,
} = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  const schedRes = await getCompanyTimeSchedule(db, { companyId: cid });
  if (!schedRes.ok) return schedRes;

  const cap = Math.min(HOUR_BANK_BALANCES_CAP, Math.max(1, Number(limit) || HOUR_BANK_BALANCES_CAP));
  const params = [cid];
  let searchSql = '';
  const search = String(q || '').trim().slice(0, 80);
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    searchSql = ` AND (LOWER(c.full_name) LIKE $${params.length} OR LOWER(c.email) LIKE $${params.length})`;
  }
  params.push(cap);

  const r = await db.query(
    `SELECT c.id AS "candidateId",
            c.full_name AS "candidateName",
            c.email AS "candidateEmail",
            COALESCE(b.balance, 0)::int AS "balanceMinutes",
            COALESCE(p.pending_count, 0)::int AS "pendingCount"
     FROM candidates c
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(
         CASE
           WHEN e.entry_kind = '${HOUR_BANK_ENTRY_KIND.CREDIT}' THEN e.minutes
           WHEN e.entry_kind = '${HOUR_BANK_ENTRY_KIND.DEBIT}' THEN -e.minutes
           ELSE 0
         END
       ), 0) AS balance
       FROM employee_hour_bank_entries e
       WHERE e.company_id = c.company_id
         AND e.candidate_id = c.id
         AND e.status = '${HOUR_BANK_STATUS.APPROVED}'
     ) b ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS pending_count
       FROM employee_hour_bank_entries e
       WHERE e.company_id = c.company_id
         AND e.candidate_id = c.id
         AND e.status = '${HOUR_BANK_STATUS.PENDING}'
     ) p ON TRUE
     WHERE c.company_id = $1
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       ${searchSql}
     ORDER BY COALESCE(b.balance, 0) DESC, c.full_name ASC
     LIMIT $${params.length}`,
    params
  );

  return {
    ok: true,
    schedule: schedRes.schedule,
    items: (r.rows || []).map((row) => ({
      candidateId: Number(row.candidateId),
      candidateName: row.candidateName,
      candidateEmail: row.candidateEmail,
      balanceMinutes: Number(row.balanceMinutes) || 0,
      pendingCount: Number(row.pendingCount) || 0,
    })),
    cap,
  };
}

export async function listHourBankEntries(dbOrQuery, {
  companyId,
  candidateId = null,
  status = null,
  month = null,
  limit = HOUR_BANK_LIST_CAP,
} = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  const cap = Math.min(HOUR_BANK_LIST_CAP, Math.max(1, Number(limit) || HOUR_BANK_LIST_CAP));
  const params = [cid];
  let where = 'e.company_id = $1';

  if (candidateId != null) {
    const cand = Number(candidateId);
    if (!Number.isFinite(cand) || cand <= 0) {
      return { ok: false, errorCode: ERR.INVALID_ID };
    }
    params.push(cand);
    where += ` AND e.candidate_id = $${params.length}`;
  }
  if (status && HOUR_BANK_STATUSES.includes(status)) {
    params.push(status);
    where += ` AND e.status = $${params.length}`;
  }
  const monthIso = String(month || '').trim().slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(monthIso)) {
    params.push(`${monthIso}-01`);
    where += ` AND e.work_on >= $${params.length}::date
               AND e.work_on < ($${params.length}::date + INTERVAL '1 month')`;
  }
  params.push(cap);

  const r = await db.query(
    `SELECT e.id, e.company_id AS "companyId", e.candidate_id AS "candidateId",
            e.entry_kind AS "entryKind", e.minutes, e.status, e.source,
            e.work_on AS "workOn", e.note, e.dedupe_key AS "dedupeKey",
            e.created_by_user_id AS "createdByUserId",
            e.created_by_candidate_id AS "createdByCandidateId",
            e.decided_by_user_id AS "decidedByUserId",
            e.decided_at AS "decidedAt",
            e.created_at AS "createdAt", e.updated_at AS "updatedAt",
            c.full_name AS "candidateName", c.email AS "candidateEmail"
     FROM employee_hour_bank_entries e
     JOIN candidates c ON c.id = e.candidate_id AND c.company_id = e.company_id
     WHERE ${where}
     ORDER BY e.work_on DESC, e.id DESC
     LIMIT $${params.length}`,
    params
  );
  return { ok: true, items: (r.rows || []).map(mapEntry), cap };
}

async function insertEntry(db, {
  companyId,
  candidateId,
  entryKind,
  minutes,
  status,
  source,
  workOn,
  note,
  dedupeKey = null,
  createdByUserId = null,
  createdByCandidateId = null,
}) {
  try {
    const r = await db.query(
      `INSERT INTO employee_hour_bank_entries (
         company_id, candidate_id, entry_kind, minutes, status, source,
         work_on, note, dedupe_key, created_by_user_id, created_by_candidate_id,
         decided_by_user_id, decided_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11,
         CASE WHEN $5 = '${HOUR_BANK_STATUS.APPROVED}' THEN $10 ELSE NULL END,
         CASE WHEN $5 = '${HOUR_BANK_STATUS.APPROVED}' THEN NOW() ELSE NULL END
       )
       RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
                 entry_kind AS "entryKind", minutes, status, source,
                 work_on AS "workOn", note, dedupe_key AS "dedupeKey",
                 created_by_user_id AS "createdByUserId",
                 created_by_candidate_id AS "createdByCandidateId",
                 decided_by_user_id AS "decidedByUserId",
                 decided_at AS "decidedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        companyId,
        candidateId,
        entryKind,
        minutes,
        status,
        source,
        workOn,
        clipNote(note),
        dedupeKey,
        createdByUserId,
        createdByCandidateId,
      ]
    );
    return { ok: true, entry: mapEntry(r.rows[0]) };
  } catch (err) {
    if (err && (err.code === '23505' || String(err.message || '').includes('idx_hour_bank_dedupe'))) {
      return { ok: false, errorCode: ERR.HOUR_BANK_DUPLICATE };
    }
    throw err;
  }
}

/**
 * RH manual credit/debit (approved immediately).
 */
export async function createHourBankManualEntry(dbOrQuery, {
  companyId,
  candidateId,
  entryKind,
  minutes,
  workOn,
  note = '',
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  const kind = String(entryKind || '').toLowerCase();
  const mins = Math.floor(Number(minutes));
  const day = parseIsoDay(workOn);
  if (![cid, cand].every((n) => Number.isFinite(n) && n > 0) || !day) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  if (!HOUR_BANK_ENTRY_KINDS.includes(kind)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const enabled = await requireHourBankEnabled(db, cid);
  if (!enabled.ok) return enabled;
  if (!(await assertEmployee(db, { companyId: cid, candidateId: cand }))) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }

  if (kind === HOUR_BANK_ENTRY_KIND.CREDIT) {
    const bal = await getHourBankBalance(db, { companyId: cid, candidateId: cand });
    if (!bal.ok) return bal;
    const max = Number(enabled.schedule.hourBankMaxMinutes) || HOUR_BANK_DEFAULT_MAX_MINUTES;
    if (bal.balanceMinutes + mins > max) {
      return { ok: false, errorCode: ERR.HOUR_BANK_CAP_EXCEEDED };
    }
  } else {
    const bal = await getHourBankBalance(db, { companyId: cid, candidateId: cand });
    if (!bal.ok) return bal;
    if (bal.balanceMinutes < mins) {
      return { ok: false, errorCode: ERR.HOUR_BANK_INSUFFICIENT };
    }
  }

  return insertEntry(db, {
    companyId: cid,
    candidateId: cand,
    entryKind: kind,
    minutes: mins,
    status: HOUR_BANK_STATUS.APPROVED,
    source: HOUR_BANK_SOURCE.MANUAL,
    workOn: day,
    note,
    createdByUserId,
  });
}

/**
 * Collaborator requests a debit (comp time use). Pending until RH decides.
 */
export async function requestHourBankDebit(dbOrQuery, {
  companyId,
  candidateId,
  minutes,
  workOn,
  note = '',
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  const mins = Math.floor(Number(minutes));
  const day = parseIsoDay(workOn);
  if (![cid, cand].every((n) => Number.isFinite(n) && n > 0) || !day) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const enabled = await requireHourBankEnabled(db, cid);
  if (!enabled.ok) return enabled;
  if (!(await assertEmployee(db, { companyId: cid, candidateId: cand }))) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }

  const bal = await getHourBankBalance(db, { companyId: cid, candidateId: cand });
  if (!bal.ok) return bal;
  if (bal.balanceMinutes < mins) {
    return { ok: false, errorCode: ERR.HOUR_BANK_INSUFFICIENT };
  }

  return insertEntry(db, {
    companyId: cid,
    candidateId: cand,
    entryKind: HOUR_BANK_ENTRY_KIND.DEBIT,
    minutes: mins,
    status: HOUR_BANK_STATUS.PENDING,
    source: HOUR_BANK_SOURCE.EMPLOYEE,
    workOn: day,
    note,
    createdByCandidateId: cand,
  });
}

/**
 * Derive pending credit from a day's punches (idempotent per candidate+day).
 */
export async function generateHourBankFromDay(dbOrQuery, {
  companyId,
  candidateId,
  day,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  const dayIso = parseIsoDay(day);
  if (![cid, cand].every((n) => Number.isFinite(n) && n > 0) || !dayIso) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const enabled = await requireHourBankEnabled(db, cid);
  if (!enabled.ok) return enabled;
  if (!(await assertEmployee(db, { companyId: cid, candidateId: cand }))) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }

  const punchesRes = await listCompanyTimePunches(db, {
    companyId: cid,
    day: dayIso,
    limit: 80,
  });
  if (!punchesRes.ok) return punchesRes;
  const dayPunches = (punchesRes.items || []).filter((p) => p.candidateId === cand);
  const worked = pairWorkedMinutes(dayPunches);
  const ot = overtimeMinutes(worked, enabled.schedule);
  if (ot <= 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'no_overtime',
      workedMinutes: worked,
      overtimeMinutes: 0,
    };
  }

  const inserted = await insertEntry(db, {
    companyId: cid,
    candidateId: cand,
    entryKind: HOUR_BANK_ENTRY_KIND.CREDIT,
    minutes: ot,
    status: HOUR_BANK_STATUS.PENDING,
    source: HOUR_BANK_SOURCE.TIME_CLOCK,
    workOn: dayIso,
    note: '',
    dedupeKey: clockDedupeKey(cand, dayIso),
    createdByUserId,
  });
  if (!inserted.ok) return inserted;
  return {
    ok: true,
    skipped: false,
    entry: inserted.entry,
    workedMinutes: worked,
    overtimeMinutes: ot,
  };
}

/**
 * Batch-generate for everyone who punched on a day (cap).
 */
export async function generateHourBankForCompanyDay(dbOrQuery, {
  companyId,
  day,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const dayIso = parseIsoDay(day);
  if (!Number.isFinite(cid) || cid <= 0 || !dayIso) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  const enabled = await requireHourBankEnabled(db, cid);
  if (!enabled.ok) return enabled;

  const punchesRes = await listCompanyTimePunches(db, {
    companyId: cid,
    day: dayIso,
    limit: HOUR_BANK_LIST_CAP,
  });
  if (!punchesRes.ok) return punchesRes;

  const byCand = new Map();
  for (const p of punchesRes.items || []) {
    if (!byCand.has(p.candidateId)) byCand.set(p.candidateId, []);
    byCand.get(p.candidateId).push(p);
  }

  let created = 0;
  let skipped = 0;
  let duplicates = 0;
  for (const [cand, punches] of byCand) {
    const worked = pairWorkedMinutes(punches);
    const ot = overtimeMinutes(worked, enabled.schedule);
    if (ot <= 0) {
      skipped += 1;
      continue;
    }
    const inserted = await insertEntry(db, {
      companyId: cid,
      candidateId: cand,
      entryKind: HOUR_BANK_ENTRY_KIND.CREDIT,
      minutes: ot,
      status: HOUR_BANK_STATUS.PENDING,
      source: HOUR_BANK_SOURCE.TIME_CLOCK,
      workOn: dayIso,
      note: '',
      dedupeKey: clockDedupeKey(cand, dayIso),
      createdByUserId,
    });
    if (!inserted.ok) {
      if (inserted.errorCode === ERR.HOUR_BANK_DUPLICATE) {
        duplicates += 1;
        continue;
      }
      return inserted;
    }
    created += 1;
  }

  return {
    ok: true,
    day: dayIso,
    created,
    skipped,
    duplicates,
    candidatesSeen: byCand.size,
  };
}

export async function decideHourBankEntry(dbOrQuery, {
  companyId,
  entryId,
  status,
  decidedByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const eid = Number(entryId);
  const next = String(status || '').toLowerCase();
  if (![cid, eid].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  if (next !== HOUR_BANK_STATUS.APPROVED && next !== HOUR_BANK_STATUS.REJECTED) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const enabled = await requireHourBankEnabled(db, cid);
  if (!enabled.ok) return enabled;

  const cur = await db.query(
    `SELECT id, company_id AS "companyId", candidate_id AS "candidateId",
            entry_kind AS "entryKind", minutes, status, source,
            work_on AS "workOn", note, dedupe_key AS "dedupeKey",
            created_by_user_id AS "createdByUserId",
            created_by_candidate_id AS "createdByCandidateId",
            decided_by_user_id AS "decidedByUserId",
            decided_at AS "decidedAt",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM employee_hour_bank_entries
     WHERE id = $2 AND company_id = $1
     LIMIT 1`,
    [cid, eid]
  );
  if (cur.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const entry = mapEntry(cur.rows[0]);
  if (entry.status !== HOUR_BANK_STATUS.PENDING) {
    return { ok: false, errorCode: ERR.HOUR_BANK_NOT_PENDING };
  }

  if (next === HOUR_BANK_STATUS.APPROVED) {
    const bal = await getHourBankBalance(db, {
      companyId: cid,
      candidateId: entry.candidateId,
    });
    if (!bal.ok) return bal;
    if (entry.entryKind === HOUR_BANK_ENTRY_KIND.CREDIT) {
      const max = Number(enabled.schedule.hourBankMaxMinutes) || HOUR_BANK_DEFAULT_MAX_MINUTES;
      if (bal.balanceMinutes + entry.minutes > max) {
        return { ok: false, errorCode: ERR.HOUR_BANK_CAP_EXCEEDED };
      }
    } else if (bal.balanceMinutes < entry.minutes) {
      return { ok: false, errorCode: ERR.HOUR_BANK_INSUFFICIENT };
    }
  }

  const r = await db.query(
    `UPDATE employee_hour_bank_entries
     SET status = $3,
         decided_by_user_id = $4,
         decided_at = NOW(),
         updated_at = NOW()
     WHERE id = $2 AND company_id = $1 AND status = '${HOUR_BANK_STATUS.PENDING}'
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               entry_kind AS "entryKind", minutes, status, source,
               work_on AS "workOn", note, dedupe_key AS "dedupeKey",
               created_by_user_id AS "createdByUserId",
               created_by_candidate_id AS "createdByCandidateId",
               decided_by_user_id AS "decidedByUserId",
               decided_at AS "decidedAt",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [cid, eid, next, decidedByUserId]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.HOUR_BANK_NOT_PENDING };
  return { ok: true, entry: mapEntry(r.rows[0]) };
}

export async function getEmployeeHourBankHome(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery);
  const schedRes = await getCompanyTimeSchedule(db, { companyId });
  if (!schedRes.ok) return schedRes;
  const bal = await getHourBankBalance(db, { companyId, candidateId });
  if (!bal.ok) return bal;
  const listed = await listHourBankEntries(db, {
    companyId,
    candidateId,
    limit: 40,
  });
  if (!listed.ok) return listed;
  return {
    ok: true,
    enabled: Boolean(schedRes.schedule.hourBankEnabled),
    maxMinutes: Number(schedRes.schedule.hourBankMaxMinutes) || HOUR_BANK_DEFAULT_MAX_MINUTES,
    balanceMinutes: bal.balanceMinutes,
    schedule: schedRes.schedule,
    items: listed.items,
  };
}

/**
 * Monthly CSV for approved + pending ledger rows.
 */
export async function exportHourBankCsv(dbOrQuery, { companyId, month }) {
  const monthIso = String(month || '').trim().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthIso)) {
    return { ok: false, errorCode: ERR.INVALID_DATE };
  }
  const listed = await listHourBankEntries(dbOrQuery, {
    companyId,
    month: monthIso,
    limit: HOUR_BANK_LIST_CAP,
  });
  if (!listed.ok) return listed;

  const header = [
    'id',
    'candidate_id',
    'name',
    'email',
    'work_on',
    'kind',
    'minutes',
    'status',
    'source',
    'note',
  ];
  const lines = [header.join(',')];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  for (const e of listed.items) {
    lines.push(
      [
        e.id,
        e.candidateId,
        e.candidateName,
        e.candidateEmail,
        e.workOn,
        e.entryKind,
        e.minutes,
        e.status,
        e.source,
        e.note,
      ]
        .map(esc)
        .join(',')
    );
  }
  return {
    ok: true,
    month: monthIso,
    csv: `${lines.join('\n')}\n`,
    count: listed.items.length,
  };
}
