/**
 * Light post-hire check-ins (30 / 60 / 90 days from start_date) — B-701.
 * Not a full experience-evaluation / AVD suite.
 */

import { asDb } from '../ae/as-db.js';
import { sanitizeRichTextHtml } from '../sanitize-html.js';
import { ERR } from '../api-error-codes.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';
import {
  addDevelopmentPlanItem,
  createDevelopmentPlan,
  getDevelopmentPlan,
  listDevelopmentPlans,
} from './development-plans.js';

const MILESTONES = [30, 60, 90];
const NOTES_MAX = 4000;
const MEET_URL_MAX = 512;
const STATUSES = new Set(['pending', 'done', 'skipped']);
const OUTCOMES = new Set(['', 'continue', 'develop', 'concern']);
const PULSE_CAP = 8;

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function addDaysIso(isoDate, days) {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days));
  return dt.toISOString().slice(0, 10);
}

function normalizeMeetUrl(raw) {
  const s = String(raw || '').trim().slice(0, MEET_URL_MAX);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
}

function mapRow(r) {
  const due = dateOrNull(r.dueDate);
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    candidateId: Number(r.candidateId),
    milestoneDays: Number(r.milestoneDays),
    dueDate: due,
    status: r.status,
    outcome: r.outcome || '',
    notes: r.notes || '',
    meetUrl: r.meetUrl || null,
    employeeAckAt: r.employeeAckAt || null,
    completedAt: r.completedAt || null,
    completedByUserId: r.completedByUserId != null ? Number(r.completedByUserId) : null,
    overdue: r.status === 'pending' && due && due < today,
  };
}

/**
 * Ensure 30/60/90 rows exist for an employee (idempotent).
 */
export async function ensureOnboardingCheckins(dbOrQuery, { companyId, candidateId }) {
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

  for (const days of MILESTONES) {
    const due = addDaysIso(start, days);
    if (!due) continue;
    await db.query(
      `INSERT INTO employee_onboarding_checkins (
         company_id, candidate_id, milestone_days, due_date
       ) VALUES ($1, $2, $3, $4::date)
       ON CONFLICT (candidate_id, milestone_days) DO NOTHING`,
      [cid, candId, days, due]
    );
  }

  const items = await listOnboardingCheckins(db, { companyId: cid, candidateId: candId });
  return { ok: true, startDate: start, items };
}

export async function listOnboardingCheckins(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery);
  try {
    const res = await db.query(
      `SELECT id, company_id AS "companyId", candidate_id AS "candidateId",
              milestone_days AS "milestoneDays", due_date AS "dueDate",
              status, outcome, notes, meet_url AS "meetUrl",
              employee_ack_at AS "employeeAckAt",
              completed_at AS "completedAt",
              completed_by_user_id AS "completedByUserId"
       FROM employee_onboarding_checkins
       WHERE company_id = $1 AND candidate_id = $2
       ORDER BY milestone_days ASC`,
      [companyId, candidateId]
    );
    return (res.rows || []).map(mapRow);
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return [];
    throw err;
  }
}

/**
 * Complete / skip a check-in. Outcome "develop" can seed a PDI item.
 */
