/**
 * B-RH2-14 — assign company catalog benefits to a collaborator (not payroll).
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';

const LIST_CAP = 100;
const VALUE_NOTE_MAX = 500;

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function mapRow(r) {
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    candidateId: Number(r.candidateId),
    benefitId: Number(r.benefitId),
    benefitName: r.benefitName || null,
    benefitType: r.benefitType || null,
    categoryName: r.categoryName || null,
    valueNote: r.valueNote || '',
    startsOn: dateOrNull(r.startsOn),
    endsOn: dateOrNull(r.endsOn),
    active: Boolean(r.active),
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

export async function listEmployeeBenefitAssignments(dbOrQuery, {
  companyId,
  candidateId,
  includeEnded = true,
  limit = LIST_CAP,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;

  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const params = [companyId, candidateId];
  let where = 'a.company_id = $1 AND a.candidate_id = $2';
  if (!includeEnded) {
    where += ' AND a.active = TRUE';
  }
  params.push(cap);

  const res = await db.query(
    `SELECT a.id, a.company_id AS "companyId", a.candidate_id AS "candidateId",
            a.benefit_id AS "benefitId", a.value_note AS "valueNote",
            a.starts_on AS "startsOn", a.ends_on AS "endsOn", a.active,
            a.created_by_user_id AS "createdByUserId",
            a.created_at AS "createdAt", a.updated_at AS "updatedAt",
            b.name AS "benefitName", b.benefit_type AS "benefitType",
            COALESCE(c.name, b.category) AS "categoryName"
     FROM employee_benefit_assignments a
     JOIN company_benefits b ON b.id = a.benefit_id AND b.company_id = a.company_id
     LEFT JOIN benefit_categories c ON c.id = b.category_id
     WHERE ${where}
     ORDER BY a.active DESC, a.starts_on DESC, a.id DESC
     LIMIT $${params.length}`,
    params
  );
  return {
    ok: true,
    items: res.rows.map(mapRow),
    employmentStatus: scoped.employmentStatus,
  };
}

export async function assignEmployeeBenefit(dbOrQuery, {
  companyId,
  candidateId,
  benefitId,
  valueNote = '',
  startsOn = null,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;
  if (scoped.employmentStatus === EMPLOYMENT_STATUS.ALUMNI) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const bid = Number(benefitId);
  if (!Number.isFinite(bid) || bid <= 0) return { ok: false, errorCode: ERR.INVALID_ID };

  const benefit = await db.query(
    `SELECT id FROM company_benefits
     WHERE id = $1 AND company_id = $2 AND active = TRUE
     LIMIT 1`,
    [bid, companyId]
  );
  if (benefit.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const start = dateOrNull(startsOn) || new Date().toISOString().slice(0, 10);
  const note = String(valueNote || '').trim().slice(0, VALUE_NOTE_MAX);

  const existing = await db.query(
    `SELECT id FROM employee_benefit_assignments
     WHERE company_id = $1 AND candidate_id = $2 AND benefit_id = $3 AND active = TRUE
     LIMIT 1`,
    [companyId, candidateId, bid]
  );
  if (existing.rowCount > 0) {
    return { ok: false, errorCode: ERR.BENEFIT_ALREADY_ASSIGNED };
  }

  const res = await db.query(
    `INSERT INTO employee_benefit_assignments (
       company_id, candidate_id, benefit_id, value_note, starts_on, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5::date, $6)
     RETURNING id`,
    [companyId, candidateId, bid, note, start, createdByUserId || null]
  );
  const listed = await listEmployeeBenefitAssignments(db, {
    companyId,
    candidateId,
    includeEnded: true,
  });
  const item = (listed.items || []).find((x) => Number(x.id) === Number(res.rows[0].id)) || null;
  return { ok: true, item };
}

export async function endEmployeeBenefitAssignment(dbOrQuery, {
  companyId,
  candidateId,
  assignmentId,
  endsOn = null,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;

  const aid = Number(assignmentId);
  if (!Number.isFinite(aid) || aid <= 0) return { ok: false, errorCode: ERR.INVALID_ID };

  const end = dateOrNull(endsOn) || new Date().toISOString().slice(0, 10);

  const res = await db.query(
    `UPDATE employee_benefit_assignments
     SET active = FALSE,
         ends_on = GREATEST(starts_on, $4::date),
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3 AND active = TRUE
     RETURNING id`,
    [aid, companyId, candidateId, end]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true };
}

export async function updateEmployeeBenefitAssignment(dbOrQuery, {
  companyId,
  candidateId,
  assignmentId,
  valueNote,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertInternalPerson(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;

  const aid = Number(assignmentId);
  if (!Number.isFinite(aid) || aid <= 0) return { ok: false, errorCode: ERR.INVALID_ID };
  if (valueNote === undefined) return { ok: false, errorCode: ERR.INVALID_DATA };

  const note = String(valueNote || '').trim().slice(0, VALUE_NOTE_MAX);
  const res = await db.query(
    `UPDATE employee_benefit_assignments
     SET value_note = $4, updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3 AND active = TRUE
     RETURNING id`,
    [aid, companyId, candidateId, note]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const listed = await listEmployeeBenefitAssignments(db, {
    companyId,
    candidateId,
    includeEnded: true,
  });
  const item = (listed.items || []).find((x) => Number(x.id) === aid) || null;
  return { ok: true, item };
}
