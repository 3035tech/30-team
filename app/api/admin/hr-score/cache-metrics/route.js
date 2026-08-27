/**
 * P-1026 — Performance: Métricas de cache do HR Score
 * GET /api/admin/hr-score/cache-metrics
 *
 * Retorna estatísticas de uso do cache (hits, misses, hitRate, size)
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { getSessionPayload, requireAdminRole } from '../../../../../lib/ae/require-admin.js';
import { getHrScoreCacheMetrics } from '../../../../../lib/hr-score-cache.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireAdminRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const metrics = getHrScoreCacheMetrics();

    return NextResponse.json({
      ok: true,
      cache: metrics,
    });
  } catch (err) {
    console.error('[hr-score/cache-metrics GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
