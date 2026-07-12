import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, localeFromRequest } from '../../../../lib/api-error';
import { t } from '../../../../lib/i18n';

function normalizeEmail(email) {
  const e = (email || '').trim();
  return e.length ? e.toLowerCase() : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  const email = normalizeEmail(searchParams.get('email'));
  if (!token) return apiError(request, 'INVALID_TOKEN', 400);

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
    [token]
  );
  if (r.rowCount === 0) return apiError(request, 'EXPIRED_LINK', 404);

  const vacancy = r.rows[0];

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
      const locale = localeFromRequest(request);
      return NextResponse.json(
        {
          errorCode: 'DUPLICATE_VACANCY_SUBMISSION',
          error: t(locale, 'errors.DUPLICATE_VACANCY_SUBMISSION'),
          alreadySubmitted: true,
        },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({ ...vacancy, alreadySubmitted: false });
}
