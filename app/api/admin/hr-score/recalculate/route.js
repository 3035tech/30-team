import { cookies } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth.js';
import { apiError } from '../../../../../lib/api-error.js';
import { hydrateSessionPayload } from '../../../../../lib/session.js';
import { isAdminRole } from '../../../../../lib/permissions.js';
import { recalculateCompanyScores } from '../../../../../lib/hr-score.js';

/**
 * POST /api/admin/hr-score/recalculate
 * 
 * Recalcula scores de todos os colaboradores ativos de uma empresa.
 * Admin only.
 * 
 * Body: { companyId: number, limit?: number }
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('team30_session')?.value;
    if (!token) {
      return apiError(request, 'REQUIRED_LOGIN', 401);
    }

    const rawPayload = verifyToken(token);
    const payload = await hydrateSessionPayload(rawPayload);
    if (!isAdminRole(payload)) {
      return apiError(request, 'ADMIN_ONLY', 403);
    }

    const body = await request.json();
    const companyId = parseInt(body.companyId);
    const limit = body.limit ? parseInt(body.limit) : 100;

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
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
    return apiError(request, 'INTERNAL', 500);
  }
}
