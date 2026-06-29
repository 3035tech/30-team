import { loadQuestionsForScoring } from './load-questions-for-scoring.js';
import { computeMotivatorScores } from './scoring.js';
import { resolveResultTextsFromDb } from './templates.js';
import { AE_SCORING_ENGINE_VERSION, normalizePgBigintArray } from './ae-id.js';
import { asDb } from './as-db.js';
import { bootstrapMotivators } from './bootstrap-motivators.js';
import { formatScoringFailure, summarizeScoringInput } from './scoring-diagnostics.js';

function maxScore(dimensionScores = {}) {
  const vals = Object.values(dimensionScores || {});
  return vals.length ? Math.max(...vals.map((v) => Number(v) || 0)) : 0;
}

function normalizeAnswersInput(answers) {
  if (Array.isArray(answers)) return answers;
  if (answers && typeof answers === 'object') return Object.values(answers);
  return [];
}

/**
 * Recalcula pontuação a partir de question_ids + answers já salvos.
 */
export async function rescoreAttemptData(dbOrQuery, { questionIds, answers, definitionId, locale = 'pt-BR', repairWeights = false }) {
  const db = asDb(dbOrQuery);
  const ids = normalizePgBigintArray(questionIds);
  const answerList = normalizeAnswersInput(answers);
  if (!ids.length) return { ok: false, error: 'Sessão sem perguntas.' };
  if (!answerList.length) return { ok: false, error: 'Respostas não salvas nesta tentativa.' };

  if (repairWeights) {
    await bootstrapMotivators(db, { repairWeights: true });
  }

  const questions = await loadQuestionsForScoring(db, ids);
  const diagnostics = summarizeScoringInput(questions, answerList);

  if (diagnostics.questionsLoaded === 0) {
    return {
      ok: false,
      error: `Nenhuma pergunta ativa encontrada para os ${ids.length} IDs desta sessão.`,
      diagnostics,
    };
  }

  const scored = computeMotivatorScores({ questions, answers: answerList });
  if (!scored.ok) {
    return { ...scored, diagnostics };
  }

  const failure = formatScoringFailure(scored, diagnostics);
  if (failure) {
    return { ok: false, error: failure, diagnostics, scored };
  }

  const texts = await resolveResultTextsFromDb(db, definitionId, scored, locale);
  return { ok: true, scored, texts, diagnostics };
}

/**
 * Recalcula e persiste tentativa quando scores salvos estão zerados ou motor desatualizado.
 */
export async function maybeRescoreAndPersist(dbOrQuery, attemptId, { locale = 'pt-BR', force = false } = {}) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT id, status, definition_id AS "definitionId", question_ids AS "questionIds",
            answers, dimension_scores AS "dimensionScores", algorithm_version AS "algorithmVersion"
     FROM ae_attempts WHERE id = $1 LIMIT 1`,
    [attemptId]
  );
  if (res.rowCount === 0) return { rescored: false, error: 'Tentativa não encontrada.' };

  const row = res.rows[0];
  if (row.status !== 'completed') return { rescored: false };

  const storedMax = maxScore(row.dimensionScores);
  const outdated = row.algorithmVersion !== AE_SCORING_ENGINE_VERSION;
  const shouldRescore = force || storedMax === 0 || outdated;
  if (!shouldRescore) return { rescored: false };

  const result = await rescoreAttemptData(db, {
    questionIds: row.questionIds,
    answers: row.answers,
    definitionId: row.definitionId,
    locale,
    repairWeights: true,
  });
  if (!result.ok) {
    return { rescored: false, error: result.error, diagnostics: result.diagnostics };
  }

  const newMax = maxScore(result.scored.dimensionScores);
  if (newMax === 0) {
    return { rescored: false, error: result.error || 'Não foi possível calcular scores (> 0).', diagnostics: result.diagnostics };
  }
  if (!force && storedMax > 0 && !outdated) return { rescored: false };

  await db.query(
    `UPDATE ae_attempts SET
       dimension_scores = $2::jsonb,
       ranking = $3::jsonb,
       profile_summary = $4,
       manager_recommendations = $5::jsonb,
       algorithm_version = $6
     WHERE id = $1`,
    [
      attemptId,
      JSON.stringify(result.scored.dimensionScores),
      JSON.stringify(result.scored.ranking),
      result.texts.profileSummary,
      JSON.stringify(result.texts.managerRecommendations),
      AE_SCORING_ENGINE_VERSION,
    ]
  );

  return { rescored: true, scored: result.scored, texts: result.texts, diagnostics: result.diagnostics };
}

export function buildDimensionRanking(dimensions, dimensionScores, ranking = []) {
  const rankIndex = new Map((ranking || []).map((key, i) => [key, i]));
  return (dimensions || [])
    .map((d) => ({
      key: d.key,
      label: d.label || d.key,
      color: d.color || '#7C3AED',
      score: Number(dimensionScores?.[d.key]) || 0,
    }))
    .sort((a, b) => {
      const diff = b.score - a.score;
      if (diff !== 0) return diff;
      const ai = rankIndex.get(a.key) ?? 999;
      const bi = rankIndex.get(b.key) ?? 999;
      if (ai !== bi) return ai - bi;
      return a.label.localeCompare(b.label);
    });
}
