/**
 * B-1104 — Analytics: API de alertas
 * GET /api/admin/analytics/alerts
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error.js';
import { getManagerScope } from '@/lib/ae/require-admin.js';
import { detectAllAlerts } from '@/lib/analytics-alerts.js';

export async function GET(request) {
  try {
    const scope = await getManagerScope(request, { allowDirection: true, allowHr: true });
    if (!scope) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const alerts = await detectAllAlerts(scope.companyId);

    return NextResponse.json({
      ok: true,
      alerts,
      count: alerts.length,
    });
  } catch (err) {
    console.error('[analytics/alerts GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
