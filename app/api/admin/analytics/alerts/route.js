/**
 * B-1104 — Analytics: API de alertas
 * GET /api/admin/analytics/alerts
 * B-1106: Rate limiting aplicado
 */

import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, CAP, requireCapability } from '../../../../../lib/ae/require-admin.js';
import { detectAllAlerts } from '../../../../../lib/analytics-alerts.js';
import { checkAnalyticsRateLimit, addRateLimitHeaders } from '../../../../../lib/analytics-rate-limit.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.OVERVIEW_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);
    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const rateLimitScope = { ...scope, companyId, userId: payload.userId };
    const rateLimitResponse = await checkAnalyticsRateLimit(request, rateLimitScope);
    if (rateLimitResponse) return rateLimitResponse;

    const alerts = await detectAllAlerts(companyId);

    const response = NextResponse.json({
      ok: true,
      alerts,
      count: alerts.length,
    });
    addRateLimitHeaders(response, rateLimitScope);
    return response;
  } catch (err) {
    console.error('[analytics/alerts GET]', err);
    return apiError(request, ERR.SERVER_ERROR, 500);
  }
}
