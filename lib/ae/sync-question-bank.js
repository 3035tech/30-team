/**
 * Publica o banco atual de Motivadores sem apagar perguntas antigas.
 * Tentativas já feitas (question_ids + answers + scores) continuam apontando para os IDs originais.
 */
import { generateMotivatorsQuestionBank } from './motivators-question-bank.js';
import { usesOptions } from './normalize-question-type.js';

/**
 * @param {{ query: Function }} db
 * @param {{ definitionId: number|string, dimIdByKey: Record<string, number|string> }} args
 */
export async function syncMotivatorsQuestionBank(db, { definitionId, dimIdByKey }) {
  const bank = generateMotivatorsQuestionBank();
  const bankKeys = bank.map((q) => q.key);

  const retired = await db.query(
    `UPDATE ae_questions
     SET active = FALSE
     WHERE definition_id = $1
       AND active = TRUE
       AND NOT (key = ANY($2::text[]))
     RETURNING id`,
    [definitionId, bankKeys]
  );

  let upserted = 0;
  for (const q of bank) {
    const qIns = await db.query(
      `INSERT INTO ae_questions
         (definition_id, key, text, question_type, category, weight, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (definition_id, key) DO UPDATE
         SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
             category = EXCLUDED.category, weight = EXCLUDED.weight,
             sort_order = EXCLUDED.sort_order, active = TRUE
       RETURNING id`,
      [definitionId, q.key, q.text, q.questionType, q.category, q.weight, q.sortOrder]
    );
    const questionId = qIns.rows[0].id;
    upserted += 1;

    if (usesOptions(q) && q.options) {
      for (const opt of q.options) {
        const oIns = await db.query(
          `INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
           VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (question_id, key) DO UPDATE
             SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE
           RETURNING id`,
          [questionId, opt.key, opt.text, opt.sortOrder]
        );
        const optionId = oIns.rows[0].id;
        await db.query(`DELETE FROM ae_option_dimension_weights WHERE option_id = $1`, [optionId]);
        for (const [dimKey, weight] of Object.entries(opt.weights || {})) {
          const dimId = dimIdByKey[dimKey];
          if (!dimId) continue;
          await db.query(
            `INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
             VALUES ($1, $2, $3)
             ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight`,
            [optionId, dimId, weight]
          );
        }
      }
    }

    if (q.questionType === 'likert' && q.dimensionWeights) {
      await db.query(`DELETE FROM ae_question_dimension_weights WHERE question_id = $1`, [questionId]);
      for (const [dimKey, weightPerPoint] of Object.entries(q.dimensionWeights)) {
        const dimId = dimIdByKey[dimKey];
        if (!dimId) continue;
        await db.query(
          `INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
           VALUES ($1, $2, $3)
           ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point`,
          [questionId, dimId, weightPerPoint]
        );
      }
    }
  }

  const active = await db.query(
    `SELECT COUNT(*)::int AS n FROM ae_questions WHERE definition_id = $1 AND active = TRUE`,
    [definitionId]
  );

  return {
    upserted,
    retiredCount: retired.rowCount,
    activeCount: active.rows[0].n,
    bankSize: bank.length,
  };
}
