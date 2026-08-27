/**
 * Company Benefits — catálogo de benefícios para contexto de retenção/oferta (B-1009, Epic B-1000).
 * Sem adesão, sem desconto em folha, sem "clube" — apenas lista informativa.
 */

import { asDb } from './ae/as-db.js';

const NAME_MAX = 200;
const DESC_MAX = 2000;
const CATEGORY_MAX = 100;
const LIST_CAP = 100;

const BENEFIT_TYPES = new Set([
  'health', 'dental', 'vision', 'life_insurance', 'retirement',
  'vacation', 'flexible_hours', 'remote_work', 'gym', 'meal_voucher',
  'transport_voucher', 'education', 'daycare', 'other',
]);

function normalizeType(raw, fallback = 'other') {
  const t = String(raw || '').trim().toLowerCase();
  return BENEFIT_TYPES.has(t) ? t : fallback;
}

// ========================================
// COMPANY BENEFITS CRUD
// ========================================

/**
 * List company benefits.
 */
export async function listCompanyBenefits(dbOrQuery, { companyId, includeInactive = false, category = null, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);

  let where = 'company_id = $1';
  const params = [companyId];
  let paramIndex = 2;

  if (!includeInactive) {
    where += ' AND active = TRUE';
  }

  if (category) {
    where += ` AND category = $${paramIndex}`;
    params.push(String(category).trim());
    paramIndex++;
  }

  const res = await db.query(
    `SELECT id, name, description, category, benefit_type AS "benefitType", active,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM company_benefits
     WHERE ${where}
     ORDER BY active DESC, updated_at DESC, id DESC
     LIMIT $${paramIndex}`,
    [...params, cap]
  );

  return res.rows;
}

/**
 * Get a single benefit.
 */
export async function getCompanyBenefit(dbOrQuery, { companyId, benefitId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT id, name, description, category, benefit_type AS "benefitType", active,
            created_by_user_id AS "createdByUserId",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM company_benefits
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [benefitId, companyId]
  );
  if (res.rowCount === 0) return null;
  return res.rows[0];
}

/**
 * Create a company benefit.
 */
export async function createCompanyBenefit(dbOrQuery, {
  companyId,
  name,
  description = '',
  category = null,
  benefitType = 'other',
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery);

  const safeName = String(name || '').trim().slice(0, NAME_MAX);
  if (safeName.length === 0) {
    return { ok: false, errorCode: 'NAME_REQUIRED' };
  }

  const safeDesc = String(description || '').trim().slice(0, DESC_MAX);
  const safeCategory = category ? String(category).trim().slice(0, CATEGORY_MAX) : null;
  const safeType = normalizeType(benefitType, 'other');

  const res = await db.query(
    `INSERT INTO company_benefits (
       company_id, name, description, category, benefit_type, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, category, benefit_type AS "benefitType", active,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [companyId, safeName, safeDesc, safeCategory, safeType, createdByUserId || null]
  );

  return { ok: true, benefit: res.rows[0] };
}

/**
 * Update a company benefit.
 */
export async function updateCompanyBenefit(dbOrQuery, {
  companyId,
  benefitId,
  name,
  description,
  category,
  benefitType,
  active,
}) {
  const db = asDb(dbOrQuery);

  const existing = await getCompanyBenefit(db, { companyId, benefitId });
  if (!existing) return { ok: false, errorCode: 'NOT_FOUND' };

  const nextName = name !== undefined ? String(name || '').trim().slice(0, NAME_MAX) : existing.name;
  if (nextName.length === 0) {
    return { ok: false, errorCode: 'NAME_REQUIRED' };
  }

  const nextDesc = description !== undefined ? String(description || '').trim().slice(0, DESC_MAX) : existing.description;
  const nextCategory = category !== undefined ? (category ? String(category).trim().slice(0, CATEGORY_MAX) : null) : existing.category;
  const nextType = benefitType !== undefined ? normalizeType(benefitType, existing.benefitType) : existing.benefitType;
  const nextActive = active !== undefined ? !!active : existing.active;

  const res = await db.query(
    `UPDATE company_benefits
     SET name = $2, description = $3, category = $4, benefit_type = $5, active = $6, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, description, category, benefit_type AS "benefitType", active,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [benefitId, nextName, nextDesc, nextCategory, nextType, nextActive]
  );

  return { ok: true, benefit: res.rows[0] };
}

/**
 * Deactivate (soft delete) a company benefit.
 */
export async function deactivateCompanyBenefit(dbOrQuery, { companyId, benefitId }) {
  const db = asDb(dbOrQuery);
  const existing = await getCompanyBenefit(db, { companyId, benefitId });
  if (!existing) return { ok: false, errorCode: 'NOT_FOUND' };

  await db.query(
    `UPDATE company_benefits SET active = FALSE, updated_at = NOW() WHERE id = $1`,
    [benefitId]
  );

  return { ok: true };
}

/**
 * Get categories used in a company (for filtering).
 */
export async function getCompanyBenefitCategories(dbOrQuery, { companyId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT DISTINCT category
     FROM company_benefits
     WHERE company_id = $1 AND active = TRUE AND category IS NOT NULL
     ORDER BY category ASC`,
    [companyId]
  );
  return res.rows.map((r) => r.category);
}

export const COMPANY_BENEFITS_CAPS = {
  LIST_CAP,
  BENEFIT_TYPES,
};
