import { apiError, ERR } from '../../../../../lib/api-error.js';
import {
  getSessionPayload,
  CAP,
  requireCapability,
} from '../../../../../lib/ae/require-admin.js';
import { recalculateCompanyScores } from '../../../../../lib/hr-score.js';

/**
 * POST /api/admin/hr-score/recalculate
 *
 * Recalcula scores de todos os colaboradores ativos de uma empresa.
 *
 * Body: { companyId: number, limit?: number }
 */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const companyId = parseInt(body.companyId);
    const limit = body.limit ? parseInt(body.limit) : 100;

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.INVALID_PARAMS, 400);
    }

    console.log(`[hr-score] Recalculating scores for company ${companyId} (limit ${limit})...`);

    const result = await recalculateCompanyScores(companyId, { limit });

    const successful = result.results.filter(r => r.ok).length;
    const failed = result.results.filter(r => !r.ok).length;

    return Response.json({
      ok: true,
      companyId,
      processed: result.processed,
      successful,
      failed,
      results: result.results,
    });
  } catch (err) {
    console.error('[hr-score] Recalculate error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
