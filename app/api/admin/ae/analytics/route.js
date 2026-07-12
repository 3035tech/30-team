import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { getManagerScope, getSessionPayload, requireManagerRole } from '../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../lib/api-error';

/** GET /api/admin/ae/analytics — dashboard RH */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    const { isAdmin, companyId, authorized } = getManagerScope(payload);
    if (!authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const { searchParams } = new URL(request.url);
    const companyFilter = String(searchParams.get('company') || '').trim();
    const areaKey = String(searchParams.get('area') || '').trim();

    const where = [`a.status = 'completed'`];
    const params = [];
    let n = 1;

    if (!isAdmin) {
      where.push(`a.company_id = $${n++}`);
      params.push(companyId);
    } else if (companyFilter && companyFilter !== 'all') {
      where.push(`a.company_id = $${n++}`);
      params.push(Number(companyFilter));
    }

    if (areaKey && areaKey !== 'all') {
      where.push(`ar.key = $${n++}`);
      params.push(areaKey);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const attemptsRes = await query(
      `SELECT a.dimension_scores AS "dimensionScores", a.ranking, ar.key AS "areaKey", ar.label AS "areaLabel"
       FROM ae_attempts a
       LEFT JOIN areas ar ON ar.id = a.area_id
       ${whereSql}`,
      params
    );

    const dimensionTotals = {};
    const dimensionCounts = {};
    const topFirst = {};
    const byArea = {};

    for (const row of attemptsRes.rows) {
      const scores = row.dimensionScores || {};
      for (const [dim, score] of Object.entries(scores)) {
        dimensionTotals[dim] = (dimensionTotals[dim] || 0) + score;
        dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
      }
      const top = Array.isArray(row.ranking) ? row.ranking[0] : null;
      if (top) topFirst[top] = (topFirst[top] || 0) + 1;

      const area = row.areaLabel || 'Sem área';
      if (!byArea[area]) byArea[area] = { count: 0, tops: {} };
      byArea[area].count += 1;
      if (top) byArea[area].tops[top] = (byArea[area].tops[top] || 0) + 1;
    }

    const totalAttempts = attemptsRes.rowCount;
    const distribution = Object.keys(dimensionTotals)
      .map((key) => ({
        key,
        average: Math.round(dimensionTotals[key] / dimensionCounts[key]),
        count: dimensionCounts[key],
      }))
      .sort((a, b) => b.average - a.average);

    const topMotivators = Object.entries(topFirst)
      .map(([key, count]) => ({ key, count, pct: totalAttempts ? Math.round((count / totalAttempts) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    const invitesRes = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM ae_invites i
       ${!isAdmin ? 'WHERE i.company_id = $1' : companyFilter && companyFilter !== 'all' ? 'WHERE i.company_id = $1' : ''}
       GROUP BY status`,
      !isAdmin ? [companyId] : companyFilter && companyFilter !== 'all' ? [Number(companyFilter)] : []
    );

    return NextResponse.json({
      totalAttempts,
      distribution,
      topMotivators,
      byArea,
      inviteStats: invitesRes.rows,
    });
  } catch (err) {
    console.error('GET /api/admin/ae/analytics', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
