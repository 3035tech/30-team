/**
 * PDI — development plans per candidate (company_id + candidate_id).
 */

import { asDb } from '../ae/as-db.js';

const TITLE_MAX = 200;
const OBJECTIVE_MAX = 4000;
const ITEM_TITLE_MAX = 300;
const ITEM_NOTES_MAX = 4000;
const LIST_CAP = 40;
const ITEMS_CAP = 30;

const PLAN_STATUSES = new Set(['draft', 'active', 'completed', 'archived']);
const ITEM_STATUSES = new Set(['todo', 'doing', 'done']);
const ITEM_SOURCES = new Set(['manual', 'synthesis']);

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

async function assertCandidateInCompany(db, { companyId, candidateId }) {
  const res = await db.query(
    `SELECT id, company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND' };
  if (String(res.rows[0].companyId) !== String(companyId)) {
    return { ok: false, errorCode: 'UNAUTHORIZED' };
  }
  return { ok: true, candidate: res.rows[0] };
}

export async function listDevelopmentPlans(dbOrQuery, { companyId, candidateId, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT p.id, p.company_id AS "companyId", p.candidate_id AS "candidateId",
            p.title, p.objective, p.status,
            p.period_start AS "periodStart", p.period_end AS "periodEnd",
            p.created_by_user_id AS "createdByUserId",
            p.created_at AS "createdAt", p.updated_at AS "updatedAt",
            (SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id) AS "itemCount",
            (SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id AND i.status = 'done') AS "doneCount"
     FROM development_plans p
     WHERE p.company_id = $1 AND p.candidate_id = $2
     ORDER BY p.updated_at DESC, p.id DESC
     LIMIT $3`,
    [companyId, candidateId, cap]
  );
  return res.rows;
}

export async function getDevelopmentPlan(dbOrQuery, { companyId, planId, candidateId = null }) {
  const db = asDb(dbOrQuery);
  const params = [planId, companyId];
  let candClause = '';
  if (candidateId != null) {
    candClause = 'AND p.candidate_id = $3';
    params.push(candidateId);
  }
  const res = await db.query(
    `SELECT p.id, p.company_id AS "companyId", p.candidate_id AS "candidateId",
            p.title, p.objective, p.status,
            p.period_start AS "periodStart", p.period_end AS "periodEnd",
            p.created_by_user_id AS "createdByUserId",
            p.created_at AS "createdAt", p.updated_at AS "updatedAt"
     FROM development_plans p
     WHERE p.id = $1 AND p.company_id = $2 ${candClause}
     LIMIT 1`,
    params
  );
  if (res.rowCount === 0) return null;
  const plan = res.rows[0];
  const items = await db.query(
    `SELECT i.id, i.plan_id AS "planId", i.company_id AS "companyId",
            i.title, i.notes, i.status, i.source, i.sort_order AS "sortOrder",
            i.due_date AS "dueDate",
            i.created_at AS "createdAt", i.updated_at AS "updatedAt"
     FROM development_plan_items i
     WHERE i.plan_id = $1 AND i.company_id = $2
     ORDER BY i.sort_order ASC, i.id ASC
     LIMIT $3`,
    [plan.id, companyId, ITEMS_CAP]
  );
  return { ...plan, items: items.rows };
}

/**
 * @param {string[]} [seedIdeas] — optional synthesis strings → items source=synthesis
 */
