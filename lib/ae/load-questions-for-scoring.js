/** Carrega perguntas com pesos completos para scoring server-side. */
export async function loadQuestionsForScoring(db, questionIds) {
  if (!questionIds?.length) return [];

  const qRes = await db.query(
    `SELECT q.id, q.key, q.text, q.question_type AS "questionType", q.weight
     FROM ae_questions q
     WHERE q.id = ANY($1::bigint[]) AND q.active = TRUE`,
    [questionIds]
  );

  const optRes = await db.query(
    `SELECT o.id, o.question_id AS "questionId", o.key, o.text,
            d.key AS "dimensionKey", odw.weight
     FROM ae_question_options o
     JOIN ae_option_dimension_weights odw ON odw.option_id = o.id
     JOIN ae_dimensions d ON d.id = odw.dimension_id
     WHERE o.question_id = ANY($1::bigint[]) AND o.active = TRUE`,
    [questionIds]
  );

  const likertRes = await db.query(
    `SELECT qdw.question_id AS "questionId", d.key AS "dimensionKey", qdw.weight_per_point AS "weightPerPoint"
     FROM ae_question_dimension_weights qdw
     JOIN ae_dimensions d ON d.id = qdw.dimension_id
     WHERE qdw.question_id = ANY($1::bigint[])`,
    [questionIds]
  );

  const optionsByQ = new Map();
  for (const row of optRes.rows) {
    if (!optionsByQ.has(row.questionId)) optionsByQ.set(row.questionId, new Map());
    const byOpt = optionsByQ.get(row.questionId);
    if (!byOpt.has(row.id)) {
      byOpt.set(row.id, { id: row.id, key: row.key, text: row.text, weights: {} });
    }
    byOpt.get(row.id).weights[row.dimensionKey] = parseFloat(row.weight) || 0;
  }

  const likertByQ = new Map();
  for (const row of likertRes.rows) {
    if (!likertByQ.has(row.questionId)) likertByQ.set(row.questionId, {});
    likertByQ.get(row.questionId)[row.dimensionKey] = parseFloat(row.weightPerPoint) || 0;
  }

  return qRes.rows.map((q) => {
    const base = {
      id: q.id,
      key: q.key,
      questionType: q.questionType,
      weight: parseFloat(q.weight) || 1,
    };
    if (q.questionType === 'forced_choice') {
      const opts = optionsByQ.get(q.id);
      return { ...base, options: opts ? [...opts.values()] : [] };
    }
    return { ...base, dimensionWeights: likertByQ.get(q.id) || {} };
  });
}
