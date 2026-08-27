/**
 * B-1101 — Analytics: API de métricas de efetividade
 * GET /api/admin/analytics/metrics
 * B-1106: Rate limiting aplicado
 */

import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { getHiringEffectivenessMetrics } from '../../../../../lib/analytics-metrics.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { checkAnalyticsRateLimit, addRateLimitHeaders } from '../../../../../lib/analytics-rate-limit.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);
    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const rateLimitScope = { ...scope, companyId, userId: payload.userId };
    const rateLimitResponse = checkAnalyticsRateLimit(request, rateLimitScope);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || null;
    const endDate = searchParams.get('endDate') || null;
    const vacancyId = searchParams.get('vacancyId') || null;

    const metrics = await getHiringEffectivenessMetrics(companyId, {
      startDate,
      endDate,
      vacancyId: vacancyId ? parseInt(vacancyId) : null,
    });

    const response = NextResponse.json({
      ok: true,
      metrics,
      filters: { startDate, endDate, vacancyId },
    });
    addRateLimitHeaders(response, rateLimitScope);
    return response;
  } catch (err) {
    console.error('[analytics/metrics GET]', err);
    return apiError(request, ERR.SERVER_ERROR, 500);
  }
}
