import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { apiError, localeFromRequest } from '../../../../lib/api-error';
import { t } from '../../../../lib/i18n';

/** GET /api/public/ae-invite?token= — valida convite de motivadores. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get('token') || '').trim();
    if (!token) {
      return apiError(request, 'INVALID_TOKEN', 400);
    }

    const res = await queryRead(
      `SELECT i.id, i.candidate_name AS "candidateName", i.candidate_email AS "candidateEmail",
              i.status, i.expires_at AS "expiresAt",
              d.slug AS "definitionSlug", d.name AS "definitionName",
              c.name AS "companyName"
       FROM ae_invites i
       JOIN ae_definitions d ON d.id = i.definition_id
       JOIN companies c ON c.id = i.company_id
       WHERE i.token = $1 AND c.deleted = FALSE AND d.active = TRUE
       LIMIT 1`,
      [token]
    );

    if (res.rowCount === 0) {
      return apiError(request, 'INVITE_NOT_FOUND', 404);
    }

    const row = res.rows[0];
    if (new Date(row.expiresAt) < new Date()) {
      return apiError(request, 'INVITE_EXPIRED', 403);
    }
    if (row.status === 'cancelled') {
      return apiError(request, 'INVITE_CANCELLED', 403);
    }
    if (row.status === 'completed') {
      const locale = localeFromRequest(request);
      return NextResponse.json(
        {
          errorCode: 'INVITE_COMPLETED',
          error: t(locale, 'errors.INVITE_COMPLETED'),
          completed: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      inviteId: row.id,
      candidateName: row.candidateName,
      candidateEmail: row.candidateEmail,
      status: row.status,
      definitionSlug: row.definitionSlug,
      definitionName: row.definitionName,
      companyName: row.companyName,
      expiresAt: row.expiresAt,
    });
  } catch (err) {
    console.error('GET /api/public/ae-invite', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
