/** Remove pesos das perguntas para exposição pública. */
export function toPublicQuestions(questions) {
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
    return {
      ...base,
      likertScale: {
        min: 1,
        max: 5,
        minLabel: 'Discordo totalmente',
        maxLabel: 'Concordo totalmente',
      },
    };
  });
}
