import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../../../lib/auth';
import { revokeReportShare } from '../../../../../../../../lib/vacancy-report';
import { apiError } from '../../../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    const reportId = params?.reportId;
    if (!vacancyId || !reportId) return apiError(request, 'INCOMPLETE_DATA', 400);

    const ok = await revokeReportShare(vacancyId, reportId, { isAdmin, companyId });
    if (!ok) return apiError(request, 'NOT_FOUND', 404);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[vacancy-report revoke]', e);
    return apiError(request, 'INTERNAL', 500);
  }
}
