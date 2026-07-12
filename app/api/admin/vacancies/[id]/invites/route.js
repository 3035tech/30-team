import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { queryRead } from '../../../../../../lib/db';
import { apiError } from '../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const own = await queryRead(
      `SELECT v.id FROM vacancies v WHERE v.id = $1 AND v.deleted = FALSE ${!isAdmin ? 'AND v.company_id = $2' : ''} LIMIT 1`,
      !isAdmin ? [vacancyId, companyId] : [vacancyId]
    );
    if (own.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const list = await queryRead(
      `SELECT
         ci.id,
         ci.candidate_name AS "candidateName",
         ci.candidate_email AS "candidateEmail",
         ci.status,
         ci.sent_at AS "sentAt",
         ci.opened_at AS "openedAt",
         ci.completed_at AS "completedAt",
         ci.last_reminder_at AS "lastReminderAt",
         ci.reminder_count AS "reminderCount"
       FROM candidate_invites ci
       WHERE ci.vacancy_id = $1
       ORDER BY ci.sent_at DESC
       LIMIT 200`,
      [vacancyId]
    );

    return NextResponse.json({ invites: list.rows });
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}
