/**
 * Search active employees (candidates.employment_status = employee) by name.
 * Used by exit form and other pickers — tenant-scoped, capped.
 */

import { asDb } from '../ae/as-db.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';

const SEARCH_CAP = 20;
const Q_MIN = 1;
const Q_MAX = 80;

/**
 * @returns {Promise<{ id: number, label: string, email: string|null }[]>}
 */
export async function searchCompanyEmployees(dbOrQuery, { companyId, q = '', limit = SEARCH_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || SEARCH_CAP), SEARCH_CAP);
  const needle = String(q || '').trim().slice(0, Q_MAX);
  if (needle.length < Q_MIN) return [];

  const res = await db.query(
    `SELECT c.id,
            c.full_name AS label,
            c.email
     FROM candidates c
     WHERE c.company_id = $1
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       AND (
         c.full_name ILIKE $2
         OR COALESCE(c.email, '') ILIKE $2
       )
     ORDER BY c.full_name ASC
     LIMIT $3`,
    [companyId, `%${needle}%`, cap]
  );

  return res.rows.map((r) => ({
    id: r.id,
    label: r.label,
    email: r.email || null,
  }));
}

export const EMPLOYEE_SEARCH_CAPS = { SEARCH_CAP, Q_MIN, Q_MAX };
