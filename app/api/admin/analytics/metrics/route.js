/**
 * B-1101 — Analytics: API de métricas de efetividade
 * GET /api/admin/analytics/metrics
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error.js';
import { getHiringEffectivenessMetrics } from '@/lib/analytics-metrics.js';
import { getManagerScope } from '@/lib/ae/require-admin.js';

export async function GET(request) {
  try {
    const scope = await getManagerScope(request, { allowDirection: true, allowHr: true });
    if (!scope) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || null;
    const endDate = searchParams.get('endDate') || null;
    const vacancyId = searchParams.get('vacancyId') || null;

    const metrics = await getHiringEffectivenessMetrics(scope.companyId, {
      startDate,
      endDate,
      vacancyId: vacancyId ? parseInt(vacancyId) : null,
    });

    return NextResponse.json({
      ok: true,
      metrics,
      filters: { startDate, endDate, vacancyId },
    });
  } catch (err) {
    console.error('[analytics/metrics GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
