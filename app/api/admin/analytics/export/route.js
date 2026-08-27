/**
 * B-1105 — Analytics: API de export
 * GET /api/admin/analytics/export
 * 
 * Query params:
 * - format: 'json' | 'csv'
 * - type: 'metrics' | 'trends'
 * - (outros filtros conforme type)
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error.js';
import { getManagerScope } from '@/lib/ae/require-admin.js';
import { getHiringEffectivenessMetrics } from '@/lib/analytics-metrics.js';
import { getAllTrends } from '@/lib/analytics-trends.js';
import {
  exportMetricsToJSON,
  exportMetricsToCSV,
  exportTrendsToJSON,
} from '@/lib/analytics-export.js';

export async function GET(request) {
  try {
    const scope = await getManagerScope(request, { allowDirection: true, allowHr: true });
    if (!scope) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'metrics';

    if (type === 'metrics') {
      const startDate = searchParams.get('startDate') || null;
      const endDate = searchParams.get('endDate') || null;
      const vacancyId = searchParams.get('vacancyId') || null;

      const metrics = await getHiringEffectivenessMetrics(scope.companyId, {
        startDate,
        endDate,
        vacancyId: vacancyId ? parseInt(vacancyId) : null,
      });

      if (format === 'json') {
        const json = exportMetricsToJSON(metrics, { startDate, endDate, vacancyId });
        return new NextResponse(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="metrics-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
      } else if (format === 'csv') {
        const csv = exportMetricsToCSV(metrics);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="metrics-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }
    }

    if (type === 'trends') {
      const months = parseInt(searchParams.get('months') || '12', 10);
      const trends = await getAllTrends(scope.companyId, { months });

      if (format === 'json') {
        const json = exportTrendsToJSON(trends);
        return new NextResponse(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="trends-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
      }
    }

    return apiError(request, 'INVALID_FORMAT', 400);
  } catch (err) {
    console.error('[analytics/export GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
