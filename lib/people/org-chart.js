/**
 * B-3006 — Organograma dinâmico (manager_candidate_id). Read-only tree; no DnD reorg.
 */

import { asDb } from '../ae/as-db.js';
import { query } from '../db.js';
import { ERR } from '../api-error-codes.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';

export const ORG_TREE_CAP = 200;
export const ORG_MANAGER_WALK_CAP = 40;

function mapNode(r) {
  return {
    id: Number(r.id),
    name: r.name || '',
    email: r.email || null,
    jobRoleId: r.jobRoleId != null ? Number(r.jobRoleId) : null,
    jobRoleName: r.jobRoleName || null,
    managerCandidateId: r.managerCandidateId != null ? Number(r.managerCandidateId) : null,
  };
}

/**
 * Detect if setting managerId as manager of candidateId would create a cycle.
 */
export async function wouldCreateManagerCycle(dbOrQuery, { companyId, candidateId, managerId }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  const selfId = Number(candidateId);
  const mid = Number(managerId);
  if (!Number.isFinite(cid) || !Number.isFinite(selfId) || !Number.isFinite(mid)) return true;
  if (selfId === mid) return true;

  let cursor = mid;
  const seen = new Set([selfId]);
  for (let i = 0; i < ORG_MANAGER_WALK_CAP; i += 1) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    const res = await db.query(
      `SELECT manager_candidate_id AS mid
       FROM candidates
       WHERE id = $1 AND company_id = $2
       LIMIT 1`,
      [cursor, cid]
    );
    if (!res.rowCount) return true;
    const next = res.rows[0].mid != null ? Number(res.rows[0].mid) : null;
    if (next == null || !Number.isFinite(next)) return false;
    cursor = next;
  }
  return true;
}

/**
 * Set or clear direct manager for an employee.
 */
export async function setCandidateManager(dbOrQuery, { companyId, candidateId, managerCandidateId }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  const selfId = Number(candidateId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  if (!Number.isFinite(selfId) || selfId <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  let mid = null;
  if (managerCandidateId != null && managerCandidateId !== '') {
    mid = Number(managerCandidateId);
    if (!Number.isFinite(mid) || mid <= 0) return { ok: false, errorCode: ERR.INVALID_DATA };
    if (mid === selfId) return { ok: false, errorCode: ERR.INVALID_DATA };

    const mgr = await db.query(
      `SELECT id FROM candidates
       WHERE id = $1 AND company_id = $2
         AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       LIMIT 1`,
      [mid, cid]
    );
    if (!mgr.rowCount) return { ok: false, errorCode: ERR.INVALID_DATA };

    const cycle = await wouldCreateManagerCycle(db, {
      companyId: cid,
      candidateId: selfId,
      managerId: mid,
    });
    if (cycle) return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  try {
    const res = await db.query(
      `UPDATE candidates
       SET manager_candidate_id = $1
       WHERE id = $2 AND company_id = $3
         AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       RETURNING id, manager_candidate_id AS "managerCandidateId"`,
      [mid, selfId, cid]
    );
    if (!res.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
    return {
      ok: true,
      candidateId: Number(res.rows[0].id),
      managerCandidateId:
        res.rows[0].managerCandidateId != null
          ? Number(res.rows[0].managerCandidateId)
          : null,
    };
  } catch (err) {
    if (err?.code === '42703') return { ok: false, errorCode: ERR.SCHEMA_NOT_INITIALIZED };
    throw err;
  }
}

export async function getCandidateManager(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  const selfId = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(selfId)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  try {
    const res = await db.query(
      `SELECT c.manager_candidate_id AS "managerCandidateId",
              m.full_name AS "managerName",
              m.id AS "managerId"
       FROM candidates c
       LEFT JOIN candidates m
         ON m.id = c.manager_candidate_id AND m.company_id = c.company_id
       WHERE c.id = $1 AND c.company_id = $2
       LIMIT 1`,
      [selfId, cid]
    );
    if (!res.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
    const row = res.rows[0];
    return {
      ok: true,
      managerCandidateId:
        row.managerCandidateId != null ? Number(row.managerCandidateId) : null,
      managerName: row.managerName || null,
      managerId: row.managerId != null ? Number(row.managerId) : null,
    };
  } catch (err) {
    if (err?.code === '42703') {
      return { ok: true, managerCandidateId: null, managerName: null, managerId: null };
    }
    throw err;
  }
}

/**
 * Build forest of employees. Roots = null manager or manager outside set / cycle-broken.
 */
export async function listOrgChart(dbOrQuery, { companyId, limit = ORG_TREE_CAP }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  const cap = Math.min(ORG_TREE_CAP, Math.max(1, Number(limit) || ORG_TREE_CAP));

  try {
    const res = await db.query(
      `SELECT c.id, c.full_name AS name, c.email,
              c.job_role_id AS "jobRoleId",
              jr.name AS "jobRoleName",
              c.manager_candidate_id AS "managerCandidateId"
       FROM candidates c
       LEFT JOIN job_roles jr
         ON jr.id = c.job_role_id AND jr.company_id = c.company_id AND jr.active = TRUE
       WHERE c.company_id = $1
         AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       ORDER BY c.full_name ASC
       LIMIT $2`,
      [cid, cap]
    );
    const people = res.rows.map(mapNode);
    const byId = new Map(people.map((p) => [p.id, { ...p, children: [] }]));
    const roots = [];
    let linked = 0;
    for (const p of byId.values()) {
      const mid = p.managerCandidateId;
      if (mid != null && byId.has(mid) && mid !== p.id) {
        byId.get(mid).children.push(p);
        linked += 1;
      } else {
        roots.push(p);
      }
    }
    const sortRec = (nodes) => {
      nodes.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt'));
      for (const n of nodes) sortRec(n.children);
    };
    sortRec(roots);

    return {
      ok: true,
      roots,
      total: people.length,
      withManager: linked,
      capped: people.length >= cap,
      incomplete: people.length > 0 && linked === 0,
    };
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return {
        ok: true,
        roots: [],
        total: 0,
        withManager: 0,
        capped: false,
        incomplete: true,
      };
    }
    throw err;
  }
}
