import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';

export async function listCompetencyCategories(dbOrQuery, { companyId, q = '', includeInactive = false, page = 1, pageSize = 20 }) {
  const db = asDb(dbOrQuery);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const offset = (Math.max(1, Number(page) || 1) - 1) * size;
  const params = [companyId, !!includeInactive, `%${String(q).trim().slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`];
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM competency_categories WHERE company_id = $1 AND ($2 OR active) AND name ILIKE $3`, params);
  const result = await db.query(
    `SELECT cat.id, cat.name, cat.name AS label, cat.active,
            cat.created_at AS "createdAt", cat.updated_at AS "updatedAt",
            (SELECT COUNT(*)::int FROM company_competencies c WHERE c.company_id = cat.company_id AND c.category_id = cat.id) AS "usageCount"
     FROM competency_categories cat WHERE cat.company_id = $1 AND ($2 OR cat.active) AND cat.name ILIKE $3
     ORDER BY lower(cat.name), cat.id LIMIT $4 OFFSET $5`, [...params, size, offset]
  );
  return { ok: true, items: result.rows, total: count.rows[0].total };
}

/** Caller supplies one transaction. Category locks serialize assignment/deactivation. */
export async function mutateCompetencyCategory(db, { companyId, id, name, active, remove = false }) {
  if (id) {
    const existing = await db.query('SELECT id FROM competency_categories WHERE company_id = $1 AND id = $2 FOR UPDATE', [companyId, id]);
    if (!existing.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
    if (remove) {
      const used = await db.query('SELECT 1 FROM company_competencies WHERE company_id = $1 AND category_id = $2 LIMIT 1', [companyId, id]);
      if (used.rowCount) return { ok: false, errorCode: ERR.COMPETENCY_CATEGORY_IN_USE };
      await db.query('DELETE FROM competency_categories WHERE company_id = $1 AND id = $2', [companyId, id]);
      return { ok: true, id };
    }
    const result = await db.query(
      `UPDATE competency_categories SET name = COALESCE($3, name), active = COALESCE($4, active), updated_at = NOW()
       WHERE company_id = $1 AND id = $2 RETURNING id, name, active`, [companyId, id, name ?? null, active ?? null]
    );
    return { ok: true, category: result.rows[0] };
  }
  const result = await db.query('INSERT INTO competency_categories (company_id, name) VALUES ($1, $2) RETURNING id, name, active', [companyId, name]);
  return { ok: true, category: result.rows[0] };
}

export async function validateCompetencyCategory(db, { companyId, categoryId, competencyId = null }) {
  if (categoryId == null) return null;
  const result = await db.query('SELECT id, active FROM competency_categories WHERE company_id = $1 AND id = $2 FOR SHARE', [companyId, categoryId]);
  if (!result.rowCount) return ERR.NOT_FOUND;
  if (result.rows[0].active) return null;
  // Keeping an existing inactive link is allowed; assigning it to another item is not.
  if (competencyId) {
    const current = await db.query('SELECT 1 FROM company_competencies WHERE company_id = $1 AND id = $2 AND category_id = $3', [companyId, competencyId, categoryId]);
    if (current.rowCount) return null;
  }
  return ERR.COMPETENCY_CATEGORY_INACTIVE;
}
