/** Carrega perguntas com pesos completos para scoring server-side. */
import { asDb } from './as-db.js';
import { aeId, normalizePgBigintArray } from './ae-id.js';
import { usesOptions } from './normalize-question-type.js';

function mapOptionWeightsRow(row) {
  const weights = {};
  if (row.dimensionKeys && row.dimensionWeights) {
    const keys = String(row.dimensionKeys).split('||');
    const weightsArr = String(row.dimensionWeights).split('||');
    keys.forEach((k, i) => {
      if (k) weights[k] = parseFloat(weightsArr[i]) || 0;
    });
  }
  return weights;
}

function toBigintArrayParam(ids) {
  return ids.map((id) => {
    const n = Number(id);
    return Number.isFinite(n) ? n : id;
  });
}

export async function loadQuestionsForScoring(dbOrQuery, questionIds) {
  const db = asDb(dbOrQuery);
  const ids = normalizePgBigintArray(questionIds);
  if (!ids.length) return [];

  const idParam = toBigintArrayParam(ids);

  const qRes = await db.query(
    `SELECT q.id, q.key, q.text, q.question_type AS "questionType", q.weight
     FROM ae_questions q
     WHERE q.id = ANY($1::bigint[]) AND q.active = TRUE`,
    [idParam]
  );

  const optRes = await db.query(
    `SELECT o.id, o.question_id AS "questionId", o.key, o.text,
            string_agg(d.key, '||' ORDER BY d.sort_order, d.key) AS "dimensionKeys",
            string_agg(odw.weight::text, '||' ORDER BY d.sort_order, d.key) AS "dimensionWeights"
     FROM ae_question_options o
     LEFT JOIN ae_option_dimension_weights odw ON odw.option_id = o.id
     LEFT JOIN ae_dimensions d ON d.id = odw.dimension_id AND d.active = TRUE
     WHERE o.question_id = ANY($1::bigint[]) AND o.active = TRUE
     GROUP BY o.id, o.question_id, o.key, o.text
     ORDER BY o.id ASC`,
    [idParam]
  );

  const likertRes = await db.query(
    `SELECT qdw.question_id AS "questionId", d.key AS "dimensionKey", qdw.weight_per_point AS "weightPerPoint"
     FROM ae_question_dimension_weights qdw
     INNER JOIN ae_dimensions d ON d.id = qdw.dimension_id AND d.active = TRUE
     WHERE qdw.question_id = ANY($1::bigint[])`,
    [idParam]
  );

  const optionsByQ = new Map();
  for (const row of optRes.rows) {
    const qid = aeId(row.questionId);
    if (!optionsByQ.has(qid)) optionsByQ.set(qid, []);
    optionsByQ.get(qid).push({
      id: aeId(row.id),
      key: row.key,
      text: row.text,
      weights: mapOptionWeightsRow(row),
    });
  }

  const likertByQ = new Map();
  for (const row of likertRes.rows) {
    const qid = aeId(row.questionId);
    if (!likertByQ.has(qid)) likertByQ.set(qid, {});
    likertByQ.get(qid)[row.dimensionKey] = parseFloat(row.weightPerPoint) || 0;
  }

  const byId = new Map();
  for (const q of qRes.rows) {
    const qid = aeId(q.id);
    const base = {
      id: qid,
      key: q.key,
      questionType: q.questionType,
      weight: parseFloat(q.weight) || 1,
    };
    if (usesOptions(q)) {
      byId.set(qid, { ...base, options: optionsByQ.get(qid) || [] });
    } else {
      byId.set(qid, { ...base, dimensionWeights: likertByQ.get(qid) || {} });
    }
  }

  // Preserva ordem da sessão (question_ids no attempt).
  return ids.map((id) => byId.get(aeId(id))).filter(Boolean);
}
