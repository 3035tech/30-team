/**
 * B-RH2-15 — Formal competency reviews (90 / 180 / 360 + optional self).
 * Separate from light performance_cycles (goals → PDI).
 */

import crypto from 'crypto';
import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import {
  EMPLOYMENT_STATUS,
  FORMAL_LIKERT_MAX,
  FORMAL_LIKERT_MIN,
  FORMAL_RATER_ROLE,
  FORMAL_RATER_STATUS,
  FORMAL_REVIEW_CYCLE_STATUS,
  FORMAL_REVIEW_MODEL,
  FORMAL_REVIEW_MODELS,
  FORMAL_REVIEW_STATUS,
} from '../domain-status.js';

const TITLE_MAX = 200;
const DESC_MAX = 4000;
const LABEL_MAX = 200;
const NOTES_MAX = 4000;
const SCORE_NOTES_MAX = 2000;
const LIST_CAP = 40;
const ITEMS_CAP = 30;
const TOKEN_TTL_DAYS = 45;

const CYCLE_STATUSES = new Set(Object.values(FORMAL_REVIEW_CYCLE_STATUS));
const REVIEW_STATUSES = new Set(Object.values(FORMAL_REVIEW_STATUS));
const MODELS = new Set(FORMAL_REVIEW_MODELS);

function normalizeTitle(raw, max = TITLE_MAX) {
  const title = String(raw || '').trim().slice(0, max);
  return title.length >= 1 ? title : null;
}

function normalizeStatus(raw, allowed, fallback) {
  const s = String(raw || '').trim().toLowerCase();
  return allowed.has(s) ? s : fallback;
}

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeModel(raw) {
  const m = String(raw || '').trim();
  return MODELS.has(m) ? m : FORMAL_REVIEW_MODEL.NINETY;
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function addDaysIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString();
}

function isLockedReviewStatus(status) {
  return (
    status === FORMAL_REVIEW_STATUS.FINALIZED ||
    status === FORMAL_REVIEW_STATUS.SENT ||
    status === FORMAL_REVIEW_STATUS.ARCHIVED
  );
}

function mapCycle(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.companyId,
    title: row.title,
    description: row.description || '',
    model: row.model,
    includeSelf: !!row.includeSelf,
    status: row.status,
    periodStart: row.periodStart || null,
    periodEnd: row.periodEnd || null,
    createdByUserId: row.createdByUserId || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewCount: row.reviewCount != null ? Number(row.reviewCount) : undefined,
  };
}

function mapReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    cycleId: row.cycleId,
    companyId: row.companyId,
    subjectCandidateId: row.subjectCandidateId,
    subjectName: row.subjectName || null,
    subjectEmail: row.subjectEmail || null,
    managerUserId: row.managerUserId || null,
    jobRoleId: row.jobRoleId || null,
    status: row.status,
    finalizedAt: row.finalizedAt || null,
    sentAt: row.sentAt || null,
    archivedAt: row.archivedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapItem(row) {
  return {
    id: row.id,
    reviewId: row.reviewId,
    competencyId: row.competencyId || null,
    label: row.label,
    sortOrder: row.sortOrder,
  };
}

function mapRater(row) {
  return {
    id: row.id,
    reviewId: row.reviewId,
    role: row.role,
    userId: row.userId || null,
    candidateId: row.candidateId || null,
    externalName: row.externalName || '',
    externalEmail: row.externalEmail || '',
    externalTitle: row.externalTitle || '',
    token: row.token || null,
    tokenExpiresAt: row.tokenExpiresAt || null,
    status: row.status,
    submittedAt: row.submittedAt || null,
    overallNotes: row.overallNotes || '',
  };
}

// ── Competency catalog ──────────────────────────────────────────────────────

export async function listCompanyCompetencies(dbOrQuery, { companyId, includeInactive = false, limit = LIST_CAP } = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return [];
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT id, company_id AS "companyId", name, description, active,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM company_competencies
     WHERE company_id = $1
       AND ($2::boolean OR active = TRUE)
     ORDER BY name ASC, id ASC
     LIMIT $3`,
    [cid, !!includeInactive, cap]
  );
  return res.rows;
}

export async function createCompanyCompetency(dbOrQuery, { companyId, name, description = '' }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const safeName = normalizeTitle(name);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.INVALID_COMPANY };
  if (!safeName) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  try {
    const res = await db.query(
      `INSERT INTO company_competencies (company_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, company_id AS "companyId", name, description, active,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [cid, safeName, String(description || '').trim().slice(0, DESC_MAX)]
    );
    return { ok: true, competency: res.rows[0] };
  } catch (err) {
    if (err?.code === '23505') return { ok: false, errorCode: ERR.COMPETENCY_NAME_EXISTS };
    throw err;
  }
}

