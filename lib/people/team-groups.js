/**
 * Saved Groups (squads) — B-404.
 * Identity of members = assessment ids (same as GroupTab UI).
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';

const NAME_MAX = 120;
const MEMBERS_CAP = 40;
const LIST_CAP = 50;

function normalizeName(raw) {
  const name = String(raw || '').trim().slice(0, NAME_MAX);
  return name.length >= 1 ? name : null;
}

function normalizeIdList(raw, { excludeId = null, cap = MEMBERS_CAP } = {}) {
  const seen = new Set();
  const out = [];
  const exclude = excludeId != null ? String(excludeId) : null;
  for (const item of Array.isArray(raw) ? raw : []) {
    const n = Number(item);
    if (!Number.isFinite(n) || n <= 0) continue;
    const key = String(n);
    if (exclude && key === exclude) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Ensure assessments belong to company (tenant).
 * @returns {Promise<{ ok: true } | { ok: false, errorCode: string }>}
 */
export async function assertAssessmentsInCompany(dbOrQuery, { companyId, assessmentIds }) {
  const db = asDb(dbOrQuery);
  const ids = [...new Set((assessmentIds || []).map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) return { ok: true };
  const res = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM assessments
     WHERE company_id = $1 AND id = ANY($2::bigint[])`,
    [companyId, ids]
  );
  if (Number(res.rows[0]?.n) !== ids.length) {
    return { ok: false, errorCode: ERR.INVALID_ASSESSMENT };
  }
  return { ok: true };
}

/** Assessment ids in a saved group (base ∪ members). */
export function groupAssessmentIds(group) {
  if (!group) return [];
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const key = String(n);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };
  push(group.baseAssessmentId);
  for (const id of Array.isArray(group.memberAssessmentIds) ? group.memberAssessmentIds : []) {
    push(id);
  }
  return out;
}

export async function listTeamGroups(dbOrQuery, { companyId, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return [];
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT g.id, g.company_id AS "companyId", g.name,
            g.base_assessment_id AS "baseAssessmentId",
            g.member_assessment_ids AS "memberAssessmentIds",
            g.created_by_user_id AS "createdByUserId",
            g.created_at AS "createdAt", g.updated_at AS "updatedAt",
            u.email AS "createdByEmail"
     FROM team_groups g
     LEFT JOIN users u ON u.id = g.created_by_user_id
     WHERE g.company_id = $1 AND g.deleted = FALSE
     ORDER BY g.updated_at DESC, g.id DESC
     LIMIT $2`,
    [cid, cap]
  );
  return res.rows.map((row) => ({
    ...row,
    memberAssessmentIds: Array.isArray(row.memberAssessmentIds)
      ? row.memberAssessmentIds.map(Number)
      : [],
  }));
}

export async function getTeamGroup(dbOrQuery, { id, companyId = null, isAdmin = false }) {
  const db = asDb(dbOrQuery);
  const params = [id];
  let companyClause = '';
  const homeRaw = companyId != null && companyId !== '' ? Number(companyId) : NaN;
  const home = Number.isFinite(homeRaw) && homeRaw > 0 ? homeRaw : null;
  // Super-admin (isAdmin without home): no company clause. Everyone else must match tenant.
  if (!isAdmin || home != null) {
    if (home == null) return null;
    companyClause = 'AND g.company_id = $2';
    params.push(home);
  }
  const res = await db.query(
    `SELECT g.id, g.company_id AS "companyId", g.name,
            g.base_assessment_id AS "baseAssessmentId",
            g.member_assessment_ids AS "memberAssessmentIds",
            g.created_by_user_id AS "createdByUserId",
            g.created_at AS "createdAt", g.updated_at AS "updatedAt"
     FROM team_groups g
     WHERE g.id = $1 AND g.deleted = FALSE ${companyClause}
     LIMIT 1`,
    params
  );
  if (!res.rowCount) return null;
  const row = res.rows[0];
  return {
    ...row,
    memberAssessmentIds: Array.isArray(row.memberAssessmentIds)
      ? row.memberAssessmentIds.map(Number)
      : [],
  };
}

