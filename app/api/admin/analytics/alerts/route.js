/**
 * B-1104 — Analytics: API de alertas
 * GET /api/admin/analytics/alerts
 * B-1106: Rate limiting aplicado
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error.js';
import { getManagerScope } from '@/lib/ae/require-admin.js';
import { detectAllAlerts } from '@/lib/analytics-alerts.js';
import { checkAnalyticsRateLimit, addRateLimitHeaders } from '@/lib/analytics-rate-limit.js';

export async function GET(request) {
  try {
    const scope = await getManagerScope(request, { allowDirection: true, allowHr: true });
    if (!scope) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const rateLimitResponse = checkAnalyticsRateLimit(request, scope);
    if (rateLimitResponse) return rateLimitResponse;

    const alerts = await detectAllAlerts(scope.companyId);

    const response = NextResponse.json({
      ok: true,
      alerts,
      count: alerts.length,
    });
    addRateLimitHeaders(response, scope);
    return response;
  } catch (err) {
    console.error('[analytics/alerts GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
