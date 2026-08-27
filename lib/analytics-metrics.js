/**
 * B-1101 — Analytics: métricas de efetividade (hiring ROI)
 * 
 * Calcula métricas de impacto real do processo seletivo:
 * - Time-to-hire
 * - Time-to-productivity
 * - Taxa de retenção
 * - Fit médio contratados vs pool
 * - Aderência rubrica
 */

import { query, queryRead } from './db.js';

/**
 * Calcula time-to-hire (dias: vaga aberta → contratação)
 * @param {number} companyId
 * @param {object} opts - { startDate, endDate, vacancyId }
 * @returns {Promise<{ avgDays: number, count: number, trend: number }>}
 */
export async function getTimeToHire(companyId, opts = {}) {
  const { startDate, endDate, vacancyId } = opts;
  
  let whereClauses = ['v.company_id = $1', 'v.deleted = FALSE'];
  let params = [companyId];
  let paramIdx = 2;

  if (vacancyId) {
    whereClauses.push(`v.id = $${paramIdx}`);
    params.push(vacancyId);
    paramIdx++;
  }

  if (startDate) {
    whereClauses.push(`c.hire_date >= $${paramIdx}`);
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClauses.push(`c.hire_date <= $${paramIdx}`);
    params.push(endDate);
    paramIdx++;
  }

  const sql = `
    SELECT
      AVG(c.hire_date - v.created_at) AS avg_days,
      COUNT(*) AS count
    FROM candidates c
    INNER JOIN vacancies v ON c.vacancy_id = v.id
    WHERE ${whereClauses.join(' AND ')}
      AND c.hire_date IS NOT NULL
  `;

  const result = await queryRead(sql, params);
  const row = result.rows[0];

  // Calcular trend (comparar com período anterior)
  let trend = 0;
  if (startDate && endDate) {
    const duration = new Date(endDate) - new Date(startDate);
    const previousStart = new Date(new Date(startDate) - duration);
    const previousEnd = new Date(startDate);

    const trendSql = `
      SELECT AVG(c.hire_date - v.created_at) AS avg_days
      FROM candidates c
      INNER JOIN vacancies v ON c.vacancy_id = v.id
      WHERE v.company_id = $1
        AND v.deleted = FALSE
        AND c.hire_date IS NOT NULL
        AND c.hire_date >= $2
        AND c.hire_date < $3
    `;
    const trendResult = await queryRead(trendSql, [companyId, previousStart.toISOString(), previousEnd.toISOString()]);
    const previousAvg = parseFloat(trendResult.rows[0]?.avg_days || 0);
    const currentAvg = parseFloat(row.avg_days || 0);
    
    if (previousAvg > 0) {
      trend = ((currentAvg - previousAvg) / previousAvg) * 100;
    }
  }

  return {
    avgDays: Math.round(parseFloat(row.avg_days || 0)),
    count: parseInt(row.count || 0),
    trend: Math.round(trend * 10) / 10, // 1 decimal
  };
}

/**
 * Calcula time-to-productivity (dias até HR Score > 60)
 * @param {number} companyId
 * @param {object} opts - { startDate, endDate }
 * @returns {Promise<{ avgDays: number, count: number }>}
 */
export async function getTimeToProductivity(companyId, opts = {}) {
  const { startDate, endDate } = opts;
  
  let whereClauses = ['c.company_id = $1', 'c.hire_date IS NOT NULL'];
  let params = [companyId];
  let paramIdx = 2;

  if (startDate) {
    whereClauses.push(`c.hire_date >= $${paramIdx}`);
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClauses.push(`c.hire_date <= $${paramIdx}`);
    params.push(endDate);
    paramIdx++;
  }

  const sql = `
    SELECT
      AVG(
        (SELECT MIN(hs.last_calculated_at - c.hire_date)
         FROM hr_scores hs
         WHERE hs.candidate_id = c.id
           AND hs.overall_score > 60
           AND hs.last_calculated_at > c.hire_date
        )
      ) AS avg_days,
      COUNT(*) AS count
    FROM candidates c
    WHERE ${whereClauses.join(' AND ')}
      AND EXISTS (
        SELECT 1 FROM hr_scores hs2
        WHERE hs2.candidate_id = c.id
          AND hs2.overall_score > 60
          AND hs2.last_calculated_at > c.hire_date
      )
  `;

  const result = await queryRead(sql, params);
  const row = result.rows[0];

  return {
    avgDays: Math.round(parseFloat(row.avg_days || 0)),
    count: parseInt(row.count || 0),
  };
}

/**
 * Calcula taxa de retenção (% contratados que ficam N meses)
 * @param {number} companyId
 * @param {object} opts - { months: 6|12|24, startDate, endDate }
 * @returns {Promise<{ rate: number, hiredCount: number, retainedCount: number }>}
 */