export async function listJobRoleCompetencies(dbOrQuery, { companyId, jobRoleId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(jobRoleId);
  if (!Number.isFinite(cid) || !Number.isFinite(rid)) return [];
  const res = await db.query(
    `SELECT jrc.id, jrc.competency_id AS "competencyId", jrc.sort_order AS "sortOrder",
            c.name, c.description
     FROM job_role_competencies jrc
     JOIN company_competencies c ON c.id = jrc.competency_id AND c.company_id = jrc.company_id
     WHERE jrc.company_id = $1 AND jrc.job_role_id = $2 AND c.active = TRUE
     ORDER BY jrc.sort_order ASC, jrc.id ASC
     LIMIT $3`,
    [cid, rid, ITEMS_CAP]
  );
  return res.rows;
}

export async function setJobRoleCompetencies(dbOrQuery, { companyId, jobRoleId, competencyIds = [] }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(jobRoleId);
  if (!Number.isFinite(cid) || !Number.isFinite(rid)) return { ok: false, errorCode: ERR.INVALID_ID };
  const role = await db.query(
    `SELECT id FROM job_roles WHERE id = $1 AND company_id = $2 AND active = TRUE LIMIT 1`,
    [rid, cid]
  );
  if (role.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const ids = [...new Set((competencyIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))].slice(
    0,
    ITEMS_CAP
  );
  await db.query(`DELETE FROM job_role_competencies WHERE company_id = $1 AND job_role_id = $2`, [cid, rid]);
  for (let i = 0; i < ids.length; i += 1) {
    await db.query(
      `INSERT INTO job_role_competencies (company_id, job_role_id, competency_id, sort_order)
       SELECT $1, $2, c.id, $4
       FROM company_competencies c
       WHERE c.id = $3 AND c.company_id = $1 AND c.active = TRUE
       ON CONFLICT (job_role_id, competency_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [cid, rid, ids[i], i]
    );
  }
  return { ok: true, items: await listJobRoleCompetencies(db, { companyId: cid, jobRoleId: rid }) };
}

// ── Cycles ──────────────────────────────────────────────────────────────────

export async function listFormalReviewCycles(dbOrQuery, { companyId, limit = LIST_CAP } = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return [];
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT c.id, c.company_id AS "companyId", c.title, c.description, c.model,
            c.include_self AS "includeSelf", c.status,
            c.period_start AS "periodStart", c.period_end AS "periodEnd",
            c.created_by_user_id AS "createdByUserId",
            c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            (SELECT COUNT(*)::int FROM formal_reviews r WHERE r.cycle_id = c.id) AS "reviewCount"
     FROM formal_review_cycles c
     WHERE c.company_id = $1
     ORDER BY c.updated_at DESC, c.id DESC
     LIMIT $2`,
    [cid, cap]
  );
  return res.rows.map(mapCycle);
}

export async function createFormalReviewCycle(dbOrQuery, {
  companyId,
  title,
  description = '',
  model = FORMAL_REVIEW_MODEL.NINETY,
  includeSelf = false,
  periodStart = null,
  periodEnd = null,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const safeTitle = normalizeTitle(title);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.INVALID_COMPANY };
  if (!safeTitle) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  const res = await db.query(
    `INSERT INTO formal_review_cycles (
       company_id, title, description, model, include_self, status,
       period_start, period_end, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, '${FORMAL_REVIEW_CYCLE_STATUS.DRAFT}', $6::date, $7::date, $8)
     RETURNING id, company_id AS "companyId", title, description, model,
               include_self AS "includeSelf", status,
               period_start AS "periodStart", period_end AS "periodEnd",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      cid,
      safeTitle,
      String(description || '').trim().slice(0, DESC_MAX),
      normalizeModel(model),
      !!includeSelf,
      dateOrNull(periodStart),
      dateOrNull(periodEnd),
      createdByUserId || null,
    ]
  );
  return { ok: true, cycle: mapCycle(res.rows[0]) };
}

export async function updateFormalReviewCycle(dbOrQuery, {
  companyId,
  cycleId,
  title,
  description,
  model,
  includeSelf,
  status,
  periodStart,
  periodEnd,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const id = Number(cycleId);
  if (!Number.isFinite(cid) || !Number.isFinite(id)) return { ok: false, errorCode: ERR.INVALID_ID };
  const existing = await db.query(
    `SELECT id, status, model, include_self AS "includeSelf", title, description,
            period_start AS "periodStart", period_end AS "periodEnd"
     FROM formal_review_cycles WHERE id = $1 AND company_id = $2 LIMIT 1`,
    [id, cid]
  );
  if (existing.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const cur = existing.rows[0];
  if (cur.status === FORMAL_REVIEW_CYCLE_STATUS.CLOSED && status !== FORMAL_REVIEW_CYCLE_STATUS.CLOSED) {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }
  const nextTitle = title !== undefined ? normalizeTitle(title) : cur.title;
  if (!nextTitle) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  const nextStatus =
    status !== undefined
      ? normalizeStatus(status, CYCLE_STATUSES, cur.status)
      : cur.status;
  const nextModel =
    cur.status === FORMAL_REVIEW_CYCLE_STATUS.DRAFT && model !== undefined
      ? normalizeModel(model)
      : cur.model;
  const nextSelf =
    cur.status === FORMAL_REVIEW_CYCLE_STATUS.DRAFT && includeSelf !== undefined
      ? !!includeSelf
      : cur.includeSelf;

  const res = await db.query(
    `UPDATE formal_review_cycles
     SET title = $3, description = $4, model = $5, include_self = $6, status = $7,
         period_start = $8::date, period_end = $9::date, updated_at = NOW()
     WHERE id = $1 AND company_id = $2
     RETURNING id, company_id AS "companyId", title, description, model,
               include_self AS "includeSelf", status,
               period_start AS "periodStart", period_end AS "periodEnd",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      id,
      cid,
      nextTitle,
      description !== undefined ? String(description || '').trim().slice(0, DESC_MAX) : cur.description,
      nextModel,
      nextSelf,
      nextStatus,
      periodStart !== undefined ? dateOrNull(periodStart) : cur.periodStart,
      periodEnd !== undefined ? dateOrNull(periodEnd) : cur.periodEnd,
    ]
  );
  return { ok: true, cycle: mapCycle(res.rows[0]) };
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function listFormalReviews(dbOrQuery, { companyId, cycleId, limit = LIST_CAP } = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cyc = Number(cycleId);
  if (!Number.isFinite(cid) || !Number.isFinite(cyc)) return [];
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT r.id, r.cycle_id AS "cycleId", r.company_id AS "companyId",
            r.subject_candidate_id AS "subjectCandidateId",
            r.manager_user_id AS "managerUserId", r.job_role_id AS "jobRoleId",
            r.status, r.finalized_at AS "finalizedAt", r.sent_at AS "sentAt",
            r.archived_at AS "archivedAt",
            r.created_at AS "createdAt", r.updated_at AS "updatedAt",
            c.full_name AS "subjectName", c.email AS "subjectEmail"
     FROM formal_reviews r
     JOIN candidates c ON c.id = r.subject_candidate_id AND c.company_id = r.company_id
     WHERE r.company_id = $1 AND r.cycle_id = $2
     ORDER BY r.updated_at DESC, r.id DESC
     LIMIT $3`,
    [cid, cyc, cap]
  );
  return res.rows.map(mapReview);
}

async function seedItemsFromJobRole(db, { companyId, reviewId, jobRoleId }) {
  if (!jobRoleId) return 0;
  const comps = await listJobRoleCompetencies(db, { companyId, jobRoleId });
  let n = 0;
  for (let i = 0; i < comps.length; i += 1) {
    await db.query(
      `INSERT INTO formal_review_items (review_id, company_id, competency_id, label, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [reviewId, companyId, comps[i].competencyId, comps[i].name.slice(0, LABEL_MAX), i]
    );
    n += 1;
  }
  return n;
}

export async function createFormalReview(dbOrQuery, {
  companyId,
  cycleId,
  subjectCandidateId,
  managerUserId = null,
  jobRoleId = null,
  externalName = '',
  externalEmail = '',
  externalTitle = '',
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cyc = Number(cycleId);
  const sid = Number(subjectCandidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(cyc) || !Number.isFinite(sid)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const cycle = await db.query(
    `SELECT id, model, include_self AS "includeSelf", status
     FROM formal_review_cycles WHERE id = $1 AND company_id = $2 LIMIT 1`,
    [cyc, cid]
  );
  if (cycle.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (cycle.rows[0].status === FORMAL_REVIEW_CYCLE_STATUS.CLOSED) {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }

  const subject = await db.query(
    `SELECT id, job_role_id AS "jobRoleId"
     FROM candidates
     WHERE id = $1 AND company_id = $2 AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     LIMIT 1`,
    [sid, cid]
  );
  if (subject.rowCount === 0) return { ok: false, errorCode: ERR.CANDIDATE_NOT_FOUND };

  const model = cycle.rows[0].model;
  const extName = String(externalName || '').trim().slice(0, LABEL_MAX);
  const extEmail = String(externalEmail || '').trim().toLowerCase().slice(0, 320);
  const extTitle = String(externalTitle || '').trim().slice(0, LABEL_MAX);
  if (model === FORMAL_REVIEW_MODEL.THREE_SIXTY && (!extName || !extEmail)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const roleId = Number(jobRoleId) || subject.rows[0].jobRoleId || null;

  let review;
  try {
    const res = await db.query(
      `INSERT INTO formal_reviews (
         cycle_id, company_id, subject_candidate_id, manager_user_id, job_role_id, status
       ) VALUES ($1, $2, $3, $4, $5, '${FORMAL_REVIEW_STATUS.DRAFT}')
       RETURNING id, cycle_id AS "cycleId", company_id AS "companyId",
                 subject_candidate_id AS "subjectCandidateId",
                 manager_user_id AS "managerUserId", job_role_id AS "jobRoleId",
                 status, finalized_at AS "finalizedAt", sent_at AS "sentAt",
                 archived_at AS "archivedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [cyc, cid, sid, managerUserId || null, roleId]
    );
    review = mapReview(res.rows[0]);
  } catch (err) {
    if (err?.code === '23505') return { ok: false, errorCode: ERR.FORMAL_REVIEW_EXISTS };
    throw err;
  }

  await seedItemsFromJobRole(db, { companyId: cid, reviewId: review.id, jobRoleId: roleId });

  if (model === FORMAL_REVIEW_MODEL.THREE_SIXTY) {
    await db.query(
      `INSERT INTO formal_review_raters (
         review_id, company_id, role, external_name, external_email, external_title, status
       ) VALUES ($1, $2, '${FORMAL_RATER_ROLE.EXTERNAL}', $3, $4, $5, '${FORMAL_RATER_STATUS.PENDING}')
       ON CONFLICT (review_id, role) DO UPDATE
         SET external_name = EXCLUDED.external_name,
             external_email = EXCLUDED.external_email,
             external_title = EXCLUDED.external_title,
             updated_at = NOW()`,
      [review.id, cid, extName, extEmail, extTitle]
    );
  }

  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: review.id }) };
}

export async function getFormalReviewDetail(dbOrQuery, { companyId, reviewId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  if (!Number.isFinite(cid) || !Number.isFinite(rid)) return null;

  const rev = await db.query(
    `SELECT r.id, r.cycle_id AS "cycleId", r.company_id AS "companyId",
            r.subject_candidate_id AS "subjectCandidateId",
            r.manager_user_id AS "managerUserId", r.job_role_id AS "jobRoleId",
            r.status, r.finalized_at AS "finalizedAt", r.sent_at AS "sentAt",
            r.archived_at AS "archivedAt",
            r.created_at AS "createdAt", r.updated_at AS "updatedAt",
            c.full_name AS "subjectName", c.email AS "subjectEmail",
            cy.model, cy.include_self AS "includeSelf", cy.title AS "cycleTitle"
     FROM formal_reviews r
     JOIN candidates c ON c.id = r.subject_candidate_id AND c.company_id = r.company_id
     JOIN formal_review_cycles cy ON cy.id = r.cycle_id AND cy.company_id = r.company_id
     WHERE r.id = $1 AND r.company_id = $2
     LIMIT 1`,
    [rid, cid]
  );
  if (rev.rowCount === 0) return null;
  const review = { ...mapReview(rev.rows[0]), model: rev.rows[0].model, includeSelf: !!rev.rows[0].includeSelf, cycleTitle: rev.rows[0].cycleTitle };

  const items = await db.query(
    `SELECT id, review_id AS "reviewId", competency_id AS "competencyId",
            label, sort_order AS "sortOrder"
     FROM formal_review_items WHERE review_id = $1 AND company_id = $2
     ORDER BY sort_order ASC, id ASC`,
    [rid, cid]
  );
  const raters = await db.query(
    `SELECT id, review_id AS "reviewId", role, user_id AS "userId",
            candidate_id AS "candidateId",
            external_name AS "externalName", external_email AS "externalEmail",
            external_title AS "externalTitle",
            token, token_expires_at AS "tokenExpiresAt",
            status, submitted_at AS "submittedAt", overall_notes AS "overallNotes"
     FROM formal_review_raters WHERE review_id = $1 AND company_id = $2
     ORDER BY id ASC`,
    [rid, cid]
  );
  const scores = await db.query(
    `SELECT s.rater_id AS "raterId", s.item_id AS "itemId", s.score, s.notes
     FROM formal_review_scores s
     JOIN formal_review_raters rr ON rr.id = s.rater_id
     WHERE rr.review_id = $1 AND s.company_id = $2`,
    [rid, cid]
  );

  return {
    ...review,
    items: items.rows.map(mapItem),
    raters: raters.rows.map(mapRater),
    scores: scores.rows,
  };
}

export async function addFormalReviewItem(dbOrQuery, {
  companyId,
  reviewId,
  label,
  competencyId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const safeLabel = normalizeTitle(label, LABEL_MAX);
  if (!safeLabel) return { ok: false, errorCode: ERR.TITLE_REQUIRED };

  const rev = await db.query(
    `SELECT id, status FROM formal_reviews WHERE id = $1 AND company_id = $2 LIMIT 1`,
    [rid, cid]
  );
  if (rev.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (isLockedReviewStatus(rev.rows[0].status) || rev.rows[0].status === FORMAL_REVIEW_STATUS.COLLECTING) {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }

  const count = await db.query(
    `SELECT COUNT(*)::int AS n FROM formal_review_items WHERE review_id = $1`,
    [rid]
  );
  if ((count.rows[0]?.n || 0) >= ITEMS_CAP) return { ok: false, errorCode: ERR.ITEMS_CAP };

  let compId = null;
  if (competencyId != null) {
    const n = Number(competencyId);
    if (Number.isFinite(n) && n > 0) {
      const c = await db.query(
        `SELECT id FROM company_competencies WHERE id = $1 AND company_id = $2 AND active = TRUE`,
        [n, cid]
      );
      if (c.rowCount) compId = n;
    }
  }

  const maxOrd = await db.query(
    `SELECT COALESCE(MAX(sort_order), -1)::int AS m FROM formal_review_items WHERE review_id = $1`,
    [rid]
  );
  const res = await db.query(
    `INSERT INTO formal_review_items (review_id, company_id, competency_id, label, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, review_id AS "reviewId", competency_id AS "competencyId",
               label, sort_order AS "sortOrder"`,
    [rid, cid, compId, safeLabel, (maxOrd.rows[0]?.m || 0) + 1]
  );
  return { ok: true, item: mapItem(res.rows[0]) };
}

export async function setFormalReviewExternal(dbOrQuery, {
  companyId,
  reviewId,
  externalName,
  externalEmail,
  externalTitle = '',
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const name = String(externalName || '').trim().slice(0, LABEL_MAX);
  const email = String(externalEmail || '').trim().toLowerCase().slice(0, 320);
  const title = String(externalTitle || '').trim().slice(0, LABEL_MAX);
  if (!name || !email) return { ok: false, errorCode: ERR.INVALID_DATA };

  const rev = await db.query(
    `SELECT r.id, r.status, c.model
     FROM formal_reviews r
     JOIN formal_review_cycles c ON c.id = r.cycle_id
     WHERE r.id = $1 AND r.company_id = $2 LIMIT 1`,
    [rid, cid]
  );
  if (rev.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (rev.rows[0].model !== FORMAL_REVIEW_MODEL.THREE_SIXTY) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  if (isLockedReviewStatus(rev.rows[0].status)) return { ok: false, errorCode: ERR.INVALID_STATUS };

  await db.query(
    `INSERT INTO formal_review_raters (
       review_id, company_id, role, external_name, external_email, external_title, status
     ) VALUES ($1, $2, '${FORMAL_RATER_ROLE.EXTERNAL}', $3, $4, $5, '${FORMAL_RATER_STATUS.PENDING}')
     ON CONFLICT (review_id, role) DO UPDATE
       SET external_name = EXCLUDED.external_name,
           external_email = EXCLUDED.external_email,
           external_title = EXCLUDED.external_title,
           updated_at = NOW()`,
    [rid, cid, name, email, title]
  );
  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: rid }) };
}

async function ensureRater(db, { reviewId, companyId, role, userId = null, candidateId = null, withToken = false, external = null }) {
  const token = withToken ? generateToken() : null;
  const expires = withToken ? addDaysIso(TOKEN_TTL_DAYS) : null;
  const res = await db.query(
    `INSERT INTO formal_review_raters (
       review_id, company_id, role, user_id, candidate_id,
       external_name, external_email, external_title,
       token, token_expires_at, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, '${FORMAL_RATER_STATUS.PENDING}'
     )
     ON CONFLICT (review_id, role) DO UPDATE
       SET user_id = COALESCE(EXCLUDED.user_id, formal_review_raters.user_id),
           candidate_id = COALESCE(EXCLUDED.candidate_id, formal_review_raters.candidate_id),
           external_name = CASE WHEN EXCLUDED.external_name <> '' THEN EXCLUDED.external_name ELSE formal_review_raters.external_name END,
           external_email = CASE WHEN EXCLUDED.external_email <> '' THEN EXCLUDED.external_email ELSE formal_review_raters.external_email END,
           external_title = CASE WHEN EXCLUDED.external_title <> '' THEN EXCLUDED.external_title ELSE formal_review_raters.external_title END,
           token = COALESCE(formal_review_raters.token, EXCLUDED.token),
           token_expires_at = COALESCE(formal_review_raters.token_expires_at, EXCLUDED.token_expires_at),
           updated_at = NOW()
     RETURNING id, token`,
    [
      reviewId,
      companyId,
      role,
      userId,
      candidateId,
      external?.name || '',
      external?.email || '',
      external?.title || '',
      token,
      expires,
    ]
  );
  return res.rows[0];
}

export async function openFormalReview(dbOrQuery, { companyId, reviewId, managerUserId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const mid = Number(managerUserId);
  if (!Number.isFinite(cid) || !Number.isFinite(rid)) return { ok: false, errorCode: ERR.INVALID_ID };

  const detail = await getFormalReviewDetail(db, { companyId: cid, reviewId: rid });
  if (!detail) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (detail.status !== FORMAL_REVIEW_STATUS.DRAFT) return { ok: false, errorCode: ERR.INVALID_STATUS };
  if (!detail.items?.length) return { ok: false, errorCode: ERR.INVALID_DATA };
  if (detail.model === FORMAL_REVIEW_MODEL.THREE_SIXTY) {
    const ext = (detail.raters || []).find((r) => r.role === FORMAL_RATER_ROLE.EXTERNAL);
    if (!ext?.externalName || !ext?.externalEmail) return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const managerId = Number.isFinite(mid) && mid > 0 ? mid : detail.managerUserId;
  if (!managerId) return { ok: false, errorCode: ERR.INVALID_DATA };

  await ensureRater(db, {
    reviewId: rid,
    companyId: cid,
    role: FORMAL_RATER_ROLE.MANAGER,
    userId: managerId,
    withToken: false,
  });

  if (detail.includeSelf) {
    await ensureRater(db, {
      reviewId: rid,
      companyId: cid,
      role: FORMAL_RATER_ROLE.SELF,
      candidateId: detail.subjectCandidateId,
      withToken: true,
    });
  }

  if (
    detail.model === FORMAL_REVIEW_MODEL.ONE_EIGHTY ||
    detail.model === FORMAL_REVIEW_MODEL.THREE_SIXTY
  ) {
    await ensureRater(db, {
      reviewId: rid,
      companyId: cid,
      role: FORMAL_RATER_ROLE.UPWARD,
      candidateId: detail.subjectCandidateId,
      withToken: true,
    });
  }

  if (detail.model === FORMAL_REVIEW_MODEL.THREE_SIXTY) {
    const ext = (detail.raters || []).find((r) => r.role === FORMAL_RATER_ROLE.EXTERNAL);
    await ensureRater(db, {
      reviewId: rid,
      companyId: cid,
      role: FORMAL_RATER_ROLE.EXTERNAL,
      withToken: true,
      external: {
        name: ext.externalName,
        email: ext.externalEmail,
        title: ext.externalTitle,
      },
    });
  }

  await db.query(
    `UPDATE formal_reviews
     SET status = '${FORMAL_REVIEW_STATUS.COLLECTING}',
         manager_user_id = $3,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [rid, cid, managerId]
  );
  await db.query(
    `UPDATE formal_review_cycles
     SET status = CASE WHEN status = '${FORMAL_REVIEW_CYCLE_STATUS.DRAFT}'
                       THEN '${FORMAL_REVIEW_CYCLE_STATUS.OPEN}' ELSE status END,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [detail.cycleId, cid]
  );

  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: rid }) };
}

export async function submitManagerRatings(dbOrQuery, {
  companyId,
  reviewId,
  managerUserId,
  scores = [],
  overallNotes = '',
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const detail = await getFormalReviewDetail(db, { companyId: cid, reviewId: rid });
  if (!detail) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (detail.status !== FORMAL_REVIEW_STATUS.COLLECTING) return { ok: false, errorCode: ERR.INVALID_STATUS };

  let rater = (detail.raters || []).find((r) => r.role === FORMAL_RATER_ROLE.MANAGER);
  if (!rater) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (rater.status === FORMAL_RATER_STATUS.SUBMITTED) return { ok: false, errorCode: ERR.ALREADY_SUBMITTED };

  const itemIds = new Set(detail.items.map((i) => String(i.id)));
  const clean = [];
  for (const row of scores || []) {
    const itemId = Number(row.itemId);
    const score = Number(row.score);
    if (!itemIds.has(String(itemId))) continue;
    if (!Number.isFinite(score) || score < FORMAL_LIKERT_MIN || score > FORMAL_LIKERT_MAX) {
      return { ok: false, errorCode: ERR.INVALID_ANSWER_VALUE };
    }
    clean.push({
      itemId,
      score,
      notes: String(row.notes || '').trim().slice(0, SCORE_NOTES_MAX),
    });
  }
  if (clean.length !== detail.items.length) return { ok: false, errorCode: ERR.INCOMPLETE_ANSWERS };

  for (const row of clean) {
    await db.query(
      `INSERT INTO formal_review_scores (rater_id, item_id, company_id, score, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rater_id, item_id) DO UPDATE
         SET score = EXCLUDED.score, notes = EXCLUDED.notes, updated_at = NOW()`,
      [rater.id, row.itemId, cid, row.score, row.notes]
    );
  }
  await db.query(
    `UPDATE formal_review_raters
     SET status = '${FORMAL_RATER_STATUS.SUBMITTED}',
         submitted_at = NOW(),
         user_id = COALESCE(user_id, $3),
         overall_notes = $4,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [rater.id, cid, managerUserId || null, String(overallNotes || '').trim().slice(0, NOTES_MAX)]
  );

  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: rid }) };
}

export async function finalizeFormalReview(dbOrQuery, { companyId, reviewId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const detail = await getFormalReviewDetail(db, { companyId: cid, reviewId: rid });
  if (!detail) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (detail.status !== FORMAL_REVIEW_STATUS.COLLECTING) return { ok: false, errorCode: ERR.INVALID_STATUS };

  const required = (detail.raters || []).filter((r) =>
    [FORMAL_RATER_ROLE.MANAGER, FORMAL_RATER_ROLE.UPWARD, FORMAL_RATER_ROLE.SELF, FORMAL_RATER_ROLE.EXTERNAL].includes(
      r.role
    )
  );
  const pending = required.filter((r) => r.status !== FORMAL_RATER_STATUS.SUBMITTED);
  if (pending.length) return { ok: false, errorCode: ERR.INCOMPLETE_ANSWERS };

  await db.query(
    `UPDATE formal_reviews
     SET status = '${FORMAL_REVIEW_STATUS.FINALIZED}', finalized_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [rid, cid]
  );
  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: rid }) };
}

export async function sendFormalReviewToSubject(dbOrQuery, { companyId, reviewId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const detail = await getFormalReviewDetail(db, { companyId: cid, reviewId: rid });
  if (!detail) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (detail.status !== FORMAL_REVIEW_STATUS.FINALIZED && detail.status !== FORMAL_REVIEW_STATUS.SENT) {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }
  await db.query(
    `UPDATE formal_reviews
     SET status = '${FORMAL_REVIEW_STATUS.SENT}',
         sent_at = COALESCE(sent_at, NOW()),
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [rid, cid]
  );
  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: rid }) };
}

export async function archiveFormalReview(dbOrQuery, { companyId, reviewId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  const detail = await getFormalReviewDetail(db, { companyId: cid, reviewId: rid });
  if (!detail) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (
    detail.status !== FORMAL_REVIEW_STATUS.FINALIZED &&
    detail.status !== FORMAL_REVIEW_STATUS.SENT &&
    detail.status !== FORMAL_REVIEW_STATUS.ARCHIVED
  ) {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }
  await db.query(
    `UPDATE formal_reviews
     SET status = '${FORMAL_REVIEW_STATUS.ARCHIVED}',
         archived_at = COALESCE(archived_at, NOW()),
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [rid, cid]
  );
  return { ok: true, review: await getFormalReviewDetail(db, { companyId: cid, reviewId: rid }) };
}

// ── Public token ────────────────────────────────────────────────────────────

export async function resolveFormalRaterByToken(dbOrQuery, token) {
  const db = asDb(dbOrQuery);
  const tok = String(token || '').trim();
  if (tok.length < 16) return { ok: false, errorCode: ERR.INVALID_TOKEN };

  const res = await db.query(
    `SELECT rr.id AS "raterId", rr.role, rr.status AS "raterStatus",
            rr.token_expires_at AS "tokenExpiresAt",
            rr.external_name AS "externalName", rr.external_title AS "externalTitle",
            r.id AS "reviewId", r.company_id AS "companyId", r.status AS "reviewStatus",
            r.subject_candidate_id AS "subjectCandidateId",
            c.full_name AS "subjectName",
            cy.title AS "cycleTitle", cy.model
     FROM formal_review_raters rr
     JOIN formal_reviews r ON r.id = rr.review_id AND r.company_id = rr.company_id
     JOIN formal_review_cycles cy ON cy.id = r.cycle_id
     JOIN candidates c ON c.id = r.subject_candidate_id AND c.company_id = r.company_id
     WHERE rr.token = $1
     LIMIT 1`,
    [tok]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.INVALID_TOKEN };
  const row = res.rows[0];
  if (row.role === FORMAL_RATER_ROLE.MANAGER) return { ok: false, errorCode: ERR.INVALID_TOKEN };
  if (row.reviewStatus !== FORMAL_REVIEW_STATUS.COLLECTING) {
    return { ok: false, errorCode: ERR.INVALID_STATUS };
  }
  if (row.raterStatus === FORMAL_RATER_STATUS.SUBMITTED) {
    return { ok: false, errorCode: ERR.ALREADY_SUBMITTED };
  }
  if (row.tokenExpiresAt && new Date(row.tokenExpiresAt).getTime() < Date.now()) {
    await db.query(
      `UPDATE formal_review_raters SET status = '${FORMAL_RATER_STATUS.EXPIRED}', updated_at = NOW()
       WHERE id = $1 AND status = '${FORMAL_RATER_STATUS.PENDING}'`,
      [row.raterId]
    );
    return { ok: false, errorCode: ERR.EXPIRED };
  }

  const items = await db.query(
    `SELECT id, label, sort_order AS "sortOrder"
     FROM formal_review_items WHERE review_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [row.reviewId]
  );

  return {
    ok: true,
    raterId: row.raterId,
    role: row.role,
    cycleTitle: row.cycleTitle,
    model: row.model,
    subjectName: row.subjectName,
    externalName: row.externalName || '',
    externalTitle: row.externalTitle || '',
    items: items.rows,
  };
}

export async function submitFormalRaterByToken(dbOrQuery, { token, scores = [], overallNotes = '' }) {
  const db = asDb(dbOrQuery);
  const resolved = await resolveFormalRaterByToken(db, token);
  if (!resolved.ok) return resolved;

  const itemIds = new Set(resolved.items.map((i) => String(i.id)));
  const clean = [];
  for (const row of scores || []) {
    const itemId = Number(row.itemId);
    const score = Number(row.score);
    if (!itemIds.has(String(itemId))) continue;
    if (!Number.isFinite(score) || score < FORMAL_LIKERT_MIN || score > FORMAL_LIKERT_MAX) {
      return { ok: false, errorCode: ERR.INVALID_ANSWER_VALUE };
    }
    clean.push({
      itemId,
      score,
      notes: String(row.notes || '').trim().slice(0, SCORE_NOTES_MAX),
    });
  }
  if (clean.length !== resolved.items.length) return { ok: false, errorCode: ERR.INCOMPLETE_ANSWERS };

  const meta = await db.query(
    `SELECT company_id AS "companyId" FROM formal_review_raters WHERE id = $1`,
    [resolved.raterId]
  );
  const companyId = meta.rows[0].companyId;

  for (const row of clean) {
    await db.query(
      `INSERT INTO formal_review_scores (rater_id, item_id, company_id, score, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rater_id, item_id) DO UPDATE
         SET score = EXCLUDED.score, notes = EXCLUDED.notes, updated_at = NOW()`,
      [resolved.raterId, row.itemId, companyId, row.score, row.notes]
    );
  }
  await db.query(
    `UPDATE formal_review_raters
     SET status = '${FORMAL_RATER_STATUS.SUBMITTED}',
         submitted_at = NOW(),
         overall_notes = $2,
         updated_at = NOW()
     WHERE id = $1 AND status = '${FORMAL_RATER_STATUS.PENDING}'`,
    [resolved.raterId, String(overallNotes || '').trim().slice(0, NOTES_MAX)]
  );
  return { ok: true };
}

export async function listSentFormalReviewsForEmployee(dbOrQuery, { companyId, candidateId, limit = 10 } = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const sid = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(sid)) return [];
  const cap = Math.min(Math.max(1, Number(limit) || 10), 20);
  const res = await db.query(
    `SELECT r.id, r.status, r.sent_at AS "sentAt",
            cy.title AS "cycleTitle", cy.model
     FROM formal_reviews r
     JOIN formal_review_cycles cy ON cy.id = r.cycle_id
     WHERE r.company_id = $1 AND r.subject_candidate_id = $2
       AND r.status = '${FORMAL_REVIEW_STATUS.SENT}'
     ORDER BY r.sent_at DESC NULLS LAST, r.id DESC
     LIMIT $3`,
    [cid, sid, cap]
  );
  return res.rows;
}

/** Subject view after RH sends results (no tokens / external e-mail). */
export async function getSentFormalReviewForEmployee(dbOrQuery, { companyId, candidateId, reviewId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const sid = Number(candidateId);
  const rid = Number(reviewId);
  if (!Number.isFinite(cid) || !Number.isFinite(sid) || !Number.isFinite(rid)) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  const detail = await getFormalReviewDetail(db, { companyId: cid, reviewId: rid });
  if (
    !detail ||
    Number(detail.subjectCandidateId) !== sid ||
    detail.status !== FORMAL_REVIEW_STATUS.SENT
  ) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }
  return {
    ok: true,
    review: {
      id: detail.id,
      cycleTitle: detail.cycleTitle,
      model: detail.model,
      includeSelf: detail.includeSelf,
      sentAt: detail.sentAt,
      items: detail.items,
      raters: (detail.raters || []).map((r) => ({
        id: r.id,
        role: r.role,
        status: r.status,
        submittedAt: r.submittedAt,
        overallNotes: r.overallNotes,
        externalTitle: r.externalTitle || '',
      })),
      scores: detail.scores,
    },
  };
}

export const FORMAL_REVIEW_CAPS = {
  LIST_CAP,
  ITEMS_CAP,
  TOKEN_TTL_DAYS,
  LIKERT_MIN: FORMAL_LIKERT_MIN,
  LIKERT_MAX: FORMAL_LIKERT_MAX,
};
