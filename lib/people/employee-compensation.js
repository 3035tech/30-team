/**
 * Internal compensation timeline for employees — not payroll / holerite.
 */

import { asDb } from '../ae/as-db.js';
import { stripSalary } from '../br-masks.js';
import { ERR } from '../api-error-codes.js';
import {
  COMPENSATION_EVENT_TYPE,
  COMPENSATION_EVENT_TYPES,
  EMPLOYMENT_STATUS,
} from '../domain-status.js';

const LIST_CAP = 80;
const NOTES_MAX = 500;

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeEventType(raw, fallback = COMPENSATION_EVENT_TYPE.ADJUSTMENT) {
  const s = String(raw || '').trim().toLowerCase();
  return COMPENSATION_EVENT_TYPES.includes(s) ? s : fallback;
}

function mapRow(r) {
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    candidateId: Number(r.candidateId),
    eventType: r.eventType,
    amount: r.amount,
    effectiveDate: dateOrNull(r.effectiveDate),
    notes: r.notes || '',
    createdByUserId: r.createdByUserId != null ? Number(r.createdByUserId) : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

async function assertInternalPerson(db, { companyId, candidateId }) {
  const cid = Number(companyId);
  const cand = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(cand)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  const r = await db.query(
    `SELECT id, employment_status AS "employmentStatus"
     FROM candidates
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [cand, cid]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const status = r.rows[0].employmentStatus;
  if (status !== EMPLOYMENT_STATUS.EMPLOYEE && status !== EMPLOYMENT_STATUS.ALUMNI) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  return { ok: true, employmentStatus: status };
}

export async function getAcceptedOfferHint(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(cand)) return null;

  const r = await db.query(
    `SELECT offer_salary AS "offerSalary",
            offer_start_date AS "offerStartDate",
            offer_status AS "offerStatus"
     FROM vacancy_candidates
     WHERE company_id = $1 AND candidate_id = $2
       AND offer_status = 'accepted'
       AND NULLIF(TRIM(offer_salary), '') IS NOT NULL
     ORDER BY offer_accepted_at DESC NULLS LAST, updated_at DESC, id DESC
     LIMIT 1`,
    [cid, cand]
  );
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  return {
    offerSalary: row.offerSalary,
    offerStartDate: dateOrNull(row.offerStartDate),
    offerStatus: row.offerStatus,
  };
}

export async function listCompensationEvents(dbOrQuery, { companyId, candidateId, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;

  const cap = Math.min(LIST_CAP, Math.max(1, Number(limit) || LIST_CAP));
  const r = await db.query(
    `SELECT id, company_id AS "companyId", candidate_id AS "candidateId",
            event_type AS "eventType", amount,
            effective_date AS "effectiveDate", notes,
            created_by_user_id AS "createdByUserId",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM employee_compensation_events
     WHERE company_id = $1 AND candidate_id = $2
     ORDER BY effective_date DESC, id DESC
     LIMIT $3`,
    [Number(companyId), Number(candidateId), cap]
  );
  const items = (r.rows || []).map(mapRow);
  return {
    ok: true,
    items,
    current: items[0] || null,
    employmentStatus: scoped.employmentStatus,
  };
}

export async function createCompensationEvent(dbOrQuery, {
  companyId,
  candidateId,
  eventType,
  amount,
  effectiveDate,
  notes = '',
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;
  if (scoped.employmentStatus === EMPLOYMENT_STATUS.ALUMNI) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const normalizedAmount = stripSalary(amount);
  if (!normalizedAmount) return { ok: false, errorCode: ERR.INVALID_DATA };
  const eff = dateOrNull(effectiveDate);
  if (!eff) return { ok: false, errorCode: ERR.INVALID_DATA };

  const type = normalizeEventType(eventType, COMPENSATION_EVENT_TYPE.ADJUSTMENT);
  const safeNotes = String(notes || '').trim().slice(0, NOTES_MAX);

  const r = await db.query(
    `INSERT INTO employee_compensation_events (
       company_id, candidate_id, event_type, amount, effective_date, notes, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5::date, $6, $7)
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               event_type AS "eventType", amount,
               effective_date AS "effectiveDate", notes,
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      Number(companyId),
      Number(candidateId),
      type,
      normalizedAmount,
      eff,
      safeNotes,
      createdByUserId || null,
    ]
  );
  return { ok: true, event: mapRow(r.rows[0]) };
}

