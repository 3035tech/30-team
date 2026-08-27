/**
 * Resolve public vacancy assessment link by token (shared by API + RSC pages).
 */

import { query } from './db.js';
import { ERR } from './api-error-codes';

function normalizeEmail(email) {
  const e = (email || '').trim();
  return e.length ? e.toLowerCase() : null;
}

/**
 * @param {string} token
 * @param {{ email?: string|null }} [opts]
 * @returns {Promise<
 *   | { ok: true, vacancy: object }
 *   | { ok: false, errorCode: string, status?: number, alreadySubmitted?: boolean }
 * >}
 */
export async function resolveVacancyLinkByToken(token, opts = {}) {
  const tokenValue = String(token || '').trim();
  if (!tokenValue) return { ok: false, errorCode: ERR.INVALID_TOKEN };

  const r = await query(
    `SELECT
       v.id AS "vacancyId",
       v.title,
       v.status,
       v.company_id AS "companyId",
       l.expires_at AS "expiresAt",
       COALESCE(l.require_candidate_email, FALSE) AS "requireCandidateEmail"
     FROM vacancy_links l
     JOIN vacancies v ON v.id = l.vacancy_id
     JOIN companies c ON c.id = v.company_id
     WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
       AND v.deleted = FALSE AND c.deleted = FALSE
     LIMIT 1`,
    [tokenValue]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.EXPIRED_LINK };

  const vacancy = r.rows[0];
  const email = normalizeEmail(opts.email);

  if (email) {
    const existing = await query(
      `SELECT 1
       FROM assessments a
       JOIN candidates c ON c.id = a.candidate_id
       WHERE a.vacancy_id = $1
         AND c.company_id = $2
         AND LOWER(c.email) = LOWER($3)
       LIMIT 1`,
      [vacancy.vacancyId, vacancy.companyId, email]
    );
    if (existing.rowCount > 0) {
      return {
        ok: false,
        errorCode: ERR.DUPLICATE_VACANCY_SUBMISSION,
        status: 409,
        alreadySubmitted: true,
      };
    }
  }

  return { ok: true, vacancy: { ...vacancy, alreadySubmitted: false } };
}
