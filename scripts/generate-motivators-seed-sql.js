/**
 * Gera SQL para re-seed manual dos Motivadores (equivalente a FORCE=1 node scripts/seed-motivators-questions.js).
 * Uso: node scripts/generate-motivators-seed-sql.js > scripts/seed-motivators-questions-v2.sql
 */
import { MOTIVATORS_DEFINITION, MOTIVATORS_DIMENSIONS } from '../lib/ae/motivators-dimensions.js';
import { generateMotivatorsQuestionBank } from '../lib/ae/motivators-question-bank.js';

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlJson(obj) {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

const defSub = `(SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER(${sqlStr(MOTIVATORS_DEFINITION.slug)}) LIMIT 1)`;

const lines = [];
lines.push('-- Re-seed Motivadores v2 (68 perguntas únicas)');
lines.push('-- Rode no pgAdmin. NÃO mexe em assessments (Eneagrama).');
lines.push('-- Equivalente a: FORCE=1 node scripts/seed-motivators-questions.js');
lines.push('');
lines.push('BEGIN;');
lines.push('');
lines.push('ALTER TABLE ae_questions DROP CONSTRAINT IF EXISTS ae_questions_question_type_check;');
lines.push('ALTER TABLE ae_questions');
lines.push("  ADD CONSTRAINT ae_questions_question_type_check");
lines.push("  CHECK (question_type IN ('forced_choice', 'likert', 'ranking'));");
lines.push('');

const def = MOTIVATORS_DEFINITION;
lines.push(`INSERT INTO ae_definitions (slug, name, description, version, active, config)`);
lines.push(`VALUES (${sqlStr(def.slug)}, ${sqlStr(def.name)}, ${sqlStr(def.description)}, ${def.version}, TRUE, ${sqlJson(def.config)})`);
lines.push(`ON CONFLICT DO NOTHING;`);
lines.push('');
lines.push(`UPDATE ae_definitions SET`);
lines.push(`  name = ${sqlStr(def.name)},`);
lines.push(`  description = ${sqlStr(def.description)},`);
lines.push(`  version = ${def.version},`);
lines.push(`  config = ${sqlJson(def.config)},`);
lines.push(`  active = TRUE`);
lines.push(`WHERE LOWER(slug) = LOWER(${sqlStr(def.slug)});`);
lines.push('');

for (const dim of MOTIVATORS_DIMENSIONS) {
  lines.push(`INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)`);
  lines.push(`SELECT ${defSub}, ${sqlStr(dim.key)}, ${sqlStr(dim.label)}, ${dim.sortOrder}, TRUE, ${sqlStr(dim.color)}`);
  lines.push(`ON CONFLICT (definition_id, LOWER(key))`);
  lines.push(`DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;`);
}

lines.push('');
lines.push(`DELETE FROM ae_questions WHERE definition_id = ${defSub};`);
lines.push('');

const bank = generateMotivatorsQuestionBank();
for (const q of bank) {
  lines.push(`INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)`);
  lines.push(
    `SELECT ${defSub}, ${sqlStr(q.key)}, ${sqlStr(q.text)}, ${sqlStr(q.questionType)}, ${sqlStr(q.category)}, ${q.weight}, ${q.sortOrder}, TRUE;`
  );

  if (q.options?.length) {
    for (const opt of q.options) {
      lines.push(`INSERT INTO ae_question_options (question_id, key, text, sort_order, active)`);
      lines.push(`SELECT q.id, ${sqlStr(opt.key)}, ${sqlStr(opt.text)}, ${opt.sortOrder}, TRUE`);
      lines.push(`FROM ae_questions q`);
      lines.push(`JOIN ae_definitions d ON d.id = q.definition_id`);
      lines.push(`WHERE LOWER(d.slug) = LOWER(${sqlStr(def.slug)}) AND q.key = ${sqlStr(q.key)};`);

      for (const [dimKey, weight] of Object.entries(opt.weights || {})) {
        lines.push(`INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)`);
        lines.push(`SELECT o.id, dim.id, ${weight}`);
        lines.push(`FROM ae_question_options o`);
        lines.push(`JOIN ae_questions q ON q.id = o.question_id`);
        lines.push(`JOIN ae_definitions d ON d.id = q.definition_id`);
        lines.push(`JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER(${sqlStr(dimKey)})`);
        lines.push(`WHERE LOWER(d.slug) = LOWER(${sqlStr(def.slug)}) AND q.key = ${sqlStr(q.key)} AND o.key = ${sqlStr(opt.key)}`);
        lines.push(`ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;`);
      }
    }
  }

  if (q.dimensionWeights) {
    for (const [dimKey, wpp] of Object.entries(q.dimensionWeights)) {
      lines.push(`INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)`);
      lines.push(`SELECT q.id, dim.id, ${wpp}`);
      lines.push(`FROM ae_questions q`);
      lines.push(`JOIN ae_definitions d ON d.id = q.definition_id`);
      lines.push(`JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER(${sqlStr(dimKey)})`);
      lines.push(`WHERE LOWER(d.slug) = LOWER(${sqlStr(def.slug)}) AND q.key = ${sqlStr(q.key)}`);
      lines.push(`ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;`);
    }
  }
  lines.push('');
}

lines.push('COMMIT;');
lines.push('');
lines.push('-- Validação (rode depois):');
lines.push("-- SELECT slug, version, config FROM ae_definitions WHERE LOWER(slug) = 'motivators';");
lines.push("-- SELECT question_type, COUNT(*)::int FROM ae_questions q JOIN ae_definitions d ON d.id = q.definition_id WHERE LOWER(d.slug) = 'motivators' AND q.active GROUP BY 1 ORDER BY 1;");

process.stdout.write(lines.join('\n'));
