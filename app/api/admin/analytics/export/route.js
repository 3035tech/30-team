/**
 * B-1105 — Analytics: API de export
 * GET /api/admin/analytics/export
 * B-1106: Rate limiting aplicado
 * 
 * Query params:
 * - format: 'json' | 'csv'
 * - type: 'metrics' | 'trends'
 * - (outros filtros conforme type)
 */

import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { getHiringEffectivenessMetrics } from '../../../../../lib/analytics-metrics.js';
import { getAllTrends } from '../../../../../lib/analytics-trends.js';
import {
  exportMetricsToJSON,
  exportMetricsToCSV,
  exportTrendsToJSON,
} from '../../../../../lib/analytics-export.js';
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
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'metrics';

    if (type === 'metrics') {
      const startDate = searchParams.get('startDate') || null;
      const endDate = searchParams.get('endDate') || null;
      const vacancyId = searchParams.get('vacancyId') || null;

      const metrics = await getHiringEffectivenessMetrics(companyId, {
        startDate,
        endDate,
        vacancyId: vacancyId ? parseInt(vacancyId) : null,
      });

      if (format === 'json') {
        const json = exportMetricsToJSON(metrics, { startDate, endDate, vacancyId });
        const response = new NextResponse(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="metrics-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
        addRateLimitHeaders(response, rateLimitScope);
        return response;
      } else if (format === 'csv') {
        const csv = exportMetricsToCSV(metrics);
        const response = new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="metrics-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
        addRateLimitHeaders(response, rateLimitScope);
        return response;
      }
    }

    if (type === 'trends') {
      const months = parseInt(searchParams.get('months') || '12', 10);
      const trends = await getAllTrends(companyId, { months });

      if (format === 'json') {
        const json = exportTrendsToJSON(trends);
        const response = new NextResponse(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="trends-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
        addRateLimitHeaders(response, rateLimitScope);
        return response;
      }
    }

    return apiError(request, ERR.INVALID_FORMAT, 400);
  } catch (err) {
    console.error('[analytics/export GET]', err);
    return apiError(request, ERR.SERVER_ERROR, 500);
  }
}
