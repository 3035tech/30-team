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

import { query, queryRead } from './db.js';
import { asDb } from './ae/as-db.js';
import { retentionWatchMinScore } from './people/retention-watch.js';

/**
 * Pesos dos sinais no radar (total = 1.0)
 * Mais focado em turnover do que o HR Score geral
 */
const RADAR_WEIGHTS = {
  climate: 0.30,      // Clima baixo ou em queda
  motivators: 0.30,   // Retention score Motivadores
  pdi: 0.25,          // PDI atrasado ou concern
  checkins: 0.15,     // Check-ins com concern
};

/**
 * Thresholds de risco
 */
const RISK_THRESHOLDS = {
  high: 60,    // >= 60 = high risk
  medium: 40,  // 40-59 = medium risk
  low: 0,      // < 40 = low risk
};

/**
 * Calcula score de clima individual (ou usa empresa se não houver pessoal)
 */
async function calculateClimateSignal(db, candidateId, companyId) {
  // Tentar buscar respostas individuais do colaborador
  const personalRes = await db.query(
    `SELECT AVG((answer_data->>'score')::numeric) as avg_score
     FROM climate_survey_answers a
     JOIN climate_surveys s ON s.id = a.survey_id
     WHERE s.company_id = $1
       AND a.candidate_id = $2
       AND s.status = 'closed'
       AND a.answer_data->>'score' IS NOT NULL
       AND s.opened_at > NOW() - INTERVAL '180 days'`,
    [companyId, candidateId]
  );

  if (personalRes.rowCount > 0 && personalRes.rows[0].avg_score != null) {
    const avgScore = parseFloat(personalRes.rows[0].avg_score);
    const normalized = Math.round(((avgScore - 1) / 4) * 100); // 1-5 → 0-100
    return {
      score: 100 - normalized, // Inverter: quanto menor o clima, maior o risco
      source: 'personal',
      detail: { avgScore: avgScore.toFixed(2) },
    };
  }

  // Fallback: clima da empresa
  const companyRes = await db.query(
    `SELECT AVG((answer_data->>'score')::numeric) as avg_score
     FROM climate_survey_answers a
     JOIN climate_surveys s ON s.id = a.survey_id
     WHERE s.company_id = $1
       AND s.status = 'closed'
       AND a.answer_data->>'score' IS NOT NULL
       AND s.opened_at > NOW() - INTERVAL '180 days'`,
    [companyId]
  );

  if (companyRes.rowCount === 0 || companyRes.rows[0].avg_score == null) {
    return { score: 30, source: 'none', detail: {} }; // Neutro baixo se não tem
  }

  const avgScore = parseFloat(companyRes.rows[0].avg_score);
  const normalized = Math.round(((avgScore - 1) / 4) * 100);
  
  return {
    score: 100 - normalized,
    source: 'company',
    detail: { avgScore: avgScore.toFixed(2) },
  };
}

/**
 * Calcula score de retention Motivadores
 */
async function calculateMotivatorsSignal(db, candidateId) {
  const res = await db.query(
    `SELECT retention_score, completed_at
     FROM ae_attempts
     WHERE candidate_id = $1
       AND status = 'completed'
       AND retention_score IS NOT NULL
     ORDER BY completed_at DESC
     LIMIT 1`,
    [candidateId]
  );

  if (res.rowCount === 0) {
    return { score: 30, source: 'none', detail: {} };
  }

  const retentionScore = res.rows[0].retention_score;
  const minScore = retentionWatchMinScore();
  
  // Inverter: quanto menor o retention score, maior o risco
  return {
    score: 100 - retentionScore,
    source: 'motivators',
    detail: { retentionScore, minScore, belowThreshold: retentionScore < minScore },
  };
}

/**
 * Calcula score de PDI (concern/atraso)
 */
