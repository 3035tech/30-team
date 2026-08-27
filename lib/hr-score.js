/**
 * HR Score — núcleo de inteligência comportamental (B-1001)
 * 
 * Consolida sinais existentes em score 0-100 por colaborador:
 * - Perfil T1-T9 (completude)
 * - Motivadores (retention score)
 * - Fit vs núcleo da empresa
 * - PDI (progresso)
 * - Check-ins (concern)
 * - Clima agregado
 * - Retention watch
 * 
 * Regras:
 * - Hedging: score é indicador, não diagnóstico
 * - Reutiliza funções existentes
 * - Sem hub paralelo, sem inventar analytics engine
 */

import { query, queryRead } from './db.js';
import { asDb } from './ae/as-db.js';
import { retentionWatchMinScore } from './people/retention-watch.js';
import { ERR } from './api-error-codes';
import {
  CLIMATE_SURVEY_STATUS,
  DEVELOPMENT_PLAN_ITEM_STATUS,
  DEVELOPMENT_PLAN_STATUS,
  EMPLOYMENT_STATUS,
} from './domain-status.js';

/**
 * Pesos dos sinais (total = 1.0)
 */
const SIGNAL_WEIGHTS = {
  profile: 0.15,     // Tem perfil T1-T9 completo
  motivators: 0.20,  // Score de retenção dos Motivadores
  fit: 0.15,         // Fit vs núcleo do time
  pdi: 0.20,         // Progresso do PDI
  checkins: 0.15,    // Outcomes dos check-ins
  climate: 0.10,     // Clima agregado da empresa
  retention: 0.05,   // Retention watch (inverso: quanto mais baixo, pior)
};

/**
 * Calcula score do sinal "perfil" (0-100)
 * Baseado na existência de assessment T1-T9
 */
async function calculateProfileScore(db, candidateId) {
  const res = await db.query(
    `SELECT top_type, secondary_type, created_at
     FROM assessments
     WHERE candidate_id = $1
       AND top_type IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [candidateId]
  );

  if (res.rowCount === 0) {
    return { score: 0, detail: 'no_assessment' };
  }

  const hasSecondary = res.rows[0].secondary_type != null;
  const ageMonths = Math.floor(
    (Date.now() - new Date(res.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Score base: 80 se tem assessment
  let score = 80;
  
  // +10 se tem tipo secundário
  if (hasSecondary) score += 10;
  
  // +10 se é recente (< 12 meses)
  if (ageMonths < 12) score += 10;

  return {
    score: Math.min(100, score),
    detail: { hasSecondary, ageMonths },
  };
}

/**
 * Calcula score do sinal "motivators" (0-100)
 * Baseado no retention score mais recente
 */
async function calculateMotivatorsScore(db, candidateId) {
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
    return { score: 50, detail: 'no_attempt' }; // Neutro se não tem
  }

  // retention_score já é 0-100
  const retentionScore = res.rows[0].retention_score;
  
  return {
    score: Math.max(0, Math.min(100, retentionScore)),
    detail: { retentionScore },
  };
}

/**
 * Calcula score do sinal "fit" (0-100)
 * Baseado no fit vs núcleo T1-T9 da empresa
 */
async function calculateFitScore(db, candidateId, companyId) {
  // Buscar núcleo da empresa (mix T1-T9)
  const nucleusRes = await db.query(
    `SELECT COUNT(DISTINCT a.candidate_id) as total,
            a.top_type,
            COUNT(*) as count
     FROM assessments a
     JOIN candidates c ON c.id = a.candidate_id AND c.company_id = $1
     WHERE a.top_type IS NOT NULL
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     GROUP BY a.top_type`,
    [companyId]
  );

  if (nucleusRes.rowCount === 0) {
    return { score: 50, detail: 'no_nucleus' }; // Neutro se empresa não tem núcleo
  }

  // Buscar tipo da pessoa
  const candidateRes = await db.query(
    `SELECT top_type FROM assessments WHERE candidate_id = $1 AND top_type IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
    [candidateId]
  );

  if (candidateRes.rowCount === 0) {
    return { score: 0, detail: 'no_type' };
  }

  const candidateType = candidateRes.rows[0].top_type;
  const nucleus = nucleusRes.rows.reduce((acc, row) => {
    acc[row.top_type] = parseInt(row.count);
    return acc;
  }, {});

  const totalEmployees = Object.values(nucleus).reduce((sum, count) => sum + count, 0);
  const candidateCount = nucleus[candidateType] || 0;
  const prevalence = totalEmployees > 0 ? (candidateCount / totalEmployees) : 0;

  // Score baseado na prevalência do tipo no núcleo
  // 0-10% = 60, 10-20% = 75, 20-30% = 85, 30%+ = 95
  let score = 50;
  if (prevalence >= 0.30) score = 95;
  else if (prevalence >= 0.20) score = 85;
  else if (prevalence >= 0.10) score = 75;
  else if (prevalence > 0) score = 60;

  return {
    score,
    detail: { candidateType, prevalence: Math.round(prevalence * 100) },
  };
}

