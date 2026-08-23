/**
 * Nucleus = time interno da empresa com Eneagrama (para fit vs vaga — B-403).
 */

import { asDb } from '../ae/as-db.js';

const NUCLEUS_CAP = 24;

/**
 * Último top_type por pessoa do roster interno (link /t ou employee/alumni).
 * @returns {Promise<Array<{ id: number, name: string, topType: number }>>}
 */
export async function loadCompanyInternalNucleus(dbOrQuery, { companyId, limit = NUCLEUS_CAP }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return [];

  const cap = Math.min(Math.max(1, Number(limit) || NUCLEUS_CAP), 40);
  const res = await db.query(
    `SELECT DISTINCT ON (c.id)
       c.id AS id,
       c.full_name AS name,
       ass.top_type AS "topType"
     FROM assessments ass
     JOIN candidates c ON c.id = ass.candidate_id
     WHERE ass.company_id = $1
       AND ass.top_type BETWEEN 1 AND 9
       AND (
         ass.vacancy_id IS NULL
         OR c.employment_status IN ('employee', 'alumni')
       )
     ORDER BY c.id, ass.created_at DESC NULLS LAST, ass.id DESC
     LIMIT $2`,
    [cid, cap]
  );
  return (res.rows || []).map((r) => ({
    id: r.id,
    name: r.name || '',
    topType: Number(r.topType),
  }));
}
