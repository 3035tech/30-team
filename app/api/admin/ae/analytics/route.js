import { NextResponse } from 'next/server';
import { queryRead } from '../../../../../lib/db';
import { getManagerScope, getSessionPayload, requireManagerRole } from '../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../lib/api-error';

/** Cap completed attempts scanned for analytics (admin all-companies worst case). */
const AE_ANALYTICS_ATTEMPT_CAP = 20000;

/** GET /api/admin/ae/analytics — dashboard RH (agregações no SQL). */
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
    const fromSql = `
      FROM ae_attempts a
      LEFT JOIN areas ar ON ar.id = a.area_id
      ${whereSql}
    `;

    const sampleParams = [...params, AE_ANALYTICS_ATTEMPT_CAP];
    const limIx = sampleParams.length;

    // Sample of completed attempts (bounded) used by dimension / ranking aggregates.
    const sampleCte = `
      WITH sample AS (
        SELECT a.dimension_scores, a.ranking, ar.label AS area_label
        ${fromSql}
        ORDER BY a.created_at DESC
        LIMIT $${limIx}
      )
    `;

    const [totalRes, distRes, topRes, areaRes, invitesRes] = await Promise.all([
      queryRead(`SELECT COUNT(*)::int AS n ${fromSql}`, params),
      queryRead(
        `${sampleCte}
         SELECT kv.key AS key,
                ROUND(AVG((kv.value)::numeric))::int AS average,
                COUNT(*)::int AS count
         FROM sample s
         CROSS JOIN LATERAL jsonb_each_text(s.dimension_scores) AS kv(key, value)
         WHERE s.dimension_scores IS NOT NULL
           AND jsonb_typeof(s.dimension_scores) = 'object'
           AND (kv.value)~'^-?[0-9]+(\\.[0-9]+)?$'
         GROUP BY kv.key
         ORDER BY average DESC`,
        sampleParams
      ),
      queryRead(
        `${sampleCte}
         SELECT s.ranking->>0 AS key,
                COUNT(*)::int AS count
         FROM sample s
         WHERE s.ranking IS NOT NULL
           AND jsonb_typeof(s.ranking) = 'array'
           AND s.ranking->>0 IS NOT NULL
           AND length(trim(s.ranking->>0)) > 0
         GROUP BY 1
         ORDER BY count DESC`,
        sampleParams
      ),
      queryRead(
        `${sampleCte}
         SELECT COALESCE(NULLIF(trim(s.area_label), ''), 'Sem área') AS area,
                s.ranking->>0 AS top,
                COUNT(*)::int AS count
         FROM sample s
         GROUP BY 1, 2`,
        sampleParams
      ),
      queryRead(
        `SELECT status, COUNT(*)::int AS count
         FROM ae_invites i
         ${
           !isAdmin
             ? 'WHERE i.company_id = $1'
             : companyFilter && companyFilter !== 'all'
               ? 'WHERE i.company_id = $1'
               : ''
         }
         GROUP BY status`,
        !isAdmin
          ? [companyId]
          : companyFilter && companyFilter !== 'all'
            ? [Number(companyFilter)]
            : []
      ),
    ]);

    const totalAttempts = totalRes.rows[0]?.n ?? 0;
    const sampleSize = Math.min(totalAttempts, AE_ANALYTICS_ATTEMPT_CAP);

    const distribution = distRes.rows.map((r) => ({
      key: r.key,
      average: r.average,
      count: r.count,
    }));

    const topMotivators = topRes.rows.map((r) => ({
      key: r.key,
      count: r.count,
      pct: sampleSize ? Math.round((r.count / sampleSize) * 100) : 0,
    }));

    const byArea = {};
    for (const row of areaRes.rows) {
      const area = row.area || 'Sem área';
      if (!byArea[area]) byArea[area] = { count: 0, tops: {} };
      byArea[area].count += row.count;
      if (row.top) {
        byArea[area].tops[row.top] = (byArea[area].tops[row.top] || 0) + row.count;
      }
    }

    return NextResponse.json({
      totalAttempts,
      distribution,
      topMotivators,
      byArea,
      inviteStats: invitesRes.rows,
      sampled: totalAttempts > AE_ANALYTICS_ATTEMPT_CAP,
      sampleSize,
    });
  } catch (err) {
    console.error('GET /api/admin/ae/analytics', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
