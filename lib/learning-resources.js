/**
 * Learning Resources — catálogo leve de ações/trilhas (B-1008, Epic B-1000).
 * Sem LMS, sem player, sem SCORM. PDI pode apontar para recursos.
 */

import { asDb } from './ae/as-db.js';

const TITLE_MAX = 300;
const DESC_MAX = 2000;
const THEME_MAX = 100;
const LIST_CAP = 100;

const RESOURCE_TYPES = new Set(['course', 'article', 'video', 'book', 'workshop', 'mentoring', 'other']);

function normalizeType(raw, fallback = 'course') {
  const t = String(raw || '').trim().toLowerCase();
  return RESOURCE_TYPES.has(t) ? t : fallback;
}

// ========================================
// LEARNING RESOURCES CRUD
// ========================================

/**
 * List learning resources for a company.
 */
export async function listLearningResources(dbOrQuery, { companyId, includeInactive = false, theme = null, resourceType = null, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);

  let where = 'company_id = $1';
  const params = [companyId];
  let paramIndex = 2;

  if (!includeInactive) {
    where += ' AND active = TRUE';
  }

  if (theme) {
    where += ` AND theme = $${paramIndex}`;
    params.push(String(theme).trim());
    paramIndex++;
  }

  if (resourceType && RESOURCE_TYPES.has(String(resourceType).toLowerCase())) {
    where += ` AND resource_type = $${paramIndex}`;
    params.push(String(resourceType).toLowerCase());
    paramIndex++;
  }

  const res = await db.query(
    `SELECT id, title, description, theme, resource_type AS "resourceType",
            url, duration_hours AS "durationHours", active,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM learning_resources
     WHERE ${where}
     ORDER BY active DESC, updated_at DESC, id DESC
     LIMIT $${paramIndex}`,
    [...params, cap]
  );

  return res.rows;
}

/**
 * Get a single learning resource.
 */
export async function getLearningResource(dbOrQuery, { companyId, resourceId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT id, title, description, theme, resource_type AS "resourceType",
            url, duration_hours AS "durationHours", active,
            created_by_user_id AS "createdByUserId",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM learning_resources
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [resourceId, companyId]
  );
  if (res.rowCount === 0) return null;
  return res.rows[0];
}

/**
 * Create a learning resource.
 */
export async function createLearningResource(dbOrQuery, {
  companyId,
  title,
  description = '',
  theme = null,
  resourceType = 'course',
  url = null,
  durationHours = null,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);

  const safeTitle = String(title || '').trim().slice(0, TITLE_MAX);
  if (safeTitle.length === 0) {
    return { ok: false, errorCode: 'TITLE_REQUIRED' };
  }

  const safeDesc = String(description || '').trim().slice(0, DESC_MAX);
  const safeTheme = theme ? String(theme).trim().slice(0, THEME_MAX) : null;
  const safeType = normalizeType(resourceType, 'course');
  const safeUrl = url ? String(url).trim() : null;
  const safeDuration = durationHours && Number(durationHours) > 0 ? Math.min(Math.max(1, Number(durationHours)), 1000) : null;

  const res = await db.query(
    `INSERT INTO learning_resources (
       company_id, title, description, theme, resource_type, url, duration_hours, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, title, description, theme, resource_type AS "resourceType",
               url, duration_hours AS "durationHours", active,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [companyId, safeTitle, safeDesc, safeTheme, safeType, safeUrl, safeDuration, createdByUserId || null]
  );

  return { ok: true, resource: res.rows[0] };
}

/**
 * Update a learning resource.
 */
export async function updateLearningResource(dbOrQuery, {
  companyId,
  resourceId,
  title,
  description,
  theme,
  resourceType,
  url,
  durationHours,
  active,
}) {
  const db = asDb(dbOrQuery);

  const existing = await getLearningResource(db, { companyId, resourceId });
  if (!existing) return { ok: false, errorCode: 'NOT_FOUND' };

  const nextTitle = title !== undefined ? String(title || '').trim().slice(0, TITLE_MAX) : existing.title;
  if (nextTitle.length === 0) {
    return { ok: false, errorCode: 'TITLE_REQUIRED' };
  }

  const nextDesc = description !== undefined ? String(description || '').trim().slice(0, DESC_MAX) : existing.description;
  const nextTheme = theme !== undefined ? (theme ? String(theme).trim().slice(0, THEME_MAX) : null) : existing.theme;
  const nextType = resourceType !== undefined ? normalizeType(resourceType, existing.resourceType) : existing.resourceType;
  const nextUrl = url !== undefined ? (url ? String(url).trim() : null) : existing.url;
  const nextDuration = durationHours !== undefined
    ? (durationHours && Number(durationHours) > 0 ? Math.min(Math.max(1, Number(durationHours)), 1000) : null)
    : existing.durationHours;
  const nextActive = active !== undefined ? !!active : existing.active;

  const res = await db.query(
    `UPDATE learning_resources
     SET title = $2, description = $3, theme = $4, resource_type = $5,
         url = $6, duration_hours = $7, active = $8, updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, theme, resource_type AS "resourceType",
               url, duration_hours AS "durationHours", active,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [resourceId, nextTitle, nextDesc, nextTheme, nextType, nextUrl, nextDuration, nextActive]
  );

  return { ok: true, resource: res.rows[0] };
}

