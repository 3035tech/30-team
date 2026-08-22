import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../../lib/auth';
import { verifySessionWithCapabilities } from '../../../../../../lib/user-capabilities';
import { apiError } from '../../../../../../lib/api-error';
import { CAP, isAdminRole, requireCapability } from '../../../../../../lib/permissions';
import { getVacancyFunnelAnalytics } from '../../../../../../lib/job-funnel';

/**
 * GET /api/admin/vacancies/[id]/analytics
 */
export async function GET(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_VIEW)) {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const vacancyId = Number(params?.id);
  if (!Number.isFinite(vacancyId) || vacancyId <= 0) {
    return apiError(request, 'INVALID_VACANCY', 400);
  }

  const stats = await getVacancyFunnelAnalytics({
    vacancyId,
    companyId,
    isAdmin,
  });
  if (!stats.ok) {
    return apiError(request, stats.errorCode || 'NOT_FOUND', stats.errorCode === 'UNAUTHORIZED' ? 401 : 404);
  }

  return NextResponse.json({
    vacancyId: stats.vacancyId,
    title: stats.title,
    views: stats.views,
    applyStarts: stats.applyStarts,
    applications: stats.applications,
    interviews: stats.interviews,
    hires: stats.hires,
    conversionRate: stats.conversionRate,
    sources: stats.sources,
    byType: stats.byType,
  });
}
