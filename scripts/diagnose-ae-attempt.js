/**
 * Diagnóstico de scoring para uma tentativa ae_attempts.
 * Uso: node scripts/diagnose-ae-attempt.js [attemptId]
 */
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { loadQuestionsForScoring } from '../lib/ae/load-questions-for-scoring.js';
import { computeMotivatorScores } from '../lib/ae/scoring.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const attemptId = Number(process.argv[2] || 1);

async function main() {
  const client = new Client(getPgBaseConfig());
  await client.connect();
  const q = (text, params) => client.query(text, params);

  try {
    const att = await q(
      `SELECT id, question_ids AS "questionIds", answers, dimension_scores AS "dimensionScores"
       FROM ae_attempts WHERE id = $1`,
      [attemptId]
    );
    if (att.rowCount === 0) throw new Error(`Tentativa ${attemptId} não encontrada.`);
    const row = att.rows[0];

    const stats = await q(
      `SELECT
         (SELECT COUNT(*)::int FROM ae_option_dimension_weights odw
          JOIN ae_question_options o ON o.id = odw.option_id
          WHERE o.question_id = ANY($1::bigint[])) AS option_weights,
         (SELECT COUNT(*)::int FROM ae_question_dimension_weights
          WHERE question_id = ANY($1::bigint[])) AS likert_weights,
         (SELECT COUNT(*)::int FROM ae_question_options
          WHERE question_id = ANY($1::bigint[]) AND active = TRUE) AS options`,
      [row.questionIds]
    );
    console.log('Pesos no banco para esta sessão:', stats.rows[0]);

    const questions = await loadQuestionsForScoring(q, row.questionIds);
    const fc = questions.filter((x) => x.questionType === 'forced_choice');
    const lk = questions.filter((x) => x.questionType === 'likert');
    const fcNoWeights = fc.filter((x) => (x.options || []).some((o) => !Object.keys(o.weights || {}).length));
    const lkNoWeights = lk.filter((x) => !Object.keys(x.dimensionWeights || {}).length);
    console.log(`Perguntas carregadas: ${questions.length} (${fc.length} FC, ${lk.length} likert)`);
    console.log(`FC com opção sem peso: ${fcNoWeights.length}`);
    console.log(`Likert sem peso: ${lkNoWeights.length}`);

    const scored = computeMotivatorScores({ questions, answers: row.answers });
    console.log('Scoring:', scored.ok ? 'OK' : scored.error);
    if (scored.ok) {
      const max = Math.max(...Object.values(scored.dimensionScores));
      console.log('Maior score normalizado:', max);
      console.log('Top 3:', scored.topDimensions);
    }

    console.log('\nScores salvos no banco:', row.dimensionScores);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
