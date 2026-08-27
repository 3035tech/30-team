/**
 * B-1103 — Analytics: Comparativos (área, período, rubrica)
 * 
 * Compara métricas entre segmentos para identificar gaps e oportunidades.
 */

import { queryRead } from './db.js';

/**
 * Compara HR Score entre duas áreas/departamentos
 * @param {number} companyId
 * @param {string} areaA - Nome da área A
 * @param {string} areaB - Nome da área B
 * @returns {Promise<{areaA, areaB, comparison}>}
 */
export async function compareAreas(companyId, areaA, areaB) {
  const sql = `
    SELECT
      c.area,
      AVG(hs.overall_score) AS avg_hr_score,
      AVG(CASE WHEN hs.turnover_risk = 'high' THEN 1 ELSE 0 END) * 100 AS high_risk_pct,
      COUNT(DISTINCT c.id) AS count
    FROM candidates c
    LEFT JOIN hr_scores hs ON c.id = hs.candidate_id
    WHERE c.company_id = $1
      AND c.area IN ($2, $3)
      AND c.hire_date IS NOT NULL
      AND c.exit_date IS NULL
    GROUP BY c.area
  `;

  const result = await queryRead(sql, [companyId, areaA, areaB]);
  
  const dataA = result.rows.find(r => r.area === areaA) || { avg_hr_score: null, high_risk_pct: null, count: 0 };
  const dataB = result.rows.find(r => r.area === areaB) || { avg_hr_score: null, high_risk_pct: null, count: 0 };

  return {
    areaA: {
      name: areaA,
      avgHrScore: parseFloat(dataA.avg_hr_score) || 0,
      highRiskPct: parseFloat(dataA.high_risk_pct) || 0,
      count: parseInt(dataA.count) || 0,
    },
    areaB: {
      name: areaB,
      avgHrScore: parseFloat(dataB.avg_hr_score) || 0,
      highRiskPct: parseFloat(dataB.high_risk_pct) || 0,
      count: parseInt(dataB.count) || 0,
    },
    comparison: {
      hrScoreDelta: (parseFloat(dataA.avg_hr_score) || 0) - (parseFloat(dataB.avg_hr_score) || 0),
      riskDelta: (parseFloat(dataA.high_risk_pct) || 0) - (parseFloat(dataB.high_risk_pct) || 0),
    },
  };
}

/**
 * Compara métricas entre dois períodos
 * @param {number} companyId
 * @param {string} periodAStart - ISO date
 * @param {string} periodAEnd - ISO date
 * @param {string} periodBStart - ISO date
 * @param {string} periodBEnd - ISO date
 * @returns {Promise<{periodA, periodB, comparison}>}
 */
export async function comparePeriods(companyId, periodAStart, periodAEnd, periodBStart, periodBEnd) {
  const sqlA = `
    SELECT
      AVG(hs.overall_score) AS avg_hr_score,
      COUNT(DISTINCT c.id) FILTER (WHERE c.hire_date BETWEEN $2 AND $3) AS hires,
      COUNT(DISTINCT c.id) FILTER (WHERE c.exit_date BETWEEN $2 AND $3) AS exits
    FROM candidates c
    LEFT JOIN hr_scores hs ON c.id = hs.candidate_id
      AND hs.last_calculated_at BETWEEN $2 AND $3
    WHERE c.company_id = $1
  `;

  const sqlB = `
    SELECT
      AVG(hs.overall_score) AS avg_hr_score,
      COUNT(DISTINCT c.id) FILTER (WHERE c.hire_date BETWEEN $2 AND $3) AS hires,
      COUNT(DISTINCT c.id) FILTER (WHERE c.exit_date BETWEEN $2 AND $3) AS exits
    FROM candidates c
    LEFT JOIN hr_scores hs ON c.id = hs.candidate_id
      AND hs.last_calculated_at BETWEEN $2 AND $3
    WHERE c.company_id = $1
  `;

  const [resultA, resultB] = await Promise.all([
    queryRead(sqlA, [companyId, periodAStart, periodAEnd]),
    queryRead(sqlB, [companyId, periodBStart, periodBEnd]),
  ]);

  const dataA = resultA.rows[0] || {};
  const dataB = resultB.rows[0] || {};

  return {
    periodA: {
      start: periodAStart,
      end: periodAEnd,
      avgHrScore: parseFloat(dataA.avg_hr_score) || 0,
      hires: parseInt(dataA.hires) || 0,
      exits: parseInt(dataA.exits) || 0,
    },
    periodB: {
      start: periodBStart,
      end: periodBEnd,
      avgHrScore: parseFloat(dataB.avg_hr_score) || 0,
      hires: parseInt(dataB.hires) || 0,
      exits: parseInt(dataB.exits) || 0,
    },
    comparison: {
      hrScoreDelta: (parseFloat(dataA.avg_hr_score) || 0) - (parseFloat(dataB.avg_hr_score) || 0),
      netHireDelta: (parseInt(dataA.hires) - parseInt(dataA.exits)) - (parseInt(dataB.hires) - parseInt(dataB.exits)),
    },
  };
}

