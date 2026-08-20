/**
 * Brief People para um candidato: Motivadores + hipóteses + 1:1.
 * Identidade = candidates.id (compartilhado com assessments e ae_attempts).
 */

import { asDb } from '../ae/as-db.js';
import { buildManagementHypotheses } from './management-hypotheses.js';
import { listOneOnOnes } from './one-on-ones.js';

/**
 * Última tentativa concluída de Motivadores para o candidato (mesma empresa).
 */
export async function loadLatestMotivatorsAttempt(dbOrQuery, { candidateId, companyId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT a.id, a.dimension_scores AS "dimensionScores", a.ranking,
            a.profile_summary AS "profileSummary",
            a.manager_recommendations AS "managerRecommendations",
            a.completed_at AS "completedAt", a.algorithm_version AS "algorithmVersion"
     FROM ae_attempts a
     WHERE a.candidate_id = $1
       AND a.company_id = $2
       AND a.status = 'completed'
       AND a.dimension_scores IS NOT NULL
     ORDER BY a.completed_at DESC NULLS LAST, a.id DESC
     LIMIT 1`,
    [candidateId, companyId]
  );
  return res.rowCount ? res.rows[0] : null;
}

/**
 * Assessment Eneagrama mais recente (scores) do candidato.
 */
export async function loadLatestEnneagramScores(dbOrQuery, { candidateId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT id, top_type AS "topType", scores, created_at AS "createdAt"
     FROM assessments
     WHERE candidate_id = $1 AND scores IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [candidateId]
  );
  return res.rowCount ? res.rows[0] : null;
}

/**
 * @param {{ query: Function } | Function} dbOrQuery
 * @param {{
 *   candidateId: string|number,
 *   companyId: string|number,
 *   isAdmin?: boolean,
 *   locale?: string,
 *   scores?: object|null,
 *   topType?: number|null,
 * }} opts
 */
export async function buildCandidatePeopleBrief(dbOrQuery, opts) {
  const {
    candidateId,
    companyId,
    isAdmin = false,
    locale = 'pt-BR',
    scores: scoresHint = null,
    topType: topTypeHint = null,
  } = opts;

  let enneagram = null;
  if (scoresHint) {
    enneagram = { scores: scoresHint, topType: topTypeHint };
  } else {
    enneagram = await loadLatestEnneagramScores(dbOrQuery, { candidateId });
  }

  const motivatorsAttempt = await loadLatestMotivatorsAttempt(dbOrQuery, {
    candidateId,
    companyId,
  });

  const hypotheses = buildManagementHypotheses({
    locale,
    scores: enneagram?.scores || null,
    topType: enneagram?.topType ?? topTypeHint,
    motivators: motivatorsAttempt
      ? {
          dimensionScores: motivatorsAttempt.dimensionScores,
          ranking: motivatorsAttempt.ranking,
          profileSummary: motivatorsAttempt.profileSummary,
        }
      : null,
  });

  let oneOnOnes = [];
  try {
    oneOnOnes = await listOneOnOnes(dbOrQuery, {
      candidateId,
      companyId,
      isAdmin,
    });
  } catch (err) {
    // Tabela ainda não migrada (42P01) — People parcial sem 1:1.
    if (err?.code !== '42P01') throw err;
  }

  return {
    motivatorsAttempt: motivatorsAttempt
      ? {
          id: motivatorsAttempt.id,
          completedAt: motivatorsAttempt.completedAt,
          profileSummary: motivatorsAttempt.profileSummary,
        }
      : null,
    management: hypotheses,
    oneOnOnes,
  };
}
