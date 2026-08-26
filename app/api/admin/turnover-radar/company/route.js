import { cookies } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth.js';
import { apiError } from '../../../../../lib/api-error.js';
import { hydrateSessionPayload } from '../../../../../lib/session.js';
import { isManagerRole, isAdminRole } from '../../../../../lib/permissions.js';
import { getCompanyTurnoverRisks } from '../../../../../lib/turnover-radar.js';

/**
 * GET /api/admin/turnover-radar/company?companyId=X
 * 
 * Retorna lista de colaboradores em risco de rotatividade
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('team30_session')?.value;
    if (!token) {
      return apiError(request, 'REQUIRED_LOGIN', 401);
    }

    const rawPayload = verifyToken(token);
    const payload = await hydrateSessionPayload(rawPayload);
    if (!isManagerRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const isAdmin = isAdminRole(payload);
    const { searchParams } = new URL(request.url);
    
    let companyId;
    if (isAdmin) {
      const qCompanyId = searchParams.get('companyId');
      companyId = qCompanyId ? parseInt(qCompanyId) : null;
      if (!companyId) {
        return apiError(request, 'COMPANY_REQUIRED', 400);
      }
    } else {
      companyId = payload.companyId;
      if (!companyId) {
        return apiError(request, 'COMPANY_REQUIRED', 400);
      }
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const minRisk = searchParams.get('minRisk') || 'medium';

    const risks = await getCompanyTurnoverRisks(companyId, {
      limit: Math.min(limit, 100),
      minRisk,
    });

    return Response.json({
      companyId,
      total: risks.length,
      risks,
    });
  } catch (err) {
    console.error('[turnover-radar] GET company error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
