/**
 * B-1102 — Analytics: API de tendências temporais
 * GET /api/admin/analytics/trends
 * B-1106: Rate limiting aplicado
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error.js';
import { getManagerScope } from '@/lib/ae/require-admin.js';
import { getAllTrends } from '@/lib/analytics-trends.js';
import { checkAnalyticsRateLimit, addRateLimitHeaders } from '@/lib/analytics-rate-limit.js';

export async function GET(request) {
  try {
    const scope = await getManagerScope(request, { allowDirection: true, allowHr: true });
    if (!scope) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const rateLimitResponse = checkAnalyticsRateLimit(request, scope);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12', 10);

    if (months < 1 || months > 24) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    const trends = await getAllTrends(scope.companyId, { months });

    const response = NextResponse.json({
      ok: true,
      trends,
      filters: { months },
    });
    addRateLimitHeaders(response, scope);
    return response;
  } catch (err) {
    console.error('[analytics/trends GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