async function calculatePdiSignal(db, candidateId) {
  const res = await db.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'active') as active_plans,
       COALESCE(SUM((SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id AND i.status = 'todo')), 0) as todo_items,
       COALESCE(SUM((SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id AND i.status = 'done')), 0) as done_items
     FROM development_plans p
     WHERE p.candidate_id = $1`,
    [candidateId]
  );

  const activePlans = parseInt(res.rows[0].active_plans) || 0;
  const todoItems = parseInt(res.rows[0].todo_items) || 0;
  const doneItems = parseInt(res.rows[0].done_items) || 0;

  if (activePlans === 0) {
    return { score: 20, source: 'none', detail: {} }; // Sem plano = baixo risco por esse sinal
  }

  const totalItems = todoItems + doneItems;
  if (totalItems === 0) {
    return { score: 40, source: 'empty', detail: {} };
  }

  // Quanto mais atrasado (menos feito), maior o risco
  const progress = doneItems / totalItems;
  const riskScore = Math.round((1 - progress) * 100); // 0% feito = 100 risco, 100% feito = 0 risco

  return {
    score: riskScore,
    source: 'pdi',
    detail: { activePlans, todoItems, doneItems, progress: Math.round(progress * 100) },
  };
}

/**
 * Calcula score de check-ins (concern)
 */
async function calculateCheckinsSignal(db, candidateId) {
  const res = await db.query(
    `SELECT outcome, completed_at
     FROM onboarding_checkins
     WHERE candidate_id = $1
       AND completed_at IS NOT NULL
     ORDER BY milestone_days DESC
     LIMIT 3`,
    [candidateId]
  );

  if (res.rowCount === 0) {
    return { score: 20, source: 'none', detail: {} };
  }

  const concerns = res.rows.filter(r => r.outcome === 'concern').length;
  const develops = res.rows.filter(r => r.outcome === 'develop').length;
  const onTracks = res.rows.filter(r => r.outcome === 'on_track').length;

  // Quanto mais concerns, maior o risco
  const riskScore = Math.round((concerns * 100 + develops * 50 + onTracks * 0) / res.rowCount);

  return {
    score: riskScore,
    source: 'checkins',
    detail: { concerns, develops, onTracks, total: res.rowCount },
  };
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

  // Score ponderado (quanto maior, maior o risco)
  const riskScore = Math.round(
    climate.score * RADAR_WEIGHTS.climate +
    motivators.score * RADAR_WEIGHTS.motivators +
    pdi.score * RADAR_WEIGHTS.pdi +
    checkins.score * RADAR_WEIGHTS.checkins
  );

  // Classificar risco
  let risk = 'low';
  if (riskScore >= RISK_THRESHOLDS.high) risk = 'high';
  else if (riskScore >= RISK_THRESHOLDS.medium) risk = 'medium';

  // Ações sugeridas baseadas nos sinais
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

/**
 * Lista colaboradores em risco de rotatividade (medium + high)
 * 
 * @param {number} companyId 
 * @param {object} options 
 * @returns {Promise<Array>}
 */
export async function getCompanyTurnoverRisks(companyId, { limit = 20, minRisk = 'medium' } = {}) {
  const db = asDb(queryRead);

  // Buscar colaboradores ativos
  const candidatesRes = await db.query(
    `SELECT id, full_name AS "fullName", area, email
     FROM candidates
     WHERE company_id = $1
       AND employee = TRUE
       AND deleted = FALSE
     LIMIT $2`,
    [companyId, Math.min(limit, 100)]
  );

  const results = [];

  for (const candidate of candidatesRes.rows) {
    const radar = await calculateTurnoverRadar(candidate.id, companyId);
    
    if (
      (minRisk === 'high' && radar.risk === 'high') ||
      (minRisk === 'medium' && (radar.risk === 'high' || radar.risk === 'medium')) ||
      minRisk === 'low'
    ) {
      results.push({
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        area: candidate.area,
        email: candidate.email,
        riskScore: radar.riskScore,
        risk: radar.risk,
        signals: radar.signals,
        actions: radar.actions,
      });
    }
  }

  // Ordenar por risco (maior primeiro)
  results.sort((a, b) => b.riskScore - a.riskScore);

  return results;
}

/**
 * Detecta mudança de tendência (para notificações)
 * Compara radar atual com histórico de HR Score
 */
export async function detectTrendChange(candidateId) {
  const db = asDb(queryRead);

  // Buscar turnover risk anterior do HR Score
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
  
  // Calcular radar atual
  const candidateRes = await db.query(
    `SELECT company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );

  if (candidateRes.rowCount === 0) {
    return { trend: 'unknown', previous };
  }

  const radar = await calculateTurnoverRadar(candidateId, candidateRes.rows[0].companyId);
  const current = radar.risk;

  // Detectar piora
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