export async function updateOnboardingCheckin(dbOrQuery, {
  companyId,
  candidateId,
  checkinId,
  status,
  outcome = '',
  notes = '',
  meetUrl,
  completedByUserId = null,
  seedPdi = false,
  locale = 'pt-BR',
}) {
  const db = asDb(dbOrQuery);
  const safeStatus = STATUSES.has(String(status)) ? String(status) : null;
  if (!safeStatus || safeStatus === 'pending') {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }
  const safeOutcome = OUTCOMES.has(String(outcome || '')) ? String(outcome || '') : '';
  const safeNotes = sanitizeRichTextHtml(notes, NOTES_MAX) || '';

  const existing = await db.query(
    `SELECT id, status FROM employee_onboarding_checkins
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [checkinId, companyId, candidateId]
  );
  if (existing.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const url = meetUrl !== undefined ? normalizeMeetUrl(meetUrl) : undefined;

  const res = await db.query(
    `UPDATE employee_onboarding_checkins
     SET status = $4,
         outcome = $5,
         notes = $6,
         meet_url = CASE WHEN $8::boolean THEN $9 ELSE meet_url END,
         completed_at = NOW(),
         completed_by_user_id = $7,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               milestone_days AS "milestoneDays", due_date AS "dueDate",
               status, outcome, notes, meet_url AS "meetUrl",
               employee_ack_at AS "employeeAckAt",
               completed_at AS "completedAt",
               completed_by_user_id AS "completedByUserId"`,
    [
      checkinId,
      companyId,
      candidateId,
      safeStatus,
      safeOutcome,
      safeNotes,
      completedByUserId || null,
      url !== undefined,
      url,
    ]
  );
  const item = mapRow(res.rows[0]);
  let pdiItem = null;

  const wantPdi =
    seedPdi ||
    (safeStatus === 'done' && (safeOutcome === 'develop' || safeOutcome === 'concern'));

  if (wantPdi) {
    const days = item.milestoneDays;
    const title =
      locale === 'en'
        ? `Onboarding day ${days}: follow-up actions`
        : `Onboarding D${days}: ações de acompanhamento`;
    const plans = await listDevelopmentPlans(db, { companyId, candidateId, limit: 5 });
    let plan = plans.find((p) => p.status === 'active') || null;
    if (plan) {
      plan = await getDevelopmentPlan(db, { companyId, planId: plan.id, candidateId });
    }
    if (!plan) {
      const created = await createDevelopmentPlan(db, {
        companyId,
        candidateId,
        title: locale === 'en' ? 'Post-hire development' : 'Desenvolvimento pós-contratação',
        objective:
          locale === 'en'
            ? 'Light actions from onboarding check-ins.'
            : 'Ações leves a partir dos check-ins de onboarding.',
        status: 'active',
        createdByUserId: completedByUserId,
      });
      if (created.ok) plan = created.plan;
    }
    if (plan?.id) {
      const added = await addDevelopmentPlanItem(db, {
        companyId,
        planId: plan.id,
        candidateId,
        title,
        notes: safeNotes,
        status: 'todo',
        source: 'onboarding',
        dueDate: item.dueDate,
      });
      if (added.ok) pdiItem = added.item;
    }
  }

  return { ok: true, item, pdiItem };
}

export async function setOnboardingCheckinMeetUrl(dbOrQuery, {
  companyId,
  candidateId,
  checkinId,
  meetUrl,
}) {
  const db = asDb(dbOrQuery);
  const url = normalizeMeetUrl(meetUrl);
  const id = Number(checkinId);
  if (!Number.isFinite(id)) return { ok: false, errorCode: ERR.INVALID_ID };

  const res = await db.query(
    `UPDATE employee_onboarding_checkins
     SET meet_url = $4, updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               milestone_days AS "milestoneDays", due_date AS "dueDate",
               status, outcome, notes, meet_url AS "meetUrl",
               employee_ack_at AS "employeeAckAt",
               completed_at AS "completedAt",
               completed_by_user_id AS "completedByUserId"`,
    [id, companyId, candidateId, url]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, item: mapRow(res.rows[0]) };
}

/**
 * Company pulse for Overview — pending/overdue check-ins (tenant-scoped).
 */
export async function getCompanyOnboardingPulse(dbOrQuery, { companyId, limit = PULSE_CAP } = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return null;
  const cap = Math.min(Math.max(1, Number(limit) || PULSE_CAP), PULSE_CAP);
  try {
    const [totals, overdueRows, upcomingRows] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingCount",
           COUNT(*) FILTER (
             WHERE status = 'pending' AND due_date < CURRENT_DATE
           )::int AS "overdueCount",
           COUNT(*) FILTER (
             WHERE status = 'pending'
               AND due_date >= CURRENT_DATE
               AND due_date <= CURRENT_DATE + INTERVAL '14 days'
           )::int AS "dueSoonCount"
         FROM employee_onboarding_checkins
         WHERE company_id = $1`,
        [cid]
      ),
      db.query(
        `SELECT
           o.id AS "checkinId",
           o.milestone_days AS "milestoneDays",
           o.due_date AS "dueDate",
           c.id AS "candidateId",
           c.full_name AS "candidateName"
         FROM employee_onboarding_checkins o
         JOIN candidates c ON c.id = o.candidate_id AND c.company_id = o.company_id
         WHERE o.company_id = $1
           AND o.status = 'pending'
           AND o.due_date < CURRENT_DATE
         ORDER BY o.due_date ASC, o.id ASC
         LIMIT $2`,
        [cid, cap]
      ),
      db.query(
        `SELECT
           o.id AS "checkinId",
           o.milestone_days AS "milestoneDays",
           o.due_date AS "dueDate",
           c.id AS "candidateId",
           c.full_name AS "candidateName"
         FROM employee_onboarding_checkins o
         JOIN candidates c ON c.id = o.candidate_id AND c.company_id = o.company_id
         WHERE o.company_id = $1
           AND o.status = 'pending'
           AND o.due_date >= CURRENT_DATE
           AND o.due_date <= CURRENT_DATE + INTERVAL '14 days'
         ORDER BY o.due_date ASC, o.id ASC
         LIMIT $2`,
        [cid, cap]
      ),
    ]);
    const t = totals.rows[0] || {};
    const mapNav = (r) => ({
      checkinId: Number(r.checkinId),
      milestoneDays: Number(r.milestoneDays),
      dueDate: dateOrNull(r.dueDate),
      candidateId: Number(r.candidateId),
      candidateName: String(r.candidateName || '').trim() || '—',
      nav: {
        tab: 'team',
        candidate: String(r.candidateId),
        ...(r.candidateName ? { search: String(r.candidateName).trim() } : {}),
      },
    });
    return {
      pendingCount: Number(t.pendingCount) || 0,
      overdueCount: Number(t.overdueCount) || 0,
      dueSoonCount: Number(t.dueSoonCount) || 0,
      overdue: (overdueRows.rows || []).map(mapNav),
      dueSoon: (upcomingRows.rows || []).map(mapNav),
    };
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return null;
    throw err;
  }
}

export const ONBOARDING_MILESTONES = MILESTONES;
export const ONBOARDING_PULSE_CAP = PULSE_CAP;
