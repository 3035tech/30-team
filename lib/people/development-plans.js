/**
 * PDI — development plans per candidate (company_id + candidate_id).
 */

import { asDb } from '../ae/as-db.js';
import { parseActionLinesFromRichText } from './pdi-action-lines.js';

const TITLE_MAX = 200;
const OBJECTIVE_MAX = 4000;
const ITEM_TITLE_MAX = 300;
const ITEM_NOTES_MAX = 4000;
const OWNER_LABEL_MAX = 120;
const LIST_CAP = 40;
const ITEMS_CAP = 30;

const PLAN_STATUSES = new Set(['draft', 'active', 'completed', 'archived']);
const ITEM_STATUSES = new Set(['todo', 'doing', 'done']);
const ITEM_SOURCES = new Set(['manual', 'synthesis', 'one_on_one', 'retention', 'onboarding']);

function normalizeOwnerLabel(raw) {
  return String(raw || '')
    .trim()
    .slice(0, OWNER_LABEL_MAX);
}

/** ISO date today (UTC date part). */
function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

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
            i.due_date AS "dueDate", i.one_on_one_id AS "oneOnOneId",
            i.owner_label AS "ownerLabel",
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
  oneOnOneId = null,
  ownerLabel = '',
}) {
  const safeTitle = normalizeTitle(title, ITEM_TITLE_MAX);
  if (!safeTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  let ooId = null;
  if (oneOnOneId != null && oneOnOneId !== '') {
    const n = Number(oneOnOneId);
    if (Number.isFinite(n) && n > 0) {
      const oo = await db.query(
        `SELECT o.id FROM one_on_ones o
         JOIN development_plans p ON p.id = $1
         WHERE o.id = $2 AND o.company_id = $3 AND o.candidate_id = p.candidate_id
         LIMIT 1`,
        [planId, n, companyId]
      );
      if (oo.rowCount === 0) return { ok: false, errorCode: 'INVALID_ONE_ON_ONE' };
      ooId = n;
    }
  }
  const res = await db.query(
    `INSERT INTO development_plan_items (
       plan_id, company_id, title, notes, status, source, sort_order, due_date, one_on_one_id, owner_label
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10)
     RETURNING id, plan_id AS "planId", company_id AS "companyId",
               title, notes, status, source, sort_order AS "sortOrder",
               due_date AS "dueDate", one_on_one_id AS "oneOnOneId",
               owner_label AS "ownerLabel",
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
      ooId,
      normalizeOwnerLabel(ownerLabel),
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
  oneOnOneId,
  ownerLabel,
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
    oneOnOneId,
    ownerLabel,
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
  oneOnOneId,
  ownerLabel,
}) {
  const db = asDb(dbOrQuery);
  const owned = await db.query(
    `SELECT i.id, p.candidate_id AS "candidateId"
     FROM development_plan_items i
     JOIN development_plans p ON p.id = i.plan_id
     WHERE i.id = $1 AND i.plan_id = $2 AND i.company_id = $3 AND p.company_id = $3
     LIMIT 1`,
    [itemId, planId, companyId]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND' };

  const cur = await db.query(
    `SELECT title, notes, status, due_date AS "dueDate", one_on_one_id AS "oneOnOneId",
            owner_label AS "ownerLabel"
     FROM development_plan_items WHERE id = $1`,
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
  const nextOwner =
    ownerLabel !== undefined ? normalizeOwnerLabel(ownerLabel) : row.ownerLabel || '';

  let nextOo = row.oneOnOneId;
  if (oneOnOneId !== undefined) {
    if (oneOnOneId == null || oneOnOneId === '') {
      nextOo = null;
    } else {
      const n = Number(oneOnOneId);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, errorCode: 'INVALID_ONE_ON_ONE' };
      const oo = await db.query(
        `SELECT id FROM one_on_ones
         WHERE id = $1 AND company_id = $2 AND candidate_id = $3
         LIMIT 1`,
        [n, companyId, owned.rows[0].candidateId]
      );
      if (oo.rowCount === 0) return { ok: false, errorCode: 'INVALID_ONE_ON_ONE' };
      nextOo = n;
    }
  }

  const res = await db.query(
    `UPDATE development_plan_items
     SET title = $2, notes = $3, status = $4, due_date = $5::date,
         one_on_one_id = $6, owner_label = $7, updated_at = NOW()
     WHERE id = $1
     RETURNING id, plan_id AS "planId", company_id AS "companyId",
               title, notes, status, source, sort_order AS "sortOrder",
               due_date AS "dueDate", one_on_one_id AS "oneOnOneId",
               owner_label AS "ownerLabel",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [itemId, nextTitle, nextNotes, nextStatus, nextDue, nextOo, nextOwner]
  );
  return { ok: true, item: res.rows[0] };
}

/**
 * Convert 1:1 next_steps into PDI items (active plan or new cycle plan).
 */
export async function importItemsFromOneOnOne(dbOrQuery, {
  companyId,
  candidateId,
  oneOnOneId,
  planId = null,
  createdByUserId = null,
  periodDays = 90,
  ownerLabel = '',
}) {
  const db = asDb(dbOrQuery);
  const scoped = await assertCandidateInCompany(db, { companyId, candidateId });
  if (!scoped.ok) return scoped;

  const ooId = Number(oneOnOneId);
  if (!Number.isFinite(ooId) || ooId <= 0) return { ok: false, errorCode: 'INVALID_ONE_ON_ONE' };

  const oo = await db.query(
    `SELECT id, next_steps AS "nextSteps", meeting_date AS "meetingDate"
     FROM one_on_ones
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [ooId, companyId, candidateId]
  );
  if (oo.rowCount === 0) return { ok: false, errorCode: 'INVALID_ONE_ON_ONE' };

  const lines = parseActionLinesFromRichText(oo.rows[0].nextSteps);
  if (lines.length === 0) return { ok: false, errorCode: 'NO_NEXT_STEPS' };

  let plan = null;
  if (planId != null && planId !== '') {
    plan = await getDevelopmentPlan(db, { companyId, planId, candidateId });
    if (!plan) return { ok: false, errorCode: 'NOT_FOUND' };
  } else {
    const active = await db.query(
      `SELECT id FROM development_plans
       WHERE company_id = $1 AND candidate_id = $2 AND status = 'active'
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [companyId, candidateId]
    );
    if (active.rowCount > 0) {
      plan = await getDevelopmentPlan(db, {
        companyId,
        planId: active.rows[0].id,
        candidateId,
      });
    }
  }

  if (!plan) {
    const meetRaw = oo.rows[0].meetingDate;
    const meet =
      meetRaw instanceof Date
        ? meetRaw.toISOString().slice(0, 10)
        : dateOrNull(meetRaw) || todayIsoDate();
    const days = Math.min(Math.max(14, Number(periodDays) || 90), 365);
    const end = new Date(`${meet}T12:00:00.000Z`);
    if (Number.isNaN(end.getTime())) {
      return { ok: false, errorCode: 'INVALID_DATA' };
    }
    end.setUTCDate(end.getUTCDate() + days);
    const created = await createDevelopmentPlan(db, {
      companyId,
      candidateId,
      title: `PDI · ${meet}`,
      objective: '',
      status: 'active',
      periodStart: meet,
      periodEnd: end.toISOString().slice(0, 10),
      createdByUserId,
    });
    if (!created.ok) return created;
    plan = created.plan;
  }

  const room = ITEMS_CAP - (plan.items?.length || 0);
  if (room <= 0) return { ok: false, errorCode: 'ITEMS_CAP' };

  const added = [];
  const baseOrder = plan.items?.length || 0;
  for (let i = 0; i < Math.min(lines.length, room); i += 1) {
    const item = await insertPlanItem(db, {
      planId: plan.id,
      companyId,
      title: lines[i],
      notes: '',
      status: 'todo',
      source: 'one_on_one',
      sortOrder: baseOrder + i,
      oneOnOneId: ooId,
      ownerLabel,
    });
    if (item.ok) added.push(item.item);
  }

  const refreshed = await getDevelopmentPlan(db, {
    companyId,
    planId: plan.id,
    candidateId,
  });
  return {
    ok: true,
    plan: refreshed,
    addedCount: added.length,
    linesParsed: lines.length,
  };
}