export async function createTeamGroup(dbOrQuery, {
  companyId,
  name,
  baseAssessmentId,
  memberAssessmentIds,
  createdByUserId,
}) {
  const db = asDb(dbOrQuery);
  const safeName = normalizeName(name);
  if (!safeName) return { ok: false, errorCode: ERR.NAME_REQUIRED };

  const baseId = Number(baseAssessmentId);
  if (!Number.isFinite(baseId) || baseId <= 0) {
    return { ok: false, errorCode: ERR.BASE_REQUIRED };
  }

  const members = normalizeIdList(memberAssessmentIds, { excludeId: baseId });
  const check = await assertAssessmentsInCompany(db, {
    companyId,
    assessmentIds: [baseId, ...members],
  });
  if (!check.ok) return check;

  const res = await db.query(
    `INSERT INTO team_groups (
       company_id, name, base_assessment_id, member_assessment_ids, created_by_user_id
     ) VALUES ($1, $2, $3, $4::bigint[], $5)
     RETURNING id, company_id AS "companyId", name,
               base_assessment_id AS "baseAssessmentId",
               member_assessment_ids AS "memberAssessmentIds",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [companyId, safeName, baseId, members, createdByUserId || null]
  );
  const row = res.rows[0];
  return {
    ok: true,
    item: {
      ...row,
      memberAssessmentIds: Array.isArray(row.memberAssessmentIds)
        ? row.memberAssessmentIds.map(Number)
        : [],
    },
  };
}

export async function updateTeamGroup(dbOrQuery, {
  id,
  companyId,
  isAdmin = false,
  name,
  baseAssessmentId,
  memberAssessmentIds,
}) {
  const existing = await getTeamGroup(dbOrQuery, { id, companyId, isAdmin });
  if (!existing) return { ok: false, errorCode: ERR.NOT_FOUND };

  const safeName = name != null ? normalizeName(name) : existing.name;
  if (!safeName) return { ok: false, errorCode: ERR.NAME_REQUIRED };

  const baseId =
    baseAssessmentId != null ? Number(baseAssessmentId) : Number(existing.baseAssessmentId);
  if (!Number.isFinite(baseId) || baseId <= 0) {
    return { ok: false, errorCode: ERR.BASE_REQUIRED };
  }

  const members =
    memberAssessmentIds != null
      ? normalizeIdList(memberAssessmentIds, { excludeId: baseId })
      : existing.memberAssessmentIds;

  const cid = Number(existing.companyId);
  const check = await assertAssessmentsInCompany(dbOrQuery, {
    companyId: cid,
    assessmentIds: [baseId, ...members],
  });
  if (!check.ok) return check;

  const db = asDb(dbOrQuery);
  const res = await db.query(
    `UPDATE team_groups SET
       name = $2,
       base_assessment_id = $3,
       member_assessment_ids = $4::bigint[],
       updated_at = NOW()
     WHERE id = $1 AND deleted = FALSE
     RETURNING id, company_id AS "companyId", name,
               base_assessment_id AS "baseAssessmentId",
               member_assessment_ids AS "memberAssessmentIds",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [id, safeName, baseId, members]
  );
  if (!res.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
  const row = res.rows[0];
  return {
    ok: true,
    item: {
      ...row,
      memberAssessmentIds: Array.isArray(row.memberAssessmentIds)
        ? row.memberAssessmentIds.map(Number)
        : [],
    },
  };
}

export async function softDeleteTeamGroup(dbOrQuery, { id, companyId, isAdmin = false }) {
  const existing = await getTeamGroup(dbOrQuery, { id, companyId, isAdmin });
  if (!existing) return { ok: false, errorCode: ERR.NOT_FOUND };
  const db = asDb(dbOrQuery);
  await db.query(
    `UPDATE team_groups SET deleted = TRUE, updated_at = NOW()
     WHERE id = $1 AND deleted = FALSE`,
    [id]
  );
  return { ok: true };
}