export async function updateCompensationEvent(dbOrQuery, {
  companyId,
  candidateId,
  eventId,
  eventType,
  amount,
  effectiveDate,
  notes,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;
  if (scoped.employmentStatus === EMPLOYMENT_STATUS.ALUMNI) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const eid = Number(eventId);
  if (!Number.isFinite(eid) || eid <= 0) return { ok: false, errorCode: ERR.INVALID_ID };

  const sets = ['updated_at = NOW()'];
  const params = [Number(companyId), Number(candidateId), eid];
  let n = 4;

  if (eventType !== undefined) {
    sets.push(`event_type = $${n++}`);
    params.push(normalizeEventType(eventType));
  }
  if (amount !== undefined) {
    const normalizedAmount = stripSalary(amount);
    if (!normalizedAmount) return { ok: false, errorCode: ERR.INVALID_DATA };
    sets.push(`amount = $${n++}`);
    params.push(normalizedAmount);
  }
  if (effectiveDate !== undefined) {
    const eff = dateOrNull(effectiveDate);
    if (!eff) return { ok: false, errorCode: ERR.INVALID_DATA };
    sets.push(`effective_date = $${n++}::date`);
    params.push(eff);
  }
  if (notes !== undefined) {
    sets.push(`notes = $${n++}`);
    params.push(String(notes || '').trim().slice(0, NOTES_MAX));
  }

  if (sets.length === 1) return { ok: false, errorCode: ERR.INVALID_DATA };

  const r = await db.query(
    `UPDATE employee_compensation_events
     SET ${sets.join(', ')}
     WHERE id = $3 AND company_id = $1 AND candidate_id = $2
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               event_type AS "eventType", amount,
               effective_date AS "effectiveDate", notes,
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    params
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, event: mapRow(r.rows[0]) };
}

export async function deleteCompensationEvent(dbOrQuery, { companyId, candidateId, eventId }) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;
  if (scoped.employmentStatus === EMPLOYMENT_STATUS.ALUMNI) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const eid = Number(eventId);
  if (!Number.isFinite(eid) || eid <= 0) return { ok: false, errorCode: ERR.INVALID_ID };

  const r = await db.query(
    `DELETE FROM employee_compensation_events
     WHERE id = $3 AND company_id = $1 AND candidate_id = $2
     RETURNING id`,
    [Number(companyId), Number(candidateId), eid]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, eventId: eid };
}

/** Seed first row from accepted vacancy offer (idempotent if events already exist). */
export async function importCompensationFromOffer(dbOrQuery, {
  companyId,
  candidateId,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const existing = await listCompensationEvents(db, { companyId, candidateId, limit: 1 });
  if (!existing.ok) return existing;
  if ((existing.items || []).length > 0) {
    return { ok: false, errorCode: ERR.INVALID_DATA, reason: 'has_events' };
  }

  const hint = await getAcceptedOfferHint(db, { companyId, candidateId });
  if (!hint?.offerSalary) return { ok: false, errorCode: ERR.NOT_FOUND };

  const eff =
    hint.offerStartDate ||
    new Date().toISOString().slice(0, 10);

  return createCompensationEvent(db, {
    companyId,
    candidateId,
    eventType: COMPENSATION_EVENT_TYPE.HIRE,
    amount: hint.offerSalary,
    effectiveDate: eff,
    notes: '',
    createdByUserId,
  });
}
