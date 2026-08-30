/**
 * B-3003 — Variable pay suggestions from submitted reviews (not payroll / INSS).
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import { salaryAmountNumber, stripSalary } from '../br-masks.js';
import {
  COMPENSATION_APPROVAL_STATUS,
  COMPENSATION_APPROVAL_STATUSES,
  COMPENSATION_EVENT_TYPE,
} from '../domain-status.js';
import { createCompensationEvent, listCompensationEvents } from './employee-compensation.js';

const SUGGEST_PCT = 5;

/**
 * True when review outcomes justify a suggested bonus/PLR.
 */
export function shouldSuggestVariablePay(outcomes) {
  const entries = Object.values(outcomes && typeof outcomes === 'object' ? outcomes : {});
  if (!entries.length) return false;
  let good = 0;
  let total = 0;
  let exceeded = false;
  for (const o of entries) {
    const key = String(o?.outcome || '').toLowerCase();
    if (!key) continue;
    total += 1;
    if (key === 'exceeded') {
      exceeded = true;
      good += 1;
    } else if (key === 'met') {
      good += 1;
    }
  }
  if (!total) return false;
  if (exceeded) return true;
  return good / total >= 0.5;
}

/**
 * After submit: create a proposed bonus event when rule matches (idempotent per review).
 */
export async function suggestVariablePayFromReview(dbOrQuery, {
  companyId,
  candidateId,
  cycleId,
  reviewId,
  outcomes,
  createdByUserId = null,
}) {
  if (!shouldSuggestVariablePay(outcomes)) {
    return { ok: true, suggested: false };
  }

  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  const review = Number(reviewId);
  const cycle = Number(cycleId);
  if (![cid, cand, review, cycle].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const dup = await db.query(
    `SELECT id FROM employee_compensation_events
     WHERE company_id = $1 AND source_review_id = $2
     LIMIT 1`,
    [cid, review]
  );
  if (dup.rowCount > 0) {
    return { ok: true, suggested: false, alreadyExists: true, eventId: Number(dup.rows[0].id) };
  }

  const current = await listCompensationEvents(db, { companyId: cid, candidateId: cand, limit: 1 });
  const currentAmount =
    current.ok && current.current ? salaryAmountNumber(current.current.amount) : null;
  let amountStr = '100.00';
  if (currentAmount != null && currentAmount > 0) {
    amountStr = stripSalary(String((currentAmount * (SUGGEST_PCT / 100)).toFixed(2))) || amountStr;
  }

  const notes = [
    'Bônus/PLR sugerido a partir da avaliação (hipótese para RH aprovar).',
    `Ciclo #${cycle} · review #${review}.`,
    currentAmount != null ? `Base ~${SUGGEST_PCT}% do salário vigente.` : 'Ajuste o valor antes de aprovar.',
  ].join(' ');

  const created = await createCompensationEvent(db, {
    companyId: cid,
    candidateId: cand,
    eventType: COMPENSATION_EVENT_TYPE.BONUS,
    amount: amountStr,
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes,
    createdByUserId,
    approvalStatus: COMPENSATION_APPROVAL_STATUS.PROPOSED,
    sourceReviewId: review,
    sourceCycleId: cycle,
  });
  if (!created.ok) return created;
  return { ok: true, suggested: true, event: created.event };
}

export async function setCompensationApprovalStatus(dbOrQuery, {
  companyId,
  candidateId,
  eventId,
  approvalStatus,
}) {
  const db = asDb(dbOrQuery);
  const status = String(approvalStatus || '').toLowerCase();
  if (!COMPENSATION_APPROVAL_STATUSES.includes(status)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  const cid = Number(companyId);
  const cand = Number(candidateId);
  const eid = Number(eventId);
  if (![cid, cand, eid].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const r = await db.query(
    `UPDATE employee_compensation_events
     SET approval_status = $4, updated_at = NOW()
     WHERE id = $3 AND company_id = $1 AND candidate_id = $2
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               event_type AS "eventType", amount,
               effective_date AS "effectiveDate", notes,
               approval_status AS "approvalStatus",
               source_review_id AS "sourceReviewId",
               source_cycle_id AS "sourceCycleId",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [cid, cand, eid, status]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const row = r.rows[0];
  return {
    ok: true,
    event: {
      id: Number(row.id),
      companyId: Number(row.companyId),
      candidateId: Number(row.candidateId),
      eventType: row.eventType,
      amount: row.amount,
      effectiveDate: row.effectiveDate,
      notes: row.notes || '',
      approvalStatus: row.approvalStatus,
      sourceReviewId: row.sourceReviewId != null ? Number(row.sourceReviewId) : null,
      sourceCycleId: row.sourceCycleId != null ? Number(row.sourceCycleId) : null,
      createdByUserId: row.createdByUserId != null ? Number(row.createdByUserId) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

/**
 * Collaborator-facing proposed/approved bonuses (not holerite).
 */
export async function listEmployeeVisibleCompensation(dbOrQuery, {
  companyId,
  candidateId,
  limit = 20,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  const cap = Math.min(40, Math.max(1, Number(limit) || 20));
  if (![cid, cand].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  const r = await db.query(
    `SELECT id, event_type AS "eventType", amount,
            effective_date AS "effectiveDate", notes,
            approval_status AS "approvalStatus",
            created_at AS "createdAt"
     FROM employee_compensation_events
     WHERE company_id = $1 AND candidate_id = $2
       AND approval_status IN ('proposed', 'approved')
       AND event_type IN ('bonus', 'other')
     ORDER BY effective_date DESC, id DESC
     LIMIT $3`,
    [cid, cand, cap]
  );
  return {
    ok: true,
    items: (r.rows || []).map((row) => ({
      id: Number(row.id),
      eventType: row.eventType,
      amount: row.amount,
      effectiveDate: row.effectiveDate,
      notes: row.notes || '',
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt,
    })),
  };
}
