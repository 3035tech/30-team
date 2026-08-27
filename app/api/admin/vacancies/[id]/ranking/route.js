import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../lib/api-error.js';
import {
  CAP,
  getSessionPayload,
  getManagerScope,
  requireCapability,
} from '../../../../../../lib/ae/require-admin.js';
import { getVacancyRanking } from '../../../../../../lib/vacancy-ranking.js';

/** GET /api/admin/vacancies/[id]/ranking — fit ranking for vacancy pipeline. */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.VACANCIES_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const url = new URL(request.url);
    const qLocale = url.searchParams.get('locale');
    const locale = qLocale === 'en' || qLocale === 'pt-BR' ? qLocale : 'pt-BR';

    const result = await getVacancyRanking({
      vacancyId,
      companyId: scope.companyId,
      isAdmin: scope.isAdmin,
      locale,
    });
    if (!result.ok) {
      const status = result.errorCode === 'NOT_FOUND' ? 404 : 400;
      return apiError(request, result.errorCode || 'INVALID_DATA', status);
    }

    return NextResponse.json({
      vacancyId: result.vacancyId,
      ranking: result.ranking,
      nucleusSize: result.nucleusSize,
    });
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}
