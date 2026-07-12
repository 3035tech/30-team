import { isForcedChoice, isLikert, isRanking, usesOptions } from './normalize-question-type.js';

/** Resumo para debug quando o scoring falha ou retorna zeros. */
export function summarizeScoringInput(questions = [], answers = []) {
  const fc = questions.filter((q) => isForcedChoice(q));
  const rk = questions.filter((q) => isRanking(q));
  const lk = questions.filter((q) => isLikert(q));
  const unknown = questions.filter((q) => !isForcedChoice(q) && !isLikert(q) && !isRanking(q));

  const optionBased = questions.filter((q) => usesOptions(q));
  const fcNoOpts = optionBased.filter((q) => !(q.options || []).length);
  const fcNoWeights = optionBased.filter((q) =>
    (q.options || []).length > 0 && (q.options || []).every((o) => !Object.keys(o.weights || {}).length)
  );
  const lkNoWeights = lk.filter((q) => !Object.keys(q.dimensionWeights || {}).length);

  return {
    questionsLoaded: questions.length,
    answersCount: answers.length,
    forcedChoice: fc.length,
    ranking: rk.length,
    likert: lk.length,
    unknownType: unknown.length,
    unknownTypeSample: unknown.slice(0, 3).map((q) => ({ id: q.id, type: q.questionType || q.question_type })),
    fcWithoutOptions: fcNoOpts.length,
    fcWithoutWeights: fcNoWeights.length,
    likertWithoutWeights: lkNoWeights.length,
  };
}

export function formatScoringFailure(scored, diag) {
  if (!scored?.ok) return scored?.error || 'Unknown scoring error.';
  const max = Math.max(0, ...Object.values(scored.dimensionScores || {}));
  if (max > 0) return null;

  const parts = ['Normalized scores are zero after recalculation.'];
  if (diag.questionsLoaded === 0) parts.push('No questions loaded for the session IDs.');
  else if (diag.questionsLoaded !== diag.answersCount) {
    parts.push(`Questions loaded (${diag.questionsLoaded}) != answers (${diag.answersCount}).`);
  }
  if (diag.unknownType > 0) parts.push(`${diag.unknownType} question(s) with invalid type.`);
  if (diag.fcWithoutWeights > 0) parts.push(`${diag.fcWithoutWeights} forced choice question(s) without option weights.`);
  if (diag.likertWithoutWeights > 0) parts.push(`${diag.likertWithoutWeights} likert question(s) without weights.`);
  if (diag.fcWithoutOptions > 0) parts.push(`${diag.fcWithoutOptions} forced choice question(s) without options.`);

  const maxRaw = Math.max(0, ...Object.values(scored.rawScores || {}));
  if (maxRaw > 0) parts.push('Raw points > 0 but normalization resulted in 0 — check weights in the database.');
  else parts.push('Run Configuration -> Initialize module to repair weights.');

  return parts.join(' ');
}
