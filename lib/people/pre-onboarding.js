/**
 * Light pre-onboarding checklist at hire (accesses / D1) — B-702.
 * Not admissions / LMS / document suite.
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes';
import { EMPLOYMENT_STATUS } from '../domain-status.js';

export const PRE_ONBOARDING_KEYS = Object.freeze([
  'welcome_kit',
  'rh_onboarding_call',
  'manager_onboarding',
]);

const NOTES_MAX = 2000;
const STATUSES = new Set(['pending', 'done', 'skipped']);
const PULSE_CAP = 8;

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function mapRow(r) {
  const due = dateOrNull(r.dueDate);
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    candidateId: Number(r.candidateId),
    itemKey: r.itemKey,
    dueDate: due,
    status: r.status,
    notes: r.notes || '',
    completedAt: r.completedAt || null,
    completedByUserId: r.completedByUserId != null ? Number(r.completedByUserId) : null,
    overdue: r.status === 'pending' && due && due < today,
  };
}

/**
 * Idempotent seed after hire.
 */
export async function ensurePreOnboardingChecklist(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const candId = Number(candidateId);
  if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(candId) || candId <= 0) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const cand = await db.query(
    `SELECT id, company_id AS "companyId",
            employment_status AS "employmentStatus",
            start_date AS "startDate",
            hired_at AS "hiredAt"
     FROM candidates
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [candId, cid]
  );
  if (cand.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const row = cand.rows[0];
  if (row.employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) {
    return { ok: true, skipped: true, items: [] };
  }

  const start =
    dateOrNull(row.startDate) ||
    (row.hiredAt ? String(row.hiredAt).slice(0, 10) : null) ||
    new Date().toISOString().slice(0, 10);

  for (const key of PRE_ONBOARDING_KEYS) {
    // All due on start date (D1 arrival): kit, RH Meet, manager session.
    const due = start;
    await db.query(
      `INSERT INTO employee_pre_onboarding_items (
         company_id, candidate_id, item_key, due_date
       ) VALUES ($1, $2, $3, $4::date)
       ON CONFLICT (candidate_id, item_key) DO NOTHING`,
      [cid, candId, key, due]
    );
  }

  const items = await listPreOnboardingItems(db, { companyId: cid, candidateId: candId });
  return { ok: true, startDate: start, items };
}

export async function listPreOnboardingItems(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery);
  try {
    const res = await db.query(
      `SELECT id, company_id AS "companyId", candidate_id AS "candidateId",
              item_key AS "itemKey", due_date AS "dueDate",
              status, notes,
              completed_at AS "completedAt",
              completed_by_user_id AS "completedByUserId"
       FROM employee_pre_onboarding_items
       WHERE company_id = $1 AND candidate_id = $2
       ORDER BY
         CASE item_key
           WHEN 'welcome_kit' THEN 1
           WHEN 'rh_onboarding_call' THEN 2
           WHEN 'manager_onboarding' THEN 3
           ELSE 9
         END,
         id ASC`,
      [companyId, candidateId]
    );
    return (res.rows || []).map(mapRow);
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return [];
    throw err;
  }
}

export async function updatePreOnboardingItem(dbOrQuery, {
  companyId,
  candidateId,
  itemId,
  status,
  notes,
  completedByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const nextStatus = String(status || '').trim().toLowerCase();
  if (!STATUSES.has(nextStatus) || nextStatus === 'pending') {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }
  const nextNotes = String(notes || '').trim().slice(0, NOTES_MAX);

  const owned = await db.query(
    `SELECT id FROM employee_pre_onboarding_items
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [itemId, companyId, candidateId]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const res = await db.query(
    `UPDATE employee_pre_onboarding_items
     SET status = $2,
         notes = $3,
         completed_at = NOW(),
         completed_by_user_id = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               item_key AS "itemKey", due_date AS "dueDate",
               status, notes,
               completed_at AS "completedAt",
               completed_by_user_id AS "completedByUserId"`,
    [itemId, nextStatus, nextNotes, completedByUserId || null]
  );
  return { ok: true, item: mapRow(res.rows[0]) };
}

/**
 * Company pulse for Overview (pending / overdue).
 */
export async function getCompanyPreOnboardingPulse(dbOrQuery, { companyId, limit = PULSE_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || PULSE_CAP), PULSE_CAP);
  try {
    const counts = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE)::int AS overdue
       FROM employee_pre_onboarding_items
       WHERE company_id = $1`,
      [companyId]
    );
    const rows = await db.query(
      `SELECT i.id, i.item_key AS "itemKey", i.due_date AS "dueDate", i.status,
              c.id AS "candidateId", c.full_name AS "fullName"
       FROM employee_pre_onboarding_items i
       JOIN candidates c ON c.id = i.candidate_id
       WHERE i.company_id = $1 AND i.status = 'pending'
       ORDER BY i.due_date ASC, i.id ASC
       LIMIT $2`,
      [companyId, cap]
    );
    const today = new Date().toISOString().slice(0, 10);
    return {
      pending: Number(counts.rows[0]?.pending) || 0,
      overdue: Number(counts.rows[0]?.overdue) || 0,
      items: (rows.rows || []).map((r) => ({
        id: Number(r.id),
        itemKey: r.itemKey,
        dueDate: dateOrNull(r.dueDate),
        candidateId: Number(r.candidateId),
        fullName: r.fullName || '',
        overdue: dateOrNull(r.dueDate) && dateOrNull(r.dueDate) < today,
      })),
    };
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return { pending: 0, overdue: 0, items: [] };
    }
    throw err;
  }
}
