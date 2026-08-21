import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/public/candidate-invite?token=&vacancyToken= — identity + HR profile for Enneagram email invites. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get('token') || '').trim();
    const vacancyToken = String(searchParams.get('vacancyToken') || '').trim();
    if (!token) return apiError(request, 'INVALID_TOKEN', 400);

    const res = await queryRead(
      `SELECT
         ci.id,
         ci.company_id AS "companyId",
         ci.candidate_id AS "candidateId",
         ci.candidate_name AS "candidateName",
         ci.candidate_email AS "candidateEmail",
         ci.status,
         ci.vacancy_id AS "vacancyId",
         v.title AS "vacancyTitle",
         co.name AS "companyName",
         cand.phone,
         cand.linkedin_url AS "linkedinUrl",
         cand.city,
         cand.state
       FROM candidate_invites ci
       JOIN vacancies v ON v.id = ci.vacancy_id
       JOIN companies co ON co.id = ci.company_id
       LEFT JOIN candidates cand ON cand.id = ci.candidate_id
       WHERE ci.token = $1
         AND v.deleted = FALSE
         AND co.deleted = FALSE
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

    let phone = row.phone || null;
    let linkedinUrl = row.linkedinUrl || null;
    let city = row.city || null;
    let state = row.state || null;

    // Fallback when invite has no candidate_id: same company + email
    if (!row.candidateId && row.candidateEmail && row.companyId) {
      const byEmail = await queryRead(
        `SELECT phone, linkedin_url AS "linkedinUrl", city, state
         FROM candidates
         WHERE company_id = $1
           AND LOWER(TRIM(email)) = LOWER(TRIM($2))
         LIMIT 1`,
        [row.companyId, row.candidateEmail]
      );
      if (byEmail.rowCount > 0) {
        phone = byEmail.rows[0].phone || null;
        linkedinUrl = byEmail.rows[0].linkedinUrl || null;
        city = byEmail.rows[0].city || null;
        state = byEmail.rows[0].state || null;
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
      phone: phone || '',
      linkedinUrl: linkedinUrl || '',
      city: city || '',
      state: state || '',
    });
  } catch (e) {
    console.error('GET /api/public/candidate-invite', e);
    return apiError(request, 'INTERNAL', 500);
  }
}
