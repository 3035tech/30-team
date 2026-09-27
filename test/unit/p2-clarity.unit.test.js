import test from 'node:test';
import assert from 'node:assert/strict';
import { NINE_BOX_DISPLAY_ROWS, nineBoxCellDescription } from '../../lib/people/nine-box-presentation.js';
import { nineBoxCellIndex } from '../../lib/people/nine-box.js';
import { MOTIVATORS_DIMENSIONS, motivatorWorkMeaning } from '../../lib/ae/motivators-dimensions.js';
import { buildMotivatorsRadarPoints, pickMotivatorsRadarPeaks } from '../../lib/ae/motivators-radar.js';

test('P2 matrix transposes display without changing any classification IDs', () => {
  const bands = ['low', 'mid', 'high'];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    assert.equal(NINE_BOX_DISPLAY_ROWS[row][col], nineBoxCellIndex(bands[col], bands[2 - row]));
    assert.match(nineBoxCellDescription(NINE_BOX_DISPLAY_ROWS[row][col]), /desempenho \/ .*potencial/);
  }
  assert.equal(nineBoxCellDescription(3), 'Baixo desempenho / alto potencial');
  assert.equal(nineBoxCellDescription(7, 'en'), 'High performance / low potential');
});

test('P2 motivator Top 5 is ordered, deterministic, immutable and has concise explanations', () => {
  const scores = { reconhecimento: 80, financeiro: 70, autonomia: 90, crescimento: 70, desafio: 60, seguranca: 50 };
  const points = buildMotivatorsRadarPoints(scores);
  const snapshot = structuredClone(points);
  const top = pickMotivatorsRadarPeaks(points, 5);
  assert.deepEqual(top.map(p => p.key), ['autonomia', 'reconhecimento', 'crescimento', 'financeiro', 'desafio']);
  assert.deepEqual(pickMotivatorsRadarPeaks([...points].reverse(), 5), top);
  assert.deepEqual(points, snapshot);
  for (const dimension of MOTIVATORS_DIMENSIONS) for (const locale of ['pt-BR', 'en']) {
    const meaning = motivatorWorkMeaning(dimension.key, locale);
    assert.ok(meaning.length > 20 && meaning.length < 220);
  }
  assert.deepEqual(pickMotivatorsRadarPeaks(buildMotivatorsRadarPoints({}), 5), []);
});
