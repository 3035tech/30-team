import { cookies } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth.js';
import { queryRead } from '../../../../../lib/db.js';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { hydrateSessionPayload } from '../../../../../lib/session.js';
import { isManagerRole, isAdminRole } from '../../../../../lib/permissions.js';
import { calculateHrScore, getHrScore, saveHrScore } from '../../../../../lib/hr-score.js';
import { calculateAllPredictions } from '../../../../../lib/hr-predictions.js';

/**
 * GET /api/admin/hr-score/[candidateId]
 * 
 * Retorna HR Score de um candidato (calcula se não existir).
 * Tenant-scoped: admin vê todos, direction/hr só da própria empresa.
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('team30_session')?.value;
    if (!token) {
      return apiError(request, ERR.REQUIRED_LOGIN, 401);
    }

    const rawPayload = verifyToken(token);
    const payload = await hydrateSessionPayload(rawPayload);
    if (!isManagerRole(payload)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const candidateId = parseInt(params.candidateId);
    if (!Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, ERR.INVALID_PARAMS, 400);
    }

    // Verificar tenant e existência do candidato
    const candidateRes = await queryRead(
      `SELECT id, company_id AS "companyId", full_name AS "fullName", employee
       FROM candidates
       WHERE id = $1 AND deleted = FALSE
       LIMIT 1`,
      [candidateId]
    );

    if (candidateRes.rowCount === 0) {
      return apiError(request, ERR.NOT_FOUND, 404);
    }

    const candidate = candidateRes.rows[0];
    const isAdmin = isAdminRole(payload);

    // Tenant check
    if (!isAdmin && String(candidate.companyId) !== String(payload.companyId)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    // Buscar score existente
    let score = await getHrScore(candidateId);

    // Se não existe ou está desatualizado (> 7 dias), recalcular
    const needsRecalc = !score || 
      (Date.now() - new Date(score.calculatedAt).getTime()) > 7 * 24 * 60 * 60 * 1000;

    if (needsRecalc) {
      const scoreData = await calculateHrScore(candidateId, candidate.companyId);
      const predictions = await calculateAllPredictions(candidateId, scoreData.signals);
      
      await saveHrScore(candidateId, candidate.companyId, scoreData, predictions);
      score = await getHrScore(candidateId);
    }

    return Response.json({
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      employee: candidate.employee,
      score: score.score,
      signals: score.signals,
      turnoverRisk: score.turnoverRisk,
      turnoverReasons: score.turnoverReasons,
      pdiGapAreas: score.pdiGapAreas,
      calculatedAt: score.calculatedAt,
    });
  } catch (err) {
    console.error('[hr-score] GET error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
