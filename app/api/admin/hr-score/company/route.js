import { cookies } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth.js';
import { queryRead } from '../../../../../lib/db.js';
import { apiError } from '../../../../../lib/api-error.js';
import { hydrateSessionPayload } from '../../../../../lib/session.js';
import { isManagerRole, isAdminRole } from '../../../../../lib/permissions.js';
import { getCompanyScoresByArea } from '../../../../../lib/hr-score.js';

/**
 * GET /api/admin/hr-score/company?companyId=X
 * 
 * Retorna rollup de HR Scores por área da empresa.
 * Admin pode passar companyId; direction/hr usa a própria empresa.
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

    // Buscar empresa
    const companyRes = await queryRead(
      `SELECT id, name FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`,
      [companyId]
    );

    if (companyRes.rowCount === 0) {
      return apiError(request, 'COMPANY_NOT_FOUND', 404);
    }

    const company = companyRes.rows[0];

    // Buscar scores agregados por área
    const scoresByArea = await getCompanyScoresByArea(companyId);

    // Buscar score médio geral
    const overallRes = await queryRead(
      `SELECT 
         COUNT(h.id) as total,
         ROUND(AVG(h.score)) as avg_score,
         MIN(h.score) as min_score,
         MAX(h.score) as max_score
       FROM hr_scores h
       JOIN candidates c ON c.id = h.candidate_id
       WHERE h.company_id = $1
         AND c.employee = TRUE
         AND c.deleted = FALSE`,
      [companyId]
    );

    const overall = {
      total: parseInt(overallRes.rows[0]?.total || 0),
      avgScore: parseInt(overallRes.rows[0]?.avg_score || 0),
      minScore: parseInt(overallRes.rows[0]?.min_score || 0),
      maxScore: parseInt(overallRes.rows[0]?.max_score || 0),
    };

    // Top 5 e Bottom 5
    const topRes = await queryRead(
      `SELECT 
         c.id, c.full_name AS "fullName", c.area,
         h.score, h.turnover_risk AS "turnoverRisk"
       FROM hr_scores h
       JOIN candidates c ON c.id = h.candidate_id
       WHERE h.company_id = $1
         AND c.employee = TRUE
         AND c.deleted = FALSE
       ORDER BY h.score DESC
       LIMIT 5`,
      [companyId]
    );

    const bottomRes = await queryRead(
      `SELECT 
         c.id, c.full_name AS "fullName", c.area,
         h.score, h.turnover_risk AS "turnoverRisk"
       FROM hr_scores h
       JOIN candidates c ON c.id = h.candidate_id
       WHERE h.company_id = $1
         AND c.employee = TRUE
         AND c.deleted = FALSE
       ORDER BY h.score ASC
       LIMIT 5`,
      [companyId]
    );

    return Response.json({
      company: {
        id: company.id,
        name: company.name,
      },
      overall,
      byArea: scoresByArea,
      topPerformers: topRes.rows,
      bottomPerformers: bottomRes.rows,
    });
  } catch (err) {
    console.error('[hr-score] GET company error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
