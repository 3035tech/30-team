import { createRequire } from 'node:module';
import process from 'node:process';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { MOTIVATORS_DEFINITION, MOTIVATORS_DIMENSIONS } from '../lib/ae/motivators-dimensions.js';
import { generateMotivatorsQuestionBank, getQuestionBankStats } from '../lib/ae/motivators-question-bank.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

async function main() {
  const stats = getQuestionBankStats();
  const force = process.env.FORCE === '1';
  const client = new Client(getPgBaseConfig());
  await client.connect();

  try {
    await client.query('BEGIN');

    let defRow = await client.query(
      `SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER($1) LIMIT 1`,
      [MOTIVATORS_DEFINITION.slug]
    );

    let definitionId;
    if (defRow.rowCount === 0) {
      const ins = await client.query(
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
      await client.query(
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
      const r = await client.query(
        `INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
         VALUES ($1, $2, $3, $4, TRUE, $5)
         ON CONFLICT (definition_id, LOWER(key))
         DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE
         RETURNING id, key`,
        [definitionId, dim.key, dim.label, dim.sortOrder, dim.color]
      );
      dimIdByKey[r.rows[0].key] = r.rows[0].id;
    }

    const existing = await client.query(
      `SELECT COUNT(*)::int AS n FROM ae_questions WHERE definition_id = $1`,
      [definitionId]
    );
    const existingCount = existing.rows[0].n;

    if (existingCount > 0 && !force) {
      process.stdout.write(
        `Motivators bank already seeded (${existingCount} questions). Set FORCE=1 to replace.\n`
      );
      await client.query('COMMIT');
      return;
    }

    if (force && existingCount > 0) {
      await client.query(
        `DELETE FROM ae_questions WHERE definition_id = $1`,
        [definitionId]
      );
    }

    const bank = generateMotivatorsQuestionBank();
    let inserted = 0;

    for (const q of bank) {
      const qIns = await client.query(
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
      inserted += 1;

      if (q.questionType === 'forced_choice' && q.options) {
        for (const opt of q.options) {
          const oIns = await client.query(
            `INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
             VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT (question_id, key) DO UPDATE
               SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE
             RETURNING id`,
            [questionId, opt.key, opt.text, opt.sortOrder]
          );
          const optionId = oIns.rows[0].id;

          await client.query(
            `DELETE FROM ae_option_dimension_weights WHERE option_id = $1`,
            [optionId]
          );

          for (const [dimKey, weight] of Object.entries(opt.weights)) {
            const dimId = dimIdByKey[dimKey];
            if (!dimId) continue;
            await client.query(
              `INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
               VALUES ($1, $2, $3)
               ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight`,
              [optionId, dimId, weight]
            );
          }
        }
      }

      if (q.questionType === 'likert' && q.dimensionWeights) {
        await client.query(
          `DELETE FROM ae_question_dimension_weights WHERE question_id = $1`,
          [questionId]
        );
        for (const [dimKey, weightPerPoint] of Object.entries(q.dimensionWeights)) {
          const dimId = dimIdByKey[dimKey];
          if (!dimId) continue;
          await client.query(
            `INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
             VALUES ($1, $2, $3)
             ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point`,
            [questionId, dimId, weightPerPoint]
          );
        }
      }
    }

    await client.query('COMMIT');
    process.stdout.write(
      `Motivators seed complete. definition_id=${definitionId} questions=${inserted} ` +
        `(bank: ${stats.total} = ${stats.forcedChoice} forced + ${stats.likert} likert)\n`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Seed motivators failed:', e);
  process.exitCode = 1;
});
