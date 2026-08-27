/**
 * Turnover Radar — monitoramento multi-sinal de risco de rotatividade (B-1002)
 *
 * Complementa HR Score (B-1001) com foco específico em turnover:
 * - Clima (queda ou score baixo)
 * - Retention Motivadores (score abaixo de threshold)
 * - PDI concern/atraso
 * - Check-ins concern
 *
 * Diferença do HR Score:
 * - Apenas sinais críticos de turnover (não engajamento geral)
 * - Detecção de tendência (piora recente)
 * - Gatilho para notificações proativas
 */

import { queryRead } from './db.js';
import { asDb } from './ae/as-db.js';
import { retentionWatchMinScore } from './people/retention-watch.js';
import {
  CLIMATE_SURVEY_STATUS,
  DEVELOPMENT_PLAN_ITEM_STATUS,
  DEVELOPMENT_PLAN_STATUS,
  EMPLOYMENT_STATUS,
} from './domain-status.js';

/**
 * Pesos dos sinais no radar (total = 1.0)
 * Mais focado em turnover do que o HR Score geral
 */
const RADAR_WEIGHTS = {
  climate: 0.30, // Clima baixo ou em queda
  motivators: 0.30, // Retention score Motivadores
  pdi: 0.25, // PDI atrasado ou concern
  checkins: 0.15, // Check-ins com concern
};

/**
 * Thresholds de risco
 */
const RISK_THRESHOLDS = {
  high: 60, // >= 60 = high risk
  medium: 40, // 40-59 = medium risk
  low: 0, // < 40 = low risk
};

const EMPLOYEE_SCAN_CAP = 100;

function climateFromAvg(avgScore, source) {
  const normalized = Math.round(((avgScore - 1) / 4) * 100); // 1-5 → 0-100
  return {
    score: 100 - normalized, // Inverter: quanto menor o clima, maior o risco
    source,
    detail: { avgScore: avgScore.toFixed(2) },
  };
}

function climateNone() {
  return { score: 30, source: 'none', detail: {} };
}

/** Retention-sensitive Motivators dims (same set as management-hypotheses). */
const RETENTION_DIM_KEYS = ['financeiro', 'equilibrio', 'reconhecimento', 'seguranca'];

function motivatorsFromDimensionScores(dimensionScores) {
  if (!dimensionScores || typeof dimensionScores !== 'object') {
    return { score: 30, source: 'none', detail: {} };
  }
  const minScore = retentionWatchMinScore();
  let retentionScore = 0;
  for (const key of RETENTION_DIM_KEYS) {
    const v = Number(dimensionScores[key]);
    if (Number.isFinite(v)) retentionScore = Math.max(retentionScore, v);
  }
  if (retentionScore <= 0) {
    return { score: 30, source: 'none', detail: {} };
  }
  // High retention-dim score = watch signal → elevate turnover risk
  return {
    score: Math.round(Math.max(0, Math.min(100, retentionScore))),
    source: 'motivators',
    detail: {
      retentionScore,
      minScore,
      belowThreshold: retentionScore < minScore,
      watch: retentionScore >= minScore,
    },
  };
}

function pdiFromCounts(activePlans, todoItems, doneItems) {
  if (activePlans === 0) {
    return { score: 20, source: 'none', detail: {} };
  }
  const totalItems = todoItems + doneItems;
  if (totalItems === 0) {
    return { score: 40, source: 'empty', detail: {} };
  }
  const progress = doneItems / totalItems;
  const riskScore = Math.round((1 - progress) * 100);
  return {
    score: riskScore,
    source: 'pdi',
    detail: { activePlans, todoItems, doneItems, progress: Math.round(progress * 100) },
  };
}

function checkinsFromRows(rows) {
  if (!rows || rows.length === 0) {
    return { score: 20, source: 'none', detail: {} };
  }
  const concerns = rows.filter((r) => r.outcome === 'concern').length;
  const develops = rows.filter((r) => r.outcome === 'develop').length;
  const onTracks = rows.filter((r) => r.outcome === 'on_track' || r.outcome === 'continue').length;
  const riskScore = Math.round((concerns * 100 + develops * 50 + onTracks * 0) / rows.length);
  return {
    score: riskScore,
    source: 'checkins',
    detail: { concerns, develops, onTracks, total: rows.length },
  };
}

