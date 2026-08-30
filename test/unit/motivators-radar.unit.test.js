/**
 * Unit proof — Motivators radar axis points + peaks.
 */
import assert from 'node:assert/strict';
import { MOTIVATORS_DIMENSIONS } from '../../lib/ae/motivators-dimensions.js';
import {
  buildMotivatorsRadarPoints,
  pickMotivatorsRadarPeaks,
} from '../../lib/ae/motivators-radar.js';

function main() {
  const empty = buildMotivatorsRadarPoints(null, 'pt-BR');
  assert.equal(empty.length, MOTIVATORS_DIMENSIONS.length);
  assert.ok(empty.every((p) => p.score === 0));
  assert.equal(pickMotivatorsRadarPeaks(empty).length, 0);

  const points = buildMotivatorsRadarPoints(
    {
      reconhecimento: 80,
      financeiro: 120,
      autonomia: -5,
      proposito: 'not-a-number',
      crescimento: 65,
      desafio: 72,
    },
    'en'
  );
  assert.equal(points.length, 13);
  const byKey = Object.fromEntries(points.map((p) => [p.key, p]));
  assert.equal(byKey.reconhecimento.score, 80);
  assert.equal(byKey.financeiro.score, 100);
  assert.equal(byKey.autonomia.score, 0);
  assert.equal(byKey.proposito.score, 0);
  assert.equal(byKey.reconhecimento.shortLabel, 'Rec.');
  assert.ok(byKey.reconhecimento.label.includes('Recognition') || byKey.reconhecimento.label === 'Recognition');

  const peaks = pickMotivatorsRadarPeaks(points, 3);
  assert.equal(peaks.length, 3);
  assert.equal(peaks[0].key, 'financeiro');
  assert.equal(peaks[1].key, 'reconhecimento');
  assert.equal(peaks[2].key, 'desafio');

  console.log('motivators-radar.unit.test.js OK');
}

main();
