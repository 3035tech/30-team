/**
 * Brief People para um candidato: Motivadores + hipóteses + 1:1.
 * Identidade = candidates.id (compartilhado com assessments e ae_attempts).
 */

import { asDb } from '../ae/as-db.js';
import { buildManagementHypotheses } from './management-hypotheses.js';
import { buildDecisionBrief } from './decision-brief.js';
import { listOneOnOnes } from './one-on-ones.js';

/** Cap de colegas para dicas de time no briefing (evita N² sem bound). */
const TEAM_HINT_COLLEAGUES_CAP = 40;

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
 * Colegas da mesma empresa com Eneagrama (para dicas de sinergia/tensão no briefing).
 * Uma query, LIMIT — sem N+1.
 */
export async function loadColleagueTypesForBrief(dbOrQuery, { companyId, excludeCandidateId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `WITH latest AS (
       SELECT DISTINCT ON (candidate_id)
         candidate_id, top_type, created_at
       FROM assessments
       WHERE scores IS NOT NULL AND top_type IS NOT NULL
       ORDER BY candidate_id, created_at DESC NULLS LAST, id DESC
     )
     SELECT c.id, c.full_name AS name, l.top_type AS "topType"
     FROM latest l
     JOIN candidates c ON c.id = l.candidate_id
     WHERE c.company_id = $1
       AND c.id <> $2
     ORDER BY l.created_at DESC NULLS LAST
     LIMIT $3`,
    [companyId, excludeCandidateId, TEAM_HINT_COLLEAGUES_CAP]
  );
  return (res.rows || [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      topType: Number(r.topType),
    }))
    .filter((r) => Number.isInteger(r.topType) && r.topType >= 1 && r.topType <= 9);
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

  let colleagues = [];
  try {
    colleagues = await loadColleagueTypesForBrief(dbOrQuery, {
      companyId,
      excludeCandidateId: candidateId,
    });
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  const decisionBrief = buildDecisionBrief({
    locale,
    scores: enneagram?.scores || null,
    topType: enneagram?.topType ?? topTypeHint,
    management: hypotheses,
    colleagues,
    selfId: candidateId,
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
    decisionBrief,
    oneOnOnes,
  };
}
