import { t, normalizeLocale } from '../i18n';

/** Remove pesos das perguntas para exposição pública. */
export function toPublicQuestions(questions, locale = 'pt-BR') {
  const loc = normalizeLocale(locale);
  return questions.map((q, index) => {
    const base = {
      sessionIndex: index + 1,
      id: q.id,
      key: q.key,
      text: q.text,
      questionType: q.questionType,
      category: q.category,
    };
    if (q.questionType === 'forced_choice') {
      return {
        ...base,
        options: (q.options || []).map((o) => ({ id: o.id, key: o.key, text: o.text })),
      };
    }
    if (q.questionType === 'ranking') {
      return {
        ...base,
        options: (q.options || []).map((o) => ({ id: o.id, key: o.key, text: o.text })),
        ranking: { instruction: t(loc, 'motivators.rankingInstruction') },
      };
    }
    return {
      ...base,
      likertScale: {
        min: 1,
        max: 5,
        minLabel: t(loc, 'motivators.likertMin'),
        maxLabel: t(loc, 'motivators.likertMax'),
      },
    };
  });
}