function assembleRadar(climate, motivators, pdi, checkins) {
  const riskScore = Math.round(
    climate.score * RADAR_WEIGHTS.climate +
      motivators.score * RADAR_WEIGHTS.motivators +
      pdi.score * RADAR_WEIGHTS.pdi +
      checkins.score * RADAR_WEIGHTS.checkins
  );

  let risk = 'low';
  if (riskScore >= RISK_THRESHOLDS.high) risk = 'high';
  else if (riskScore >= RISK_THRESHOLDS.medium) risk = 'medium';

  const actions = [];
  if (climate.score > 60) actions.push('review_climate');
  if (motivators.score > 60) actions.push('motivators_interview');
  if (pdi.score > 60) actions.push('accelerate_pdi');
  if (checkins.score > 60) actions.push('schedule_one_on_one');

  return {
    riskScore: Math.min(100, riskScore),
    risk,
    signals: {
      climate: { ...climate, weight: RADAR_WEIGHTS.climate },
      motivators: { ...motivators, weight: RADAR_WEIGHTS.motivators },
      pdi: { ...pdi, weight: RADAR_WEIGHTS.pdi },
      checkins: { ...checkins, weight: RADAR_WEIGHTS.checkins },
    },
    actions,
  };
}

/** Climate aggregate tables may lag B-1002 SQL; missing relation → neutral signal. */
async function queryClimateOrNull(db, sql, params) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return null;
    throw err;
  }
}

/**
 * Calcula score de clima individual (ou usa empresa se não houver pessoal)
 */
async function calculateClimateSignal(db, candidateId, companyId) {
  const personalRes = await queryClimateOrNull(
    db,
    `SELECT AVG((answer_data->>'score')::numeric) as avg_score
     FROM climate_survey_answers a
     JOIN climate_surveys s ON s.id = a.survey_id
     WHERE s.company_id = $1
       AND a.candidate_id = $2
       AND s.status = '${CLIMATE_SURVEY_STATUS.CLOSED}'
       AND a.answer_data->>'score' IS NOT NULL
       AND s.opened_at > NOW() - INTERVAL '180 days'`,
    [companyId, candidateId]
  );

  if (personalRes && personalRes.rowCount > 0 && personalRes.rows[0].avg_score != null) {
    return climateFromAvg(parseFloat(personalRes.rows[0].avg_score), 'personal');
  }

  const companyRes = await queryClimateOrNull(
    db,
    `SELECT AVG((answer_data->>'score')::numeric) as avg_score
     FROM climate_survey_answers a
     JOIN climate_surveys s ON s.id = a.survey_id
     WHERE s.company_id = $1
       AND s.status = '${CLIMATE_SURVEY_STATUS.CLOSED}'
       AND a.answer_data->>'score' IS NOT NULL
       AND s.opened_at > NOW() - INTERVAL '180 days'`,
    [companyId]
  );

  if (!companyRes || companyRes.rowCount === 0 || companyRes.rows[0].avg_score == null) {
    return climateNone();
  }

  return climateFromAvg(parseFloat(companyRes.rows[0].avg_score), 'company');
}

/**
 * Calcula score de retention Motivadores
 */
async function calculateMotivatorsSignal(db, candidateId) {
  const res = await db.query(
    `SELECT dimension_scores, completed_at
     FROM ae_attempts
     WHERE candidate_id = $1
       AND status = 'completed'
       AND dimension_scores IS NOT NULL
     ORDER BY completed_at DESC
     LIMIT 1`,
    [candidateId]
  );

  return motivatorsFromDimensionScores(res.rowCount === 0 ? null : res.rows[0].dimension_scores);
}

/**
 * Calcula score de PDI (concern/atraso)
 */