export async function getRetentionRate(companyId, opts = {}) {
  const { months = 6, startDate, endDate } = opts;
  
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  let whereClauses = ['company_id = $1', 'hire_date IS NOT NULL', `hire_date <= $2`];
  let params = [companyId, cutoffDate.toISOString()];
  let paramIdx = 3;

  if (startDate) {
    whereClauses.push(`hire_date >= $${paramIdx}`);
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClauses.push(`hire_date <= $${paramIdx}`);
    params.push(endDate);
    paramIdx++;
  }

  const sql = `
    SELECT
      COUNT(*) AS hired_count,
      COUNT(*) FILTER (WHERE exit_date IS NULL OR exit_date > $2) AS retained_count
    FROM candidates
    WHERE ${whereClauses.join(' AND ')}
  `;

  const result = await queryRead(sql, params);
  const row = result.rows[0];
  const hiredCount = parseInt(row.hired_count || 0);
  const retainedCount = parseInt(row.retained_count || 0);

  const rate = hiredCount > 0 ? (retainedCount / hiredCount) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    hiredCount,
    retainedCount,
  };
}

/**
 * Calcula fit médio de contratados vs pool total
 * @param {number} companyId
 * @param {object} opts - { startDate, endDate, vacancyId }
 * @returns {Promise<{ hiredAvgFit: number, poolAvgFit: number, delta: number }>}
 */
export async function getFitComparison(companyId, opts = {}) {
  const { startDate, endDate, vacancyId } = opts;
  
  let whereClauses = ['c.company_id = $1', 'c.vacancy_id IS NOT NULL'];
  let params = [companyId];
  let paramIdx = 2;

  if (vacancyId) {
    whereClauses.push(`c.vacancy_id = $${paramIdx}`);
    params.push(vacancyId);
    paramIdx++;
  }

  if (startDate) {
    whereClauses.push(`c.created_at >= $${paramIdx}`);
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClauses.push(`c.created_at <= $${paramIdx}`);
    params.push(endDate);
    paramIdx++;
  }

  const sql = `
    SELECT
      AVG(CASE WHEN c.hire_date IS NOT NULL THEN a.area_fit ELSE NULL END) AS hired_avg_fit,
      AVG(a.area_fit) AS pool_avg_fit,
      COUNT(*) FILTER (WHERE c.hire_date IS NOT NULL) AS hired_count,
      COUNT(*) AS pool_count
    FROM candidates c
    LEFT JOIN assessments a ON c.id = a.candidate_id
    WHERE ${whereClauses.join(' AND ')}
      AND a.area_fit IS NOT NULL
  `;

  const result = await queryRead(sql, params);
  const row = result.rows[0];

  const hiredAvgFit = parseFloat(row.hired_avg_fit || 0);
  const poolAvgFit = parseFloat(row.pool_avg_fit || 0);
  const delta = hiredAvgFit - poolAvgFit;

  return {
    hiredAvgFit: Math.round(hiredAvgFit * 10) / 10,
    poolAvgFit: Math.round(poolAvgFit * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    hiredCount: parseInt(row.hired_count || 0),
    poolCount: parseInt(row.pool_count || 0),
  };
}

/**
 * Calcula aderência rubrica (fit T1-T9 contratados vs expectativa)
 * @param {number} companyId
 * @param {object} opts - { startDate, endDate, vacancyId }
 * @returns {Promise<{ avgAdherence: number, count: number }>}
 */
export async function getRubricAdherence(companyId, opts = {}) {
  const { startDate, endDate, vacancyId } = opts;
  
  let whereClauses = ['c.company_id = $1', 'c.hire_date IS NOT NULL', 'v.rubric IS NOT NULL'];
  let params = [companyId];
  let paramIdx = 2;

  if (vacancyId) {
    whereClauses.push(`c.vacancy_id = $${paramIdx}`);
    params.push(vacancyId);
    paramIdx++;
  }

  if (startDate) {
    whereClauses.push(`c.hire_date >= $${paramIdx}`);
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    whereClauses.push(`c.hire_date <= $${paramIdx}`);
    params.push(endDate);
    paramIdx++;
  }

  // area_fit já considera a rubrica da vaga
  const sql = `
    SELECT
      AVG(a.area_fit) AS avg_adherence,
      COUNT(*) AS count
    FROM candidates c
    INNER JOIN vacancies v ON c.vacancy_id = v.id
    LEFT JOIN assessments a ON c.id = a.candidate_id
    WHERE ${whereClauses.join(' AND ')}
      AND a.area_fit IS NOT NULL
  `;

  const result = await queryRead(sql, params);
  const row = result.rows[0];

  return {
    avgAdherence: Math.round(parseFloat(row.avg_adherence || 0) * 10) / 10,
    count: parseInt(row.count || 0),
  };
}

/**
 * Agrega todas as métricas de efetividade
 * @param {number} companyId
 * @param {object} opts - { startDate, endDate, vacancyId }
 * @returns {Promise<object>}
 */
export async function getHiringEffectivenessMetrics(companyId, opts = {}) {
  const [
    timeToHire,
    timeToProductivity,
    retention6m,
    retention12m,
    fitComparison,
    rubricAdherence,
  ] = await Promise.all([
    getTimeToHire(companyId, opts),
    getTimeToProductivity(companyId, opts),
    getRetentionRate(companyId, { ...opts, months: 6 }),
    getRetentionRate(companyId, { ...opts, months: 12 }),
    getFitComparison(companyId, opts),
    getRubricAdherence(companyId, opts),
  ]);

  return {
    timeToHire,
    timeToProductivity,
    retention: {
      sixMonths: retention6m,
      twelveMonths: retention12m,
    },
    fitComparison,
    rubricAdherence,
  };
}
