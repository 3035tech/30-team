/**
 * Teste offline do motor de scoring (sem banco).
 * node scripts/test-ae-scoring.js
 */
import { computeMotivatorScores } from '../lib/ae/scoring.js';

const questions = [
  {
    id: '126',
    questionType: 'forced_choice',
    weight: 1,
    options: [
      { id: '501', weights: { autonomia: 4, seguranca: 1 } },
      { id: '502', weights: { autonomia: 1, seguranca: 4 } },
    ],
  },
  {
    id: 127,
    questionType: 'likert',
    weight: 1,
    dimensionWeights: { reconhecimento: 2, crescimento: 1 },
  },
];

const answers = [
  { questionId: 126, optionId: '502' },
  { questionId: '127', likertValue: 5 },
];

const scored = computeMotivatorScores({ questions, answers });
if (!scored.ok) {
  console.error('FAIL:', scored.error);
  process.exit(1);
}

const max = Math.max(...Object.values(scored.dimensionScores));
if (max === 0) {
  console.error('FAIL: scores ainda zerados', scored);
  process.exit(1);
}

console.log('OK — maior score:', max);
console.log('Top 3:', scored.topDimensions);
console.log('Scores:', scored.dimensionScores);