/**
 * Compara fit médio entre duas rubricas (job roles)
 * @param {number} companyId
 * @param {number} rubricAId - Job role ID A
 * @param {number} rubricBId - Job role ID B
 * @returns {Promise<{rubricA, rubricB, comparison}>}
 */
export async function compareRubrics(companyId, rubricAId, rubricBId) {
  const sql = `
    SELECT
      jr.id,
      jr.title,
      AVG(a.area_fit) AS avg_fit,
      COUNT(DISTINCT c.id) FILTER (WHERE c.hire_date IS NOT NULL) AS hired_count,
      AVG(CASE WHEN c.hire_date IS NOT NULL THEN a.area_fit ELSE NULL END) AS hired_avg_fit
    FROM job_roles jr
    LEFT JOIN vacancies v ON v.job_role_id = jr.id AND v.deleted = FALSE
    LEFT JOIN candidates c ON c.vacancy_id = v.id
    LEFT JOIN assessments a ON a.candidate_id = c.id AND a.area_fit IS NOT NULL
    WHERE jr.company_id = $1
      AND jr.id IN ($2, $3)
      AND jr.active = TRUE
    GROUP BY jr.id, jr.title
  `;

  const result = await queryRead(sql, [companyId, rubricAId, rubricBId]);

  const dataA = result.rows.find(r => r.id === rubricAId) || {};
  const dataB = result.rows.find(r => r.id === rubricBId) || {};

  return {
    rubricA: {
      id: rubricAId,
      title: dataA.title || 'Unknown',
      avgFit: parseFloat(dataA.avg_fit) || 0,
      hiredCount: parseInt(dataA.hired_count) || 0,
      hiredAvgFit: parseFloat(dataA.hired_avg_fit) || 0,
    },
    rubricB: {
      id: rubricBId,
      title: dataB.title || 'Unknown',
      avgFit: parseFloat(dataB.avg_fit) || 0,
      hiredCount: parseInt(dataB.hired_count) || 0,
      hiredAvgFit: parseFloat(dataB.hired_avg_fit) || 0,
    },
    comparison: {
      avgFitDelta: (parseFloat(dataA.avg_fit) || 0) - (parseFloat(dataB.avg_fit) || 0),
      hiredFitDelta: (parseFloat(dataA.hired_avg_fit) || 0) - (parseFloat(dataB.hired_avg_fit) || 0),
    },
  };
}

/**
 * Lista áreas disponíveis para comparação
 * @param {number} companyId
 * @returns {Promise<Array<string>>}
 */
export async function listAvailableAreas(companyId) {
  const sql = `
    SELECT DISTINCT area
    FROM candidates
    WHERE company_id = $1
      AND area IS NOT NULL
      AND area != ''
      AND hire_date IS NOT NULL
      AND exit_date IS NULL
    ORDER BY area
  `;

  const result = await queryRead(sql, [companyId]);
  return result.rows.map(r => r.area);
}

/**
 * Lista rubricas (job roles) disponíveis para comparação
 * @param {number} companyId
 * @returns {Promise<Array<{id, title}>>}
 */
export async function listAvailableRubrics(companyId) {
  const sql = `
    SELECT id, title
    FROM job_roles
    WHERE company_id = $1
      AND active = TRUE
    ORDER BY title
  `;

  const result = await queryRead(sql, [companyId]);
  return result.rows.map(r => ({ id: r.id, title: r.title }));
}