/**
 * Calcula score do sinal "pdi" (0-100)
 * Baseado no progresso dos planos ativos
 */
async function calculatePdiScore(db, candidateId) {
  const res = await db.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status IN ('${DEVELOPMENT_PLAN_STATUS.ACTIVE}', '${DEVELOPMENT_PLAN_STATUS.DRAFT}')) as active_plans,
       COALESCE(SUM((SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id)), 0) as total_items,
       COALESCE(SUM((SELECT COUNT(*)::int FROM development_plan_items i WHERE i.plan_id = p.id AND i.status = '${DEVELOPMENT_PLAN_ITEM_STATUS.DONE}')), 0) as done_items
     FROM development_plans p
     WHERE p.candidate_id = $1`,
    [candidateId]
  );

  const activePlans = parseInt(res.rows[0].active_plans) || 0;
  const totalItems = parseInt(res.rows[0].total_items) || 0;
  const doneItems = parseInt(res.rows[0].done_items) || 0;

  if (activePlans === 0) {
    return { score: 70, detail: 'no_active_plans' }; // Sem plano não é penalização
  }

  if (totalItems === 0) {
    return { score: 60, detail: 'no_items' };
  }

  // Progresso: % de itens concluídos
  const progress = doneItems / totalItems;
  const score = 40 + Math.round(progress * 60); // 40-100

  return {
    score,
    detail: { activePlans, totalItems, doneItems, progress: Math.round(progress * 100) },
  };
}

/**
 * Calcula score do sinal "checkins" (0-100)
 * Baseado nos outcomes recentes
 */
async function calculateCheckinsScore(db, candidateId) {
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
    return { score: 70, detail: 'no_checkins' }; // Neutro se não tem
  }

  const concerns = res.rows.filter(r => r.outcome === 'concern').length;
  const develops = res.rows.filter(r => r.outcome === 'develop').length;
  const onTracks = res.rows.filter(r => r.outcome === 'on_track').length;

  // Scoring: on_track=100, develop=70, concern=40
  const totalScore = (onTracks * 100 + develops * 70 + concerns * 40);
  const score = Math.round(totalScore / res.rowCount);

  return {
    score,
    detail: { concerns, develops, onTracks, total: res.rowCount },
  };
}

/**
 * Calcula score do sinal "climate" (0-100)
 * Baseado no clima agregado da empresa
 */
async function calculateClimateScore(db, companyId) {
  const res = await db.query(
    `SELECT 
       AVG(
         (answer_data->>'score')::numeric
       ) as avg_score
     FROM climate_survey_answers a
     JOIN climate_surveys s ON s.id = a.survey_id AND s.company_id = $1
     WHERE s.status = '${CLIMATE_SURVEY_STATUS.CLOSED}'
       AND a.answer_data->>'score' IS NOT NULL
       AND s.opened_at > NOW() - INTERVAL '180 days'`,
    [companyId]
  );

  if (res.rowCount === 0 || res.rows[0].avg_score == null) {
    return { score: 70, detail: 'no_recent_climate' }; // Neutro
  }

  // Clima é escala 1-5, normalizar para 0-100
  const avgScore = parseFloat(res.rows[0].avg_score);
  const score = Math.round(((avgScore - 1) / 4) * 100); // 1→0, 5→100

  return {
    score: Math.max(0, Math.min(100, score)),
    detail: { avgScore: avgScore.toFixed(2) },
  };
}

/**
 * Calcula score do sinal "retention" (0-100)
 * Baseado na ausência de retention_watch recente
 */
async function calculateRetentionScore(db, candidateId) {
  const minScore = retentionWatchMinScore();
  
  const res = await db.query(
    `SELECT n.created_at, n.payload
     FROM manager_notifications n
     WHERE n.type = 'retention_watch'
       AND n.entity_id = $1
       AND n.created_at > NOW() - INTERVAL '30 days'
     ORDER BY n.created_at DESC
     LIMIT 1`,
    [candidateId]
  );

  if (res.rowCount === 0) {
    return { score: 100, detail: 'no_recent_watch' }; // Sem alerta = bom
  }

  // Tem alerta recente = score reduzido
  const daysAgo = Math.floor(
    (Date.now() - new Date(res.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Quanto mais recente, pior o score
  let score = 100 - (30 - daysAgo) * 2; // 30 dias atrás = 40, hoje = 100
  score = Math.max(30, Math.min(100, score));

  return {
    score,
    detail: { daysAgo, minScore },
  };
}

/**
 * Calcula HR Score consolidado 0-100 para um candidato
 * 
 * @param {number} candidateId 
 * @param {number} companyId 
 * @returns {Promise<{score: number, signals: object}>}
 */
export async function calculateHrScore(candidateId, companyId) {
  const db = asDb(query);

  // Calcular cada sinal
  const [profile, motivators, fit, pdi, checkins, climate, retention] = await Promise.all([
    calculateProfileScore(db, candidateId),
    calculateMotivatorsScore(db, candidateId),
    calculateFitScore(db, candidateId, companyId),
    calculatePdiScore(db, candidateId),
    calculateCheckinsScore(db, candidateId),
    calculateClimateScore(db, companyId),
    calculateRetentionScore(db, candidateId),
  ]);

  // Calcular score ponderado
  const weightedScore = 
    profile.score * SIGNAL_WEIGHTS.profile +
    motivators.score * SIGNAL_WEIGHTS.motivators +
    fit.score * SIGNAL_WEIGHTS.fit +
    pdi.score * SIGNAL_WEIGHTS.pdi +
    checkins.score * SIGNAL_WEIGHTS.checkins +
    climate.score * SIGNAL_WEIGHTS.climate +
    retention.score * SIGNAL_WEIGHTS.retention;

  const finalScore = Math.round(weightedScore);

  // Montar breakdown
  const signals = {
    profile: { score: profile.score, weight: SIGNAL_WEIGHTS.profile, detail: profile.detail },
    motivators: { score: motivators.score, weight: SIGNAL_WEIGHTS.motivators, detail: motivators.detail },
    fit: { score: fit.score, weight: SIGNAL_WEIGHTS.fit, detail: fit.detail },
    pdi: { score: pdi.score, weight: SIGNAL_WEIGHTS.pdi, detail: pdi.detail },
    checkins: { score: checkins.score, weight: SIGNAL_WEIGHTS.checkins, detail: checkins.detail },
    climate: { score: climate.score, weight: SIGNAL_WEIGHTS.climate, detail: climate.detail },
    retention: { score: retention.score, weight: SIGNAL_WEIGHTS.retention, detail: retention.detail },
  };

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    signals,
  };
}

/**
 * Salva (upsert) HR Score no banco
 */
export async function saveHrScore(candidateId, companyId, scoreData, predictions = {}) {
  await query(
    `INSERT INTO hr_scores (
       candidate_id, company_id, score, signals,
       turnover_risk, turnover_reasons, pdi_gap_areas,
       calculated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (candidate_id)
     DO UPDATE SET
       score = EXCLUDED.score,
       signals = EXCLUDED.signals,
       turnover_risk = EXCLUDED.turnover_risk,
       turnover_reasons = EXCLUDED.turnover_reasons,
       pdi_gap_areas = EXCLUDED.pdi_gap_areas,
       calculated_at = NOW()`,
    [
      candidateId,
      companyId,
      scoreData.score,
      JSON.stringify(scoreData.signals),
      predictions.turnover_risk || null,
      JSON.stringify(predictions.turnover_reasons || []),
      JSON.stringify(predictions.pdi_gap_areas || []),
    ]
  );
}

/**
 * Busca HR Score salvo (ou retorna null)
 */
export async function getHrScore(candidateId) {
  const res = await queryRead(
    `SELECT 
       id, candidate_id AS "candidateId", company_id AS "companyId",
       score, signals,
       turnover_risk AS "turnoverRisk",
       turnover_reasons AS "turnoverReasons",
       pdi_gap_areas AS "pdiGapAreas",
       calculated_at AS "calculatedAt"
     FROM hr_scores
     WHERE candidate_id = $1
     LIMIT 1`,
    [candidateId]
  );

  if (res.rowCount === 0) return null;

  return {
    ...res.rows[0],
    signals: res.rows[0].signals || {},
    turnoverReasons: res.rows[0].turnoverReasons || [],
    pdiGapAreas: res.rows[0].pdiGapAreas || [],
  };
}

/**
 * Recalcula scores de toda a empresa (batch)
 * Útil para cron ou trigger manual
 */
export async function recalculateCompanyScores(companyId, { limit = 100 } = {}) {
  const db = asDb(query);

  // Buscar todos os colaboradores ativos
  const res = await db.query(
    `SELECT id FROM candidates
     WHERE company_id = $1
       AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     LIMIT $2`,
    [companyId, limit]
  );

  const results = [];

  for (const row of res.rows) {
    try {
      const scoreData = await calculateHrScore(row.id, companyId);
      // Predições serão calculadas em lib/hr-predictions.js
      await saveHrScore(row.id, companyId, scoreData);
      results.push({ candidateId: row.id, score: scoreData.score, ok: true });
    } catch (err) {
      console.error(`[hr-score] Error calculating for candidate ${row.id}:`, err);
      results.push({ candidateId: row.id, ok: false, error: err.message });
    }
  }

  return { processed: results.length, results };
}

/**
 * Rollup de scores por área
 * Note: candidates has no `area` column yet — returns [] until modeled.
 */
export async function getCompanyScoresByArea(companyId) {
  void companyId;
  return [];
}

/**
 * Full company HR Score dashboard payload (company + overall + top/bottom).
 */
export async function getCompanyHrScoreRollup(companyId) {
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }

  const companyRes = await queryRead(
    `SELECT id, name FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`,
    [cid]
  );
  if (companyRes.rowCount === 0) {
    return { ok: false, errorCode: ERR.COMPANY_NOT_FOUND };
  }

  const overallRes = await queryRead(
    `SELECT
       COUNT(h.id)::int AS total,
       ROUND(AVG(h.score))::int AS avg_score,
       MIN(h.score)::int AS min_score,
       MAX(h.score)::int AS max_score
     FROM hr_scores h
     JOIN candidates c ON c.id = h.candidate_id
     WHERE h.company_id = $1
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'`,
    [cid]
  );

  const performerSelect = `
    SELECT
      c.id, c.full_name AS "fullName",
      h.score, h.turnover_risk AS "turnoverRisk"
    FROM hr_scores h
    JOIN candidates c ON c.id = h.candidate_id
    WHERE h.company_id = $1
      AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'`;

  const [topRes, bottomRes, byArea] = await Promise.all([
    queryRead(`${performerSelect} ORDER BY h.score DESC NULLS LAST LIMIT 5`, [cid]),
    queryRead(`${performerSelect} ORDER BY h.score ASC NULLS LAST LIMIT 5`, [cid]),
    getCompanyScoresByArea(cid),
  ]);

  const row = overallRes.rows[0] || {};
  return {
    ok: true,
    company: { id: companyRes.rows[0].id, name: companyRes.rows[0].name },
    overall: {
      total: Number(row.total) || 0,
      avgScore: Number(row.avg_score) || 0,
      minScore: Number(row.min_score) || 0,
      maxScore: Number(row.max_score) || 0,
    },
    byArea,
    topPerformers: topRes.rows,
    bottomPerformers: bottomRes.rows,
  };
}


