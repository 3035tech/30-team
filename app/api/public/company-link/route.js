import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  if (!token) return apiError(request, 'INVALID_TOKEN', 400);

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
    [token]
  );
  if (r.rowCount === 0) return apiError(request, 'EXPIRED_LINK', 404);

  return NextResponse.json(r.rows[0]);
}
