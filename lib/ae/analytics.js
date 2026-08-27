/**
 * Motivators (AE) analytics aggregates for the admin RH dashboard.
 * SQL aggregations over completed attempts + invite status counts.
 */

/** Cap completed attempts scanned for analytics (admin all-companies worst case). */
export const AE_ANALYTICS_ATTEMPT_CAP = 20000;

/**
 * @param {typeof import('../db.js').queryRead} dbQuery
 * @param {{
 *   isAdmin: boolean,
 *   companyId?: number|null,
 *   companyFilter?: string,
 *   areaKey?: string,
 * }} opts
 * @returns {Promise<{
 *   totalAttempts: number,
 *   distribution: Array<{ key: string, average: number, count: number }>,
 *   topMotivators: Array<{ key: string, count: number, pct: number }>,
 *   byArea: Record<string, { count: number, tops: Record<string, number> }>,
 *   inviteStats: Array<{ status: string, count: number }>,
 *   sampled: boolean,
 *   sampleSize: number,
 * }>}
 */
export async function getAeAnalytics(dbQuery, { isAdmin, companyId, companyFilter = '', areaKey = '' }) {
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

  const inviteCompanyScoped =
    !isAdmin || (companyFilter && companyFilter !== 'all');
  const inviteParams = inviteCompanyScoped
    ? [!isAdmin ? companyId : Number(companyFilter)]
    : [];

  const [totalRes, distRes, topRes, areaRes, invitesRes] = await Promise.all([
    dbQuery(`SELECT COUNT(*)::int AS n ${fromSql}`, params),
    dbQuery(
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
    dbQuery(
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
    dbQuery(
      `${sampleCte}
         SELECT COALESCE(NULLIF(trim(s.area_label), ''), 'Sem área') AS area,
                s.ranking->>0 AS top,
                COUNT(*)::int AS count
         FROM sample s
         GROUP BY 1, 2`,
      sampleParams
    ),
    dbQuery(
      `SELECT status, COUNT(*)::int AS count
         FROM ae_invites i
         ${inviteCompanyScoped ? 'WHERE i.company_id = $1' : ''}
         GROUP BY status`,
      inviteParams
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

  return {
    totalAttempts,
    distribution,
    topMotivators,
    byArea,
    inviteStats: invitesRes.rows,
    sampled: totalAttempts > AE_ANALYTICS_ATTEMPT_CAP,
    sampleSize,
  };
}