export async function createDevelopmentPlan(dbOrQuery, {
  companyId,
  candidateId,
  title,
  objective = '',
  status = 'draft',
  periodStart = null,
  periodEnd = null,
  createdByUserId = null,
  seedIdeas = null,
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertCandidateInCompany(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;

  const safeTitle = normalizeTitle(title);
  if (!safeTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  const safeObjective = String(objective || '').trim().slice(0, OBJECTIVE_MAX);
  const safeStatus = normalizeStatus(status, PLAN_STATUSES, 'draft');

  const res = await db.query(
    `INSERT INTO development_plans (
       company_id, candidate_id, title, objective, status,
       period_start, period_end, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8)
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               title, objective, status,
               period_start AS "periodStart", period_end AS "periodEnd",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      companyId,
      candidateId,
      safeTitle,
      safeObjective,
      safeStatus,
      dateOrNull(periodStart),
      dateOrNull(periodEnd),
      createdByUserId || null,
    ]
  );
  const plan = res.rows[0];
  const ideas = Array.isArray(seedIdeas)
    ? seedIdeas.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 4)
    : [];
  const items = [];
  for (let i = 0; i < ideas.length; i += 1) {
    const item = await insertPlanItem(db, {
      planId: plan.id,
      companyId,
      title: ideas[i].slice(0, ITEM_TITLE_MAX),
      notes: '',
      status: 'todo',
      source: 'synthesis',
      sortOrder: i,
    });
    if (item.ok) items.push(item.item);
  }
  return { ok: true, plan: { ...plan, items } };
}

export async function updateDevelopmentPlan(dbOrQuery, {
  companyId,
  planId,
  candidateId = null,
  title,
  objective,
  status,
  periodStart,
  periodEnd,
}) {
  const db = asDb(dbOrQuery);
  const existing = await getDevelopmentPlan(db, { companyId, planId, candidateId });
  if (!existing) return { ok: false, errorCode: 'NOT_FOUND' };

  const nextTitle = title !== undefined ? normalizeTitle(title) : existing.title;
  if (!nextTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  const nextObjective =
    objective !== undefined
      ? String(objective || '').trim().slice(0, OBJECTIVE_MAX)
      : existing.objective;
  const nextStatus =
    status !== undefined
      ? normalizeStatus(status, PLAN_STATUSES, existing.status)
      : existing.status;
  const nextStart =
    periodStart !== undefined ? dateOrNull(periodStart) : existing.periodStart;
  const nextEnd = periodEnd !== undefined ? dateOrNull(periodEnd) : existing.periodEnd;

  const res = await db.query(
    `UPDATE development_plans
     SET title = $3, objective = $4, status = $5,
         period_start = $6::date, period_end = $7::date, updated_at = NOW()
     WHERE id = $1 AND company_id = $2
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               title, objective, status,
               period_start AS "periodStart", period_end AS "periodEnd",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [planId, companyId, nextTitle, nextObjective, nextStatus, nextStart, nextEnd]
  );
  return { ok: true, plan: { ...res.rows[0], items: existing.items } };
}

async function insertPlanItem(db, {
  planId,
  companyId,
  title,
  notes = '',
  status = 'todo',
  source = 'manual',
  sortOrder = 0,
  dueDate = null,
}) {
  const safeTitle = normalizeTitle(title, ITEM_TITLE_MAX);
  if (!safeTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  const res = await db.query(
    `INSERT INTO development_plan_items (
       plan_id, company_id, title, notes, status, source, sort_order, due_date
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date)
     RETURNING id, plan_id AS "planId", company_id AS "companyId",
               title, notes, status, source, sort_order AS "sortOrder",
               due_date AS "dueDate",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      planId,
      companyId,
      safeTitle,
      String(notes || '').trim().slice(0, ITEM_NOTES_MAX),
      normalizeStatus(status, ITEM_STATUSES, 'todo'),
      ITEM_SOURCES.has(String(source)) ? String(source) : 'manual',
      Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      dateOrNull(dueDate),
    ]
  );
  return { ok: true, item: res.rows[0] };
}

export async function addDevelopmentPlanItem(dbOrQuery, {
  companyId,
  planId,
  candidateId = null,
  title,
  notes,
  status,
  source,
  sortOrder,
  dueDate,
}) {
  const db = asDb(dbOrQuery);
  const plan = await getDevelopmentPlan(db, { companyId, planId, candidateId });
  if (!plan) return { ok: false, errorCode: 'NOT_FOUND' };
  if (plan.items.length >= ITEMS_CAP) return { ok: false, errorCode: 'ITEMS_CAP' };
  return insertPlanItem(db, {
    planId,
    companyId,
    title,
    notes,
    status,
    source,
    sortOrder: sortOrder ?? plan.items.length,
    dueDate,
  });
}

export async function updateDevelopmentPlanItem(dbOrQuery, {
  companyId,
  planId,
  itemId,
  title,
  notes,
  status,
  dueDate,
}) {
  const db = asDb(dbOrQuery);
  const owned = await db.query(
    `SELECT i.id FROM development_plan_items i
     JOIN development_plans p ON p.id = i.plan_id
     WHERE i.id = $1 AND i.plan_id = $2 AND i.company_id = $3 AND p.company_id = $3
     LIMIT 1`,
    [itemId, planId, companyId]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND' };

  const cur = await db.query(
    `SELECT title, notes, status, due_date AS "dueDate" FROM development_plan_items WHERE id = $1`,
    [itemId]
  );
  const row = cur.rows[0];
  const nextTitle = title !== undefined ? normalizeTitle(title, ITEM_TITLE_MAX) : row.title;
  if (!nextTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  const nextNotes =
    notes !== undefined ? String(notes || '').trim().slice(0, ITEM_NOTES_MAX) : row.notes;
  const nextStatus =
    status !== undefined ? normalizeStatus(status, ITEM_STATUSES, row.status) : row.status;
  const nextDue = dueDate !== undefined ? dateOrNull(dueDate) : row.dueDate;

  const res = await db.query(
    `UPDATE development_plan_items
     SET title = $2, notes = $3, status = $4, due_date = $5::date, updated_at = NOW()
     WHERE id = $1
     RETURNING id, plan_id AS "planId", company_id AS "companyId",
               title, notes, status, source, sort_order AS "sortOrder",
               due_date AS "dueDate",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [itemId, nextTitle, nextNotes, nextStatus, nextDue]
  );
  return { ok: true, item: res.rows[0] };
}

export const DEVELOPMENT_PLAN_CAPS = { LIST_CAP, ITEMS_CAP, PLAN_STATUSES, ITEM_STATUSES };
