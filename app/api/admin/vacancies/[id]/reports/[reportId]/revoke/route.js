import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../../../../lib/auth';
import { revokeReportShare } from '../../../../../../../../lib/vacancy-report';
import { apiError } from '../../../../../../../../lib/api-error';
import { CAP, isAdminRole, requireCapability } from '../../../../../../../../lib/permissions';


export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = await verifySessionWithCapabilities(session);
    if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = isAdminRole(payload);
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
