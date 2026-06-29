import { createRequire } from 'node:module';
import process from 'node:process';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { MOTIVATORS_DEFINITION } from '../lib/ae/motivators-dimensions.js';
import { MOTIVATORS_RESULT_TEMPLATES } from '../lib/ae/motivators-result-templates-data.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

async function main() {
  const client = new Client(getPgBaseConfig());
  await client.connect();
  try {
    const def = await client.query(`SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER($1) LIMIT 1`, [
      MOTIVATORS_DEFINITION.slug,
    ]);
    if (def.rowCount === 0) {
      throw new Error('Definition motivators not found. Run db:seed-motivators first.');
    }
    const definitionId = def.rows[0].id;

    await client.query(`DELETE FROM ae_result_templates WHERE definition_id = $1`, [definitionId]);

    for (const t of MOTIVATORS_RESULT_TEMPLATES) {
      await client.query(
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
    }
    process.stdout.write(`Templates seeded: ${MOTIVATORS_RESULT_TEMPLATES.length}\n`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
