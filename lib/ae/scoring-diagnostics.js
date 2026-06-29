import { isForcedChoice, isLikert } from './normalize-question-type.js';

/** Resumo para debug quando o scoring falha ou retorna zeros. */
export function summarizeScoringInput(questions = [], answers = []) {
  const fc = questions.filter((q) => isForcedChoice(q));
  const lk = questions.filter((q) => isLikert(q));
  const unknown = questions.filter((q) => !isForcedChoice(q) && !isLikert(q));

  const fcNoOpts = fc.filter((q) => !(q.options || []).length);
  const fcNoWeights = fc.filter((q) =>
    (q.options || []).length > 0 && (q.options || []).every((o) => !Object.keys(o.weights || {}).length)
  );
  const lkNoWeights = lk.filter((q) => !Object.keys(q.dimensionWeights || {}).length);

  return {
    questionsLoaded: questions.length,
    answersCount: answers.length,
    forcedChoice: fc.length,
    likert: lk.length,
    unknownType: unknown.length,
    unknownTypeSample: unknown.slice(0, 3).map((q) => ({ id: q.id, type: q.questionType || q.question_type })),
    fcWithoutOptions: fcNoOpts.length,
    fcWithoutWeights: fcNoWeights.length,
    likertWithoutWeights: lkNoWeights.length,
  };
}

export function formatScoringFailure(scored, diag) {
  if (!scored?.ok) return scored?.error || 'Erro desconhecido no scoring.';
  const max = Math.max(0, ...Object.values(scored.dimensionScores || {}));
  if (max > 0) return null;

  const parts = ['Scores normalizados zerados após recálculo.'];
  if (diag.questionsLoaded === 0) parts.push('Nenhuma pergunta carregada para os IDs da sessão.');
  else if (diag.questionsLoaded !== diag.answersCount) {
    parts.push(`Perguntas carregadas (${diag.questionsLoaded}) ≠ respostas (${diag.answersCount}).`);
  }
  if (diag.unknownType > 0) parts.push(`${diag.unknownType} pergunta(s) com tipo inválido.`);
  if (diag.fcWithoutWeights > 0) parts.push(`${diag.fcWithoutWeights} forced choice sem pesos nas opções.`);
  if (diag.likertWithoutWeights > 0) parts.push(`${diag.likertWithoutWeights} likert sem pesos.`);
  if (diag.fcWithoutOptions > 0) parts.push(`${diag.fcWithoutOptions} forced choice sem opções.`);

  const maxRaw = Math.max(0, ...Object.values(scored.rawScores || {}));
  if (maxRaw > 0) parts.push('Pontos brutos > 0 mas normalização resultou em 0 — verifique pesos no banco.');
  else parts.push('Execute Configuração → Inicializar módulo para reparar pesos.');

  return parts.join(' ');
}
