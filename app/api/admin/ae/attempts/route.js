import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { getManagerScope, getSessionPayload, requireManagerRole } from '../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../lib/api-error';

/** GET /api/admin/ae/attempts — resultados / tentativas */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    const { isAdmin, companyId, authorized } = getManagerScope(payload);
    if (!authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get('status') || 'completed').trim();
    const companyFilter = String(searchParams.get('company') || '').trim();
    const candidateId = searchParams.get('candidateId');
    const q = String(searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    let n = 1;

    if (!isAdmin) {
      where.push(`a.company_id = $${n++}`);
      params.push(companyId);
    } else if (companyFilter && companyFilter !== 'all') {
      where.push(`a.company_id = $${n++}`);
      params.push(Number(companyFilter));
    }

    if (status && status !== 'all') {
      where.push(`a.status = $${n++}`);
      params.push(status);
    }
    if (candidateId) {
      where.push(`a.candidate_id = $${n++}`);
      params.push(Number(candidateId));
    }
    if (q) {
      where.push(`(LOWER(c.full_name) LIKE $${n} OR LOWER(c.email) LIKE $${n})`);
      params.push(`%${q}%`);
      n += 1;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::int AS total
       FROM ae_attempts a
       JOIN candidates c ON c.id = a.candidate_id
       ${whereSql}`,
      params
    );

    const listRes = await query(
      `SELECT a.id, a.status, a.started_at AS "startedAt", a.completed_at AS "completedAt",
              a.dimension_scores AS "dimensionScores", a.ranking, a.profile_summary AS "profileSummary",
              c.id AS "candidateId", c.full_name AS "candidateName", c.email AS "candidateEmail",
              ar.label AS "areaLabel", co.name AS "companyName", co.id AS "companyId"
       FROM ae_attempts a
       JOIN candidates c ON c.id = a.candidate_id
       JOIN companies co ON co.id = a.company_id
       LEFT JOIN areas ar ON ar.id = a.area_id
       ${whereSql}
       ORDER BY a.completed_at DESC NULLS LAST, a.started_at DESC
       LIMIT $${n} OFFSET $${n + 1}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      items: listRes.rows,
      total: countRes.rows[0].total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('GET /api/admin/ae/attempts', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
