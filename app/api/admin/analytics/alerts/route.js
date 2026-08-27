/**
 * B-1104 — Analytics: API de alertas
 * GET /api/admin/analytics/alerts
 * B-1106: Rate limiting aplicado
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { detectAllAlerts } from '../../../../../lib/analytics-alerts.js';
import { checkAnalyticsRateLimit, addRateLimitHeaders } from '../../../../../lib/analytics-rate-limit.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);
    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) return apiError(request, 'COMPANY_REQUIRED', 400);

    const rateLimitScope = { ...scope, companyId, userId: payload.userId };
    const rateLimitResponse = checkAnalyticsRateLimit(request, rateLimitScope);
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
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