/**
 * Deactivate (soft delete) a learning resource.
 */
export async function deactivateLearningResource(dbOrQuery, { companyId, resourceId }) {
  const db = asDb(dbOrQuery);
  const existing = await getLearningResource(db, { companyId, resourceId });
  if (!existing) return { ok: false, errorCode: 'NOT_FOUND' };

  await db.query(
    `UPDATE learning_resources SET active = FALSE, updated_at = NOW() WHERE id = $1`,
    [resourceId]
  );

  return { ok: true };
}

/**
 * Get themes used in a company (for filtering).
 */
export async function getCompanyLearningThemes(dbOrQuery, { companyId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT DISTINCT theme
     FROM learning_resources
     WHERE company_id = $1 AND active = TRUE AND theme IS NOT NULL
     ORDER BY theme ASC`,
    [companyId]
  );
  return res.rows.map((r) => r.theme);
}

// ========================================
// PDI RESOURCE LINKS (optional)
// ========================================

/**
 * Link a learning resource to a PDI item.
 */
export async function linkResourceToPdi(dbOrQuery, { planItemId, resourceId }) {
  const db = asDb(dbOrQuery);
  try {
    await db.query(
      `INSERT INTO development_plan_resource_links (plan_item_id, resource_id)
       VALUES ($1, $2)
       ON CONFLICT (plan_item_id, resource_id) DO NOTHING`,
      [planItemId, resourceId]
    );
    return { ok: true };
  } catch (err) {
    if (err?.code === '23503') return { ok: false, errorCode: 'INVALID_REFERENCE' };
    throw err;
  }
}

/**
 * Unlink a learning resource from a PDI item.
 */
export async function unlinkResourceFromPdi(dbOrQuery, { planItemId, resourceId }) {
  const db = asDb(dbOrQuery);
  await db.query(
    `DELETE FROM development_plan_resource_links WHERE plan_item_id = $1 AND resource_id = $2`,
    [planItemId, resourceId]
  );
  return { ok: true };
}

/**
 * Get learning resources linked to a PDI item.
 */
export async function getPdiLinkedResources(dbOrQuery, { planItemId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT lr.id, lr.title, lr.description, lr.theme, lr.resource_type AS "resourceType",
            lr.url, lr.duration_hours AS "durationHours"
     FROM development_plan_resource_links dprl
     JOIN learning_resources lr ON lr.id = dprl.resource_id
     WHERE dprl.plan_item_id = $1 AND lr.active = TRUE
     ORDER BY dprl.created_at ASC`,
    [planItemId]
  );
  return res.rows;
}

export const LEARNING_RESOURCE_CAPS = {
  LIST_CAP,
  RESOURCE_TYPES,
};
