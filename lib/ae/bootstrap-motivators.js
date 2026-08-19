import { MOTIVATORS_DEFINITION, MOTIVATORS_DIMENSIONS } from './motivators-dimensions.js';
import { generateMotivatorsQuestionBank } from './motivators-question-bank.js';
import { MOTIVATORS_RESULT_TEMPLATES } from './motivators-result-templates-data.js';
import { asDb } from './as-db.js';
import { usesOptions } from './normalize-question-type.js';
import { syncMotivatorsQuestionBank } from './sync-question-bank.js';

/**
 * Popula definition, dimensões, perguntas e templates (idempotente).
 * Nunca apaga ae_questions: o banco v2 é só desativado; tentativas antigas seguem válidas.
 */
export async function bootstrapMotivators(dbOrQuery, { forceQuestions = false, repairWeights = false } = {}) {
  const db = asDb(dbOrQuery);
  let defRow = await db.query(
    `SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER($1) LIMIT 1`,
    [MOTIVATORS_DEFINITION.slug]
  );

  let definitionId;
  if (defRow.rowCount === 0) {
    const ins = await db.query(
      `INSERT INTO ae_definitions (slug, name, description, version, active, config)
       VALUES ($1, $2, $3, $4, TRUE, $5::jsonb)
       RETURNING id`,
      [
        MOTIVATORS_DEFINITION.slug,
        MOTIVATORS_DEFINITION.name,
        MOTIVATORS_DEFINITION.description,
        MOTIVATORS_DEFINITION.version,
        JSON.stringify(MOTIVATORS_DEFINITION.config),
      ]
    );
    definitionId = ins.rows[0].id;
  } else {
    definitionId = defRow.rows[0].id;
    await db.query(
      `UPDATE ae_definitions
       SET name = $2, description = $3, version = $4, config = $5::jsonb, active = TRUE
       WHERE id = $1`,
      [
        definitionId,
        MOTIVATORS_DEFINITION.name,
        MOTIVATORS_DEFINITION.description,
        MOTIVATORS_DEFINITION.version,
        JSON.stringify(MOTIVATORS_DEFINITION.config),
      ]
    );
  }

  const dimIdByKey = {};
  for (const dim of MOTIVATORS_DIMENSIONS) {
    const r = await db.query(
      `INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       ON CONFLICT (definition_id, LOWER(key))
       DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE
       RETURNING id, key`,
      [definitionId, dim.key, dim.label, dim.sortOrder, dim.color]
    );
    dimIdByKey[r.rows[0].key] = r.rows[0].id;
  }

  const existing = await db.query(
    `SELECT COUNT(*)::int AS n FROM ae_questions WHERE definition_id = $1`,
    [definitionId]
  );
  const existingCount = existing.rows[0].n;
  const bank = generateMotivatorsQuestionBank();
  const bankKeys = bank.map((q) => q.key);

  const currentActive = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM ae_questions
     WHERE definition_id = $1 AND active = TRUE AND key = ANY($2::text[])`,
    [definitionId, bankKeys]
  );
  const legacyActive = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM ae_questions
     WHERE definition_id = $1 AND active = TRUE AND NOT (key = ANY($2::text[]))`,
    [definitionId, bankKeys]
  );

  const needsBankSync =
    forceQuestions ||
    currentActive.rows[0].n !== bank.length ||
    legacyActive.rows[0].n > 0;

  let questionsInserted = 0;
  let questionsRetired = 0;
  if (needsBankSync) {
    const synced = await syncMotivatorsQuestionBank(db, { definitionId, dimIdByKey });
    questionsInserted = synced.upserted;
    questionsRetired = synced.retiredCount;
  }

  let weightsRepaired = 0;
  if (repairWeights || (existingCount > 0 && !needsBankSync)) {
    const weightCount = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM ae_option_dimension_weights odw
       JOIN ae_question_options o ON o.id = odw.option_id
       JOIN ae_questions q ON q.id = o.question_id
       WHERE q.definition_id = $1`,
      [definitionId]
    );
    const likertWeightCount = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM ae_question_dimension_weights qdw
       JOIN ae_questions q ON q.id = qdw.question_id
       WHERE q.definition_id = $1`,
      [definitionId]
    );
    const needsWeights =
      weightCount.rows[0].n === 0 || likertWeightCount.rows[0].n === 0;

    if (needsWeights || repairWeights) {
      const bank = generateMotivatorsQuestionBank();
      const keyToBank = new Map(bank.map((q) => [q.key, q]));
      const dbQuestions = await db.query(
        `SELECT id, key, question_type AS "questionType"
         FROM ae_questions WHERE definition_id = $1 AND key = ANY($2::text[])`,
        [definitionId, bankKeys]
      );
      for (const row of dbQuestions.rows) {
        const q = keyToBank.get(row.key);
        if (!q) continue;
        if (usesOptions(q) && q.options) {
          for (const opt of q.options) {
            const oRes = await db.query(
              `SELECT id FROM ae_question_options WHERE question_id = $1 AND key = $2 LIMIT 1`,
              [row.id, opt.key]
            );
            if (oRes.rowCount === 0) continue;
            const optionId = oRes.rows[0].id;
            await db.query(`DELETE FROM ae_option_dimension_weights WHERE option_id = $1`, [optionId]);
            for (const [dimKey, weight] of Object.entries(opt.weights)) {
              const dimId = dimIdByKey[dimKey];
              if (!dimId) continue;
              await db.query(
                `INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight`,
                [optionId, dimId, weight]
              );
              weightsRepaired += 1;
            }
          }
        }
        if (q.questionType === 'likert' && q.dimensionWeights) {
          await db.query(`DELETE FROM ae_question_dimension_weights WHERE question_id = $1`, [row.id]);
          for (const [dimKey, weightPerPoint] of Object.entries(q.dimensionWeights)) {
            const dimId = dimIdByKey[dimKey];
            if (!dimId) continue;
            await db.query(
              `INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
               VALUES ($1, $2, $3)
               ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point`,
              [row.id, dimId, weightPerPoint]
            );
            weightsRepaired += 1;
          }
        }
      }
    }
  }

  const tplCount = await db.query(
    `SELECT COUNT(*)::int AS n FROM ae_result_templates WHERE definition_id = $1`,
    [definitionId]
  );
  let templatesInserted = 0;
  if (tplCount.rows[0].n === 0) {
    for (const t of MOTIVATORS_RESULT_TEMPLATES) {
      await db.query(
        `INSERT INTO ae_result_templates (definition_id, template_type, condition, text_pt, text_en, sort_order, active)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, TRUE)`,
        [
          definitionId,
          t.templateType,
          JSON.stringify(t.condition || {}),
          t.textPt,
          t.textEn || null,
          t.sortOrder || 0,
        ]
      );
      templatesInserted += 1;
    }
  }

  return {
    definitionId,
    questionsInserted,
    questionsRetired,
    templatesInserted,
    weightsRepaired,
    questionsTotal: (await db.query(
      `SELECT COUNT(*)::int AS n FROM ae_questions WHERE definition_id = $1 AND active = TRUE`,
      [definitionId]
    )).rows[0].n,
  };
}

export async function getMotivatorsStatus(dbOrQuery) {
  const db = asDb(dbOrQuery);
  try {
    const def = await db.query(
      `SELECT id, slug, active FROM ae_definitions WHERE LOWER(slug) = LOWER($1) LIMIT 1`,
      [MOTIVATORS_DEFINITION.slug]
    );
    if (def.rowCount === 0) {
      return { ready: false, reason: 'definition_missing' };
    }
    const definitionId = def.rows[0].id;
    const q = await db.query(
      `SELECT COUNT(*)::int AS n FROM ae_questions WHERE definition_id = $1 AND active = TRUE`,
      [definitionId]
    );
    const t = await db.query(
      `SELECT COUNT(*)::int AS n FROM ae_result_templates WHERE definition_id = $1 AND active = TRUE`,
      [definitionId]
    );
    const ready = q.rows[0].n > 0;
    return {
      ready,
      definitionId,
      questionsCount: q.rows[0].n,
      templatesCount: t.rows[0].n,
      reason: ready ? null : 'questions_missing',
    };
  } catch (err) {
    if (err?.code === '42P01') {
      return { ready: false, reason: 'schema_missing' };
    }
    throw err;
  }
}
