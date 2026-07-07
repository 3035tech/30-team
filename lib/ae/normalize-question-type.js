/** Normaliza question_type do banco para comparação estável. */
export function normalizeQuestionType(value) {
  const raw = value?.questionType ?? value?.question_type ?? value ?? '';
  return String(raw).trim().toLowerCase();
}

export function isForcedChoice(value) {
  return normalizeQuestionType(value) === 'forced_choice';
}

export function isLikert(value) {
  return normalizeQuestionType(value) === 'likert';
}

export function isRanking(value) {
  return normalizeQuestionType(value) === 'ranking';
}

/** Tipos que usam opções (ae_question_options) e pesos por opção. */
export function usesOptions(value) {
  return isForcedChoice(value) || isRanking(value);
}
