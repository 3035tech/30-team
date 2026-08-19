import { createRequire } from 'node:module';
import process from 'node:process';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { MOTIVATORS_DEFINITION, MOTIVATORS_DIMENSIONS } from '../lib/ae/motivators-dimensions.js';
import { getQuestionBankStats } from '../lib/ae/motivators-question-bank.js';
import { syncMotivatorsQuestionBank } from '../lib/ae/sync-question-bank.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

async function main() {
  const stats = getQuestionBankStats();
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

    const synced = await syncMotivatorsQuestionBank(client, { definitionId, dimIdByKey });

    await client.query('COMMIT');
    process.stdout.write(
      `Motivators seed complete. definition_id=${definitionId} ` +
        `active=${synced.activeCount} upserted=${synced.upserted} retired=${synced.retiredCount} ` +
        `(bank: ${stats.total} = ${stats.forcedChoice} forced + ${stats.ranking} ranking + ${stats.likert} likert). ` +
        `Previous questions were deactivated, not deleted.\n`
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
