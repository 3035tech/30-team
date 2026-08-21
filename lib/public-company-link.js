/**
 * Resolve public company assessment link by token (shared by API + RSC pages).
 */

import { queryRead } from './db.js';

/**
 * @returns {{ ok: true, company: object } | { ok: false, errorCode: string }}
 */
export async function resolveCompanyLinkByToken(token) {
  const tokenValue = String(token || '').trim();
  if (!tokenValue) return { ok: false, errorCode: 'INVALID_TOKEN' };

  const r = await queryRead(
    `SELECT
       c.id AS "companyId",
       c.name,
       l.expires_at AS "expiresAt",
       COALESCE(l.require_candidate_email, FALSE) AS "requireCandidateEmail"
     FROM company_links l
     JOIN companies c ON c.id = l.company_id
     WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
       AND c.deleted = FALSE
     LIMIT 1`,
    [tokenValue]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: 'EXPIRED_LINK' };
  return { ok: true, company: r.rows[0] };
}
