/**
 * P-1026 — Performance: Métricas de cache do HR Score
 * GET /api/admin/hr-score/cache-metrics
 *
 * Retorna estatísticas de uso do cache (hits, misses, hitRate, size)
 */

import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { getSessionPayload, CAP, requireCapability } from '../../../../../lib/ae/require-admin.js';
import { getHrScoreCacheMetrics } from '../../../../../lib/hr-score-cache.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const metrics = getHrScoreCacheMetrics();

    return NextResponse.json({
      ok: true,
      cache: metrics,
    });
  } catch (err) {
    console.error('[hr-score/cache-metrics GET]', err);
    return apiError(request, ERR.SERVER_ERROR, 500);
  }
}