const PULSE_QUEUE_CAP = 8;
const PULSE_ACTIVE_PLANS_CAP = 12;

/**
 * Company pulse for Overview — active plans + item progress + work queue
 * (overdue, unlinked to 1:1, employees without active plan). Tenant-scoped.
 * Returns null if schema missing.
 */
export async function getCompanyPdiPulse(
  dbOrQuery,
  { companyId, queueLimit = PULSE_QUEUE_CAP, activePlansLimit = PULSE_ACTIVE_PLANS_CAP } = {}
) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return null;
  const cap = Math.min(Math.max(1, Number(queueLimit) || PULSE_QUEUE_CAP), PULSE_QUEUE_CAP);
  const plansCap = Math.min(
    Math.max(1, Number(activePlansLimit) || PULSE_ACTIVE_PLANS_CAP),
    PULSE_ACTIVE_PLANS_CAP
  );
  try {
    const [totalsRes, overdueRes, unlinkedRes, noPlanRes, activePlansRes] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE p.status = 'active')::int AS "activePlans",
           COUNT(DISTINCT p.candidate_id) FILTER (WHERE p.status = 'active')::int AS "peopleWithActive",
           (
             SELECT COUNT(*)::int
             FROM development_plan_items i
             JOIN development_plans p2 ON p2.id = i.plan_id
             WHERE p2.company_id = $1 AND p2.status = 'active'
           ) AS "activeItems",
           (
             SELECT COUNT(*)::int
             FROM development_plan_items i
             JOIN development_plans p2 ON p2.id = i.plan_id
             WHERE p2.company_id = $1 AND p2.status = 'active' AND i.status = 'done'
           ) AS "doneItems",
           (
             SELECT COUNT(*)::int
             FROM development_plan_items i
             JOIN development_plans p2 ON p2.id = i.plan_id
             WHERE p2.company_id = $1 AND p2.status = 'active'
               AND i.one_on_one_id IS NULL AND i.status <> 'done'
           ) AS "itemsWithoutOneOnOne",
           (
             SELECT COUNT(*)::int
             FROM development_plan_items i
             JOIN development_plans p2 ON p2.id = i.plan_id
             WHERE p2.company_id = $1 AND p2.status = 'active'
               AND i.status <> 'done'
               AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
           ) AS "overdueItemCount",
           (
             SELECT COUNT(*)::int
             FROM development_plans p3
             WHERE p3.company_id = $1 AND p3.status = 'active'
               AND p3.period_end IS NOT NULL AND p3.period_end < CURRENT_DATE
           ) AS "overduePlanCount",
           (
             SELECT COUNT(*)::int
             FROM candidates c
             WHERE c.company_id = $1
               AND c.employment_status = 'employee'
               AND NOT EXISTS (
                 SELECT 1 FROM development_plans p4
                 WHERE p4.candidate_id = c.id
                   AND p4.company_id = c.company_id
                   AND p4.status = 'active'
               )
           ) AS "noPlanEmployeeCount"
         FROM development_plans p
         WHERE p.company_id = $1`,
        [cid]
      ),
      db.query(
        `SELECT
           i.id AS "itemId",
           i.title AS "itemTitle",
           i.due_date AS "dueDate",
           p.id AS "planId",
           p.title AS "planTitle",
           c.id AS "candidateId",
           c.full_name AS "candidateName"
         FROM development_plan_items i
         JOIN development_plans p ON p.id = i.plan_id
         JOIN candidates c ON c.id = p.candidate_id AND c.company_id = p.company_id
         WHERE p.company_id = $1
           AND p.status = 'active'
           AND i.status <> 'done'
           AND i.due_date IS NOT NULL
           AND i.due_date < CURRENT_DATE
         ORDER BY i.due_date ASC, i.id ASC
         LIMIT $2`,
        [cid, cap]
      ),
      db.query(
        `SELECT
           i.id AS "itemId",
           i.title AS "itemTitle",
           p.id AS "planId",
           c.id AS "candidateId",
           c.full_name AS "candidateName"
         FROM development_plan_items i
         JOIN development_plans p ON p.id = i.plan_id
         JOIN candidates c ON c.id = p.candidate_id AND c.company_id = p.company_id
         WHERE p.company_id = $1
           AND p.status = 'active'
           AND i.status <> 'done'
           AND i.one_on_one_id IS NULL
         ORDER BY i.updated_at DESC, i.id DESC
         LIMIT $2`,
        [cid, cap]
      ),
      db.query(
        `SELECT
           c.id AS "candidateId",
           c.full_name AS "candidateName"
         FROM candidates c
         WHERE c.company_id = $1
           AND c.employment_status = 'employee'
           AND NOT EXISTS (
             SELECT 1 FROM development_plans p
             WHERE p.candidate_id = c.id
               AND p.company_id = c.company_id
               AND p.status = 'active'
           )
         ORDER BY c.full_name ASC NULLS LAST, c.id ASC
         LIMIT $2`,
        [cid, cap]
      ),
      db.query(
        `SELECT
           p.id AS "planId",
           p.title AS "planTitle",
           p.period_start AS "periodStart",
           p.period_end AS "periodEnd",
           p.updated_at AS "updatedAt",
           c.id AS "candidateId",
           c.full_name AS "candidateName",
           COALESCE(ic.item_count, 0)::int AS "itemCount",
           COALESCE(ic.done_count, 0)::int AS "doneCount",
           COALESCE(ic.overdue_count, 0)::int AS "overdueItemCount",
           (p.period_end IS NOT NULL AND p.period_end < CURRENT_DATE) AS "periodOverdue"
         FROM development_plans p
         JOIN candidates c ON c.id = p.candidate_id AND c.company_id = p.company_id
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*)::int AS item_count,
             COUNT(*) FILTER (WHERE i.status = 'done')::int AS done_count,
             COUNT(*) FILTER (
               WHERE i.status <> 'done'
                 AND i.due_date IS NOT NULL
                 AND i.due_date < CURRENT_DATE
             )::int AS overdue_count
           FROM development_plan_items i
           WHERE i.plan_id = p.id
         ) ic ON TRUE
         WHERE p.company_id = $1
           AND p.status = 'active'
         ORDER BY
           (p.period_end IS NOT NULL AND p.period_end < CURRENT_DATE) DESC,
           COALESCE(ic.overdue_count, 0) DESC,
           CASE
             WHEN COALESCE(ic.item_count, 0) = 0 THEN 0
             ELSE (COALESCE(ic.done_count, 0)::float / ic.item_count)
           END ASC,
           p.updated_at DESC,
           p.id DESC
         LIMIT $2`,
        [cid, plansCap]
      ),
    ]);

    const row = totalsRes.rows[0] || {};
    const activeItems = Number(row.activeItems) || 0;
    const doneItems = Number(row.doneItems) || 0;
    const mapPerson = (r) => ({
      candidateId: Number(r.candidateId),
      candidateName: String(r.candidateName || '').trim() || '—',
      nav: {
        tab: 'team',
        candidate: String(r.candidateId),
        ...(r.candidateName ? { search: String(r.candidateName).trim() } : {}),
      },
    });

    const plans = (activePlansRes.rows || []).map((r) => {
      const itemCount = Number(r.itemCount) || 0;
      const doneCount = Number(r.doneCount) || 0;
      return {
        ...mapPerson(r),
        planId: Number(r.planId),
        planTitle: String(r.planTitle || '').trim() || '—',
        periodStart: r.periodStart ? String(r.periodStart).slice(0, 10) : null,
        periodEnd: r.periodEnd ? String(r.periodEnd).slice(0, 10) : null,
        itemCount,
        doneCount,
        donePct: itemCount > 0 ? Math.round((doneCount / itemCount) * 100) : null,
        overdueItemCount: Number(r.overdueItemCount) || 0,
        periodOverdue: Boolean(r.periodOverdue),
      };
    });

    return {
      activePlans: Number(row.activePlans) || 0,
      peopleWithActive: Number(row.peopleWithActive) || 0,
      activeItems,
      doneItems,
      donePct: activeItems > 0 ? Math.round((doneItems / activeItems) * 100) : null,
      itemsWithoutOneOnOne: Number(row.itemsWithoutOneOnOne) || 0,
      overdueItemCount: Number(row.overdueItemCount) || 0,
      overduePlanCount: Number(row.overduePlanCount) || 0,
      noPlanEmployeeCount: Number(row.noPlanEmployeeCount) || 0,
      queueCap: cap,
      activePlansCap: plansCap,
      plans,
      queue: {
        overdue: (overdueRes.rows || []).map((r) => ({
          ...mapPerson(r),
          kind: 'item',
          itemId: Number(r.itemId),
          itemTitle: String(r.itemTitle || '').trim(),
          planId: Number(r.planId),
          dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
        })),
        unlinked: (unlinkedRes.rows || []).map((r) => ({
          ...mapPerson(r),
          kind: 'item',
          itemId: Number(r.itemId),
          itemTitle: String(r.itemTitle || '').trim(),
          planId: Number(r.planId),
        })),
        noPlan: (noPlanRes.rows || []).map((r) => mapPerson(r)),
      },
    };
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return null;
    throw err;
  }
}

export const DEVELOPMENT_PLAN_CAPS = {
  LIST_CAP,
  ITEMS_CAP,
  PLAN_STATUSES,
  ITEM_STATUSES,
  ITEM_SOURCES,
  PULSE_QUEUE_CAP,
  PULSE_ACTIVE_PLANS_CAP,
};
