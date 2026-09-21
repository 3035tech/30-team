import { apiError, ERR } from '../../../../../lib/api-error.js';
import {
  getSessionPayload,
  isAdminRole,
  CAP,
  requireCapability,
} from '../../../../../lib/ae/require-admin.js';
import { queryRead, query } from '../../../../../lib/db.js';
import {
  calculateHrScore,
  recalculateCompanyScores,
  saveHrScore,
} from '../../../../../lib/hr-score.js';
import { calculateAllPredictions } from '../../../../../lib/hr-predictions.js';
import { detectTrendChange, emitTurnoverRiskChangeNotification } from '../../../../../lib/turnover-radar.js';

/**
 * POST /api/admin/hr-score/recalculate
 *
 * Recalcula scores de todos os colaboradores ativos de uma empresa.
 *
 * Body: { companyId: number, limit?: number } or { candidateId: number }
 */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const candidateId = parseInt(body.candidateId, 10);
    const companyId = parseInt(body.companyId);
    const limit = body.limit ? parseInt(body.limit) : 100;

    if (Number.isFinite(candidateId) && candidateId > 0) {
      const candidateRes = await queryRead(
        `SELECT id, company_id AS "companyId", full_name AS "fullName"
         FROM candidates
         WHERE id = $1 AND deleted = FALSE
         LIMIT 1`,
        [candidateId]
      );
      if (candidateRes.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

      const candidate = candidateRes.rows[0];
      if (!isAdminRole(payload) && String(candidate.companyId) !== String(payload.companyId)) {
        return apiError(request, ERR.UNAUTHORIZED, 401);
      }

      const change = await detectTrendChange(candidate.id);
      const scoreData = await calculateHrScore(candidate.id, candidate.companyId);
      const predictions = await calculateAllPredictions(candidate.id, scoreData.signals);
      await saveHrScore(candidate.id, candidate.companyId, scoreData, predictions);
      await emitTurnoverRiskChangeNotification(query, {
        candidateId: candidate.id,
        companyId: candidate.companyId,
        candidateName: candidate.fullName,
        change,
      });

      return Response.json({
        ok: true,
        candidateId: candidate.id,
        companyId: candidate.companyId,
        processed: 1,
        successful: 1,
        failed: 0,
        score: scoreData.score,
        turnoverRisk: predictions.turnover_risk || null,
      });
    }

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
