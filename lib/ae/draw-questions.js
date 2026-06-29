/**
 * Sorteia perguntas ativas do banco para uma sessão do assessment.
 * Quantidade padrão: 48 (42 forced choice + 6 likert), conforme ae_definitions.config.
 */

import { asDb } from './as-db.js';
import { aeId } from './ae-id.js';

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(items, count) {
  const copy = [...items];
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(count, copy.length));
}

function parseDrawConfig(definitionConfig = {}) {
  const cfg = definitionConfig && typeof definitionConfig === 'object' ? definitionConfig : {};
  const questionsPerSession = Number(cfg.questions_per_session) || 48;
  const forcedChoicePerSession = Number(cfg.forced_choice_per_session) || 42;
  const likertPerSession = Number(cfg.likert_per_session) || 6;
  const shuffle = cfg.shuffle !== false;

  return {
    questionsPerSession,
    forcedChoicePerSession,
    likertPerSession,
    shuffle,
  };
}

/**
 * @param {Array<{ questionType: string }>} allQuestions
 * @param {object} definitionConfig
 */
export function drawQuestionsFromPool(allQuestions, definitionConfig) {
  const { forcedChoicePerSession, likertPerSession, shuffle } = parseDrawConfig(definitionConfig);

  const forced = allQuestions.filter((q) => q.questionType === 'forced_choice');
  const likert = allQuestions.filter((q) => q.questionType === 'likert');

  const drawnForced = pickRandom(forced, forcedChoicePerSession);
  const drawnLikert = pickRandom(likert, likertPerSession);
  const drawn = [...drawnForced, ...drawnLikert];

  if (shuffle) {
    shuffleInPlace(drawn);
  }

  return {
    questions: drawn,
    meta: {
      drawnCount: drawn.length,
      forcedChoiceCount: drawnForced.length,
      likertCount: drawnLikert.length,
      poolTotal: allQuestions.length,
      poolForcedChoice: forced.length,
      poolLikert: likert.length,
    },
  };
}

function mapOptionRow(row) {
  const weights = {};
  if (row.dimensionKeys && row.dimensionWeights) {
    const keys = String(row.dimensionKeys).split('||');
    const weightsArr = String(row.dimensionWeights).split('||');
    keys.forEach((k, i) => {
      if (k) weights[k] = parseFloat(weightsArr[i]) || 0;
    });
  }
  return {
    id: aeId(row.id),
    key: row.key,
    text: row.text,
    sortOrder: row.sortOrder,
    weights,
  };
}

/**
 * Carrega perguntas ativas do banco e sorteia um subconjunto para a sessão.
 * @param {import('pg').Pool | { query: Function }} db
 * @param {string} definitionSlug
 */
export async function drawMotivatorsQuestions(dbOrQuery, definitionSlug = 'motivators') {
  const db = asDb(dbOrQuery);
  const defRes = await db.query(
    `SELECT id, slug, name, version, config
     FROM ae_definitions
     WHERE LOWER(slug) = LOWER($1) AND active = TRUE
     LIMIT 1`,
    [definitionSlug]
  );

  if (defRes.rowCount === 0) {
    return { ok: false, error: 'Assessment não encontrado ou inativo.' };
  }

  const definition = defRes.rows[0];
  const definitionId = definition.id;

  const qRes = await db.query(
    `SELECT q.id, q.key, q.text, q.question_type AS "questionType",
            q.category, q.weight, q.sort_order AS "sortOrder"
     FROM ae_questions q
     WHERE q.definition_id = $1 AND q.active = TRUE
     ORDER BY q.sort_order ASC, q.id ASC`,
    [definitionId]
  );

  if (qRes.rowCount === 0) {
    return { ok: false, error: 'Banco de perguntas vazio. Execute o seed.' };
  }

  const questionIds = qRes.rows.map((r) => r.id);

  const optRes = await db.query(
    `SELECT o.id, o.question_id AS "questionId", o.key, o.text, o.sort_order AS "sortOrder",
            string_agg(d.key, '||' ORDER BY d.sort_order) AS "dimensionKeys",
            string_agg(odw.weight::text, '||' ORDER BY d.sort_order) AS "dimensionWeights"
     FROM ae_question_options o
     JOIN ae_questions q ON q.id = o.question_id
     LEFT JOIN ae_option_dimension_weights odw ON odw.option_id = o.id
     LEFT JOIN ae_dimensions d ON d.id = odw.dimension_id
     WHERE q.definition_id = $1 AND o.active = TRUE AND q.id = ANY($2::bigint[])
     GROUP BY o.id, o.question_id, o.key, o.text, o.sort_order
     ORDER BY o.sort_order ASC`,
    [definitionId, questionIds]
  );

  const likertRes = await db.query(
    `SELECT qdw.question_id AS "questionId", d.key AS "dimensionKey", qdw.weight_per_point AS "weightPerPoint"
     FROM ae_question_dimension_weights qdw
     JOIN ae_dimensions d ON d.id = qdw.dimension_id
     JOIN ae_questions q ON q.id = qdw.question_id
     WHERE q.definition_id = $1 AND q.id = ANY($2::bigint[])`,
    [definitionId, questionIds]
  );

  const optionsByQuestion = new Map();
  for (const row of optRes.rows) {
    const qid = aeId(row.questionId);
    if (!optionsByQuestion.has(qid)) {
      optionsByQuestion.set(qid, []);
    }
    optionsByQuestion.get(qid).push(mapOptionRow(row));
  }

  const likertByQuestion = new Map();
  for (const row of likertRes.rows) {
    const qid = aeId(row.questionId);
    if (!likertByQuestion.has(qid)) {
      likertByQuestion.set(qid, {});
    }
    likertByQuestion.get(qid)[row.dimensionKey] = parseFloat(row.weightPerPoint) || 0;
  }

  const pool = qRes.rows.map((q) => {
    const qid = aeId(q.id);
    const base = {
      id: qid,
      key: q.key,
      text: q.text,
      questionType: q.questionType,
      category: q.category,
      weight: parseFloat(q.weight) || 1,
      sortOrder: q.sortOrder,
    };
    if (q.questionType === 'forced_choice') {
      return { ...base, options: optionsByQuestion.get(qid) || [] };
    }
    return { ...base, dimensionWeights: likertByQuestion.get(qid) || {} };
  });

  const { questions, meta } = drawQuestionsFromPool(pool, definition.config);

  return {
    ok: true,
    definition: {
      slug: definition.slug,
      name: definition.name,
      version: definition.version,
      config: definition.config,
    },
    questions,
    meta,
  };
}

export { parseDrawConfig, shuffleInPlace, pickRandom };