async function calculatePdiSignal(db, candidateId) {
  const res = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = '${DEVELOPMENT_PLAN_STATUS.ACTIVE}') as active_plans,
       COALESCE(SUM((SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id AND i.status = '${DEVELOPMENT_PLAN_ITEM_STATUS.TODO}')), 0) as todo_items,
       COALESCE(SUM((SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id AND i.status = '${DEVELOPMENT_PLAN_ITEM_STATUS.DONE}')), 0) as done_items
     FROM development_plans p
     WHERE p.candidate_id = $1`,
    [candidateId]
  );

  const activePlans = parseInt(res.rows[0].active_plans, 10) || 0;
  const todoItems = parseInt(res.rows[0].todo_items, 10) || 0;
  const doneItems = parseInt(res.rows[0].done_items, 10) || 0;
  return pdiFromCounts(activePlans, todoItems, doneItems);
}

/**
 * Calcula score de check-ins (concern)
 */
async function calculateCheckinsSignal(db, candidateId) {
  const res = await db.query(
    `SELECT outcome, completed_at
     FROM employee_onboarding_checkins
     WHERE candidate_id = $1
       AND completed_at IS NOT NULL
     ORDER BY milestone_days DESC
     LIMIT 3`,
    [candidateId]
  );

  return checkinsFromRows(res.rows);
}

/**
 * Calcula o radar de turnover para um colaborador
 *
 * @param {number} candidateId
 * @param {number} companyId
 * @returns {Promise<{riskScore: number, risk: string, signals: object, actions: string[]}>}
 */
export async function calculateTurnoverRadar(candidateId, companyId) {
  const db = asDb(queryRead);

  const [climate, motivators, pdi, checkins] = await Promise.all([
    calculateClimateSignal(db, candidateId, companyId),
    calculateMotivatorsSignal(db, candidateId),
    calculatePdiSignal(db, candidateId),
    calculateCheckinsSignal(db, candidateId),
  ]);

  return assembleRadar(climate, motivators, pdi, checkins);
}

function matchesMinRisk(risk, minRisk) {
  if (minRisk === 'high') return risk === 'high';
  if (minRisk === 'medium') return risk === 'high' || risk === 'medium';
  return true; // 'low' or anything else → include all
}

/**
 * Lista colaboradores em risco de rotatividade (medium + high)
 *
 * Batch: few queries with IN / GROUP BY (not per-employee calculateTurnoverRadar).
 *
 * @param {number} companyId
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getCompanyTurnoverRisks(companyId, { limit = 20, minRisk = 'medium' } = {}) {
  const db = asDb(queryRead);
  const resultLimit = Math.min(Math.max(1, Number(limit) || 20), EMPLOYEE_SCAN_CAP);

  // candidates has no `deleted` column; employment_status is the employee flag
  const candidatesRes = await db.query(
    `SELECT id, full_name AS "fullName", NULL::text AS area, email
     FROM candidates
     WHERE company_id = $1
       AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     ORDER BY id
     LIMIT $2`,
    [companyId, EMPLOYEE_SCAN_CAP]
  );

  if (candidatesRes.rowCount === 0) return [];

  const candidates = candidatesRes.rows;
  const ids = candidates.map((c) => c.id);

  const [personalClimateRes, companyClimateRes, motivatorsRes, pdiRes, checkinsRes] =
    await Promise.all([
      queryClimateOrNull(
        db,
        `SELECT a.candidate_id AS "candidateId",
                AVG((a.answer_data->>'score')::numeric) AS avg_score
         FROM climate_survey_answers a
         JOIN climate_surveys s ON s.id = a.survey_id
         WHERE s.company_id = $1
           AND a.candidate_id = ANY($2::bigint[])
           AND s.status = '${CLIMATE_SURVEY_STATUS.CLOSED}'
           AND a.answer_data->>'score' IS NOT NULL
           AND s.opened_at > NOW() - INTERVAL '180 days'
         GROUP BY a.candidate_id`,
        [companyId, ids]
      ),
      queryClimateOrNull(
        db,
        `SELECT AVG((answer_data->>'score')::numeric) AS avg_score
         FROM climate_survey_answers a
         JOIN climate_surveys s ON s.id = a.survey_id
         WHERE s.company_id = $1
           AND s.status = '${CLIMATE_SURVEY_STATUS.CLOSED}'
           AND a.answer_data->>'score' IS NOT NULL
           AND s.opened_at > NOW() - INTERVAL '180 days'`,
        [companyId]
      ),
      db.query(
        `SELECT DISTINCT ON (candidate_id)
           candidate_id AS "candidateId",
           dimension_scores AS "dimensionScores",
           completed_at
         FROM ae_attempts
         WHERE candidate_id = ANY($1::bigint[])
           AND status = 'completed'
           AND dimension_scores IS NOT NULL
         ORDER BY candidate_id, completed_at DESC`,
        [ids]
      ),
      db.query(
        `SELECT
           p.candidate_id AS "candidateId",
           COUNT(*) FILTER (WHERE p.status = '${DEVELOPMENT_PLAN_STATUS.ACTIVE}')::int AS active_plans,
           COUNT(i.id) FILTER (WHERE i.status = '${DEVELOPMENT_PLAN_ITEM_STATUS.TODO}')::int AS todo_items,
           COUNT(i.id) FILTER (WHERE i.status = '${DEVELOPMENT_PLAN_ITEM_STATUS.DONE}')::int AS done_items
         FROM development_plans p
         LEFT JOIN development_plan_items i ON i.plan_id = p.id
         WHERE p.candidate_id = ANY($1::bigint[])
         GROUP BY p.candidate_id`,
        [ids]
      ),
      db.query(
        `SELECT candidate_id AS "candidateId", outcome, completed_at, milestone_days
         FROM (
           SELECT candidate_id, outcome, completed_at, milestone_days,
                  ROW_NUMBER() OVER (
                    PARTITION BY candidate_id
                    ORDER BY milestone_days DESC
                  ) AS rn
           FROM employee_onboarding_checkins
           WHERE candidate_id = ANY($1::bigint[])
             AND completed_at IS NOT NULL
         ) ranked
         WHERE rn <= 3
         ORDER BY candidate_id, milestone_days DESC`,
        [ids]
      ),
    ]);

  const personalClimateById = new Map();
  if (personalClimateRes) {
    for (const row of personalClimateRes.rows) {
      if (row.avg_score != null) {
        personalClimateById.set(Number(row.candidateId), parseFloat(row.avg_score));
      }
    }
  }

  const companyAvg =
    companyClimateRes &&
    companyClimateRes.rowCount > 0 &&
    companyClimateRes.rows[0].avg_score != null
      ? parseFloat(companyClimateRes.rows[0].avg_score)
      : null;

  const motivatorsById = new Map();
  for (const row of motivatorsRes.rows) {
    motivatorsById.set(Number(row.candidateId), row.dimensionScores);
  }

  const pdiById = new Map();
  for (const row of pdiRes.rows) {
    pdiById.set(Number(row.candidateId), row);
  }

  const checkinsById = new Map();
  for (const row of checkinsRes.rows) {
    const cid = Number(row.candidateId);
    if (!checkinsById.has(cid)) checkinsById.set(cid, []);
    checkinsById.get(cid).push(row);
  }

  const results = [];

  for (const candidate of candidates) {
    const cid = Number(candidate.id);
    let climate;
    if (personalClimateById.has(cid)) {
      climate = climateFromAvg(personalClimateById.get(cid), 'personal');
    } else if (companyAvg != null) {
      climate = climateFromAvg(companyAvg, 'company');
    } else {
      climate = climateNone();
    }

    const pdiRow = pdiById.get(cid);
    const radar = assembleRadar(
      climate,
      motivatorsFromDimensionScores(motivatorsById.get(cid) || null),
      pdiFromCounts(
        pdiRow ? parseInt(pdiRow.active_plans, 10) || 0 : 0,
        pdiRow ? parseInt(pdiRow.todo_items, 10) || 0 : 0,
        pdiRow ? parseInt(pdiRow.done_items, 10) || 0 : 0
      ),
      checkinsFromRows(checkinsById.get(cid) || [])
    );

    if (!matchesMinRisk(radar.risk, minRisk)) continue;

    results.push({
      candidateId: cid,
      candidateName: candidate.fullName,
      area: candidate.area,
      email: candidate.email,
      riskScore: radar.riskScore,
      risk: radar.risk,
      signals: radar.signals,
      actions: radar.actions,
    });
  }

  results.sort((a, b) => b.riskScore - a.riskScore);
  return results.slice(0, resultLimit);
}

/**
 * Detecta mudança de tendência (para notificações)
 * Compara radar atual com histórico de HR Score
 */
export async function detectTrendChange(candidateId) {
  const db = asDb(queryRead);

  const previousRes = await db.query(
    `SELECT turnover_risk AS "turnoverRisk", calculated_at AS "calculatedAt"
     FROM hr_scores
     WHERE candidate_id = $1
     LIMIT 1`,
    [candidateId]
  );

  if (previousRes.rowCount === 0) {
    return { trend: 'new', previous: null };
  }

  const previous = previousRes.rows[0].turnoverRisk;

  const candidateRes = await db.query(
    `SELECT company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );

  if (candidateRes.rowCount === 0) {
    return { trend: 'unknown', previous };
  }

  const radar = await calculateTurnoverRadar(candidateId, candidateRes.rows[0].companyId);
  const current = radar.risk;

  const riskLevels = { low: 0, medium: 1, high: 2 };
  const previousLevel = riskLevels[previous] || 0;
  const currentLevel = riskLevels[current];

  if (currentLevel > previousLevel) {
    return { trend: 'worsening', previous, current, radar };
  }

  if (currentLevel < previousLevel) {
    return { trend: 'improving', previous, current, radar };
  }

  return { trend: 'stable', previous, current, radar };
}
