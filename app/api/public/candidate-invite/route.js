import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/public/candidate-invite?token=&vacancyToken= — identity for Enneagram email invites. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get('token') || '').trim();
    const vacancyToken = String(searchParams.get('vacancyToken') || '').trim();
    if (!token) return apiError(request, 'INVALID_TOKEN', 400);

    const res = await queryRead(
      `SELECT
         ci.id,
         ci.candidate_name AS "candidateName",
         ci.candidate_email AS "candidateEmail",
         ci.status,
         ci.vacancy_id AS "vacancyId",
         v.title AS "vacancyTitle",
         c.name AS "companyName"
       FROM candidate_invites ci
       JOIN vacancies v ON v.id = ci.vacancy_id
       JOIN companies c ON c.id = ci.company_id
       WHERE ci.token = $1
         AND v.deleted = FALSE
         AND c.deleted = FALSE
       LIMIT 1`,
      [token]
    );

    if (res.rowCount === 0) return apiError(request, 'INVITE_NOT_FOUND', 404);

    const row = res.rows[0];
    if (row.status === 'cancelled') return apiError(request, 'INVITE_CANCELLED', 403);
    if (row.status === 'completed') return apiError(request, 'INVITE_COMPLETED', 409);

    if (vacancyToken) {
      const vac = await queryRead(
        `SELECT v.id
         FROM vacancy_links l
         JOIN vacancies v ON v.id = l.vacancy_id
         WHERE l.token = $1
           AND l.active = TRUE
           AND l.expires_at > NOW()
           AND v.deleted = FALSE
         LIMIT 1`,
        [vacancyToken]
      );
      if (vac.rowCount === 0) return apiError(request, 'EXPIRED_LINK', 403);
      if (Number(vac.rows[0].id) !== Number(row.vacancyId)) {
        return apiError(request, 'INVITE_VACANCY_MISMATCH', 400);
      }
    }

    return NextResponse.json({
      ok: true,
      inviteId: row.id,
      candidateName: row.candidateName,
      candidateEmail: row.candidateEmail,
      status: row.status,
      vacancyTitle: row.vacancyTitle,
      companyName: row.companyName,
    });
  } catch (e) {
    console.error('GET /api/public/candidate-invite', e);
    return apiError(request, 'INTERNAL', 500);
  }
}
