import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePunchCoordinates } from '../../lib/time-clock-format.js';

test('valid coordinates are parsed, including strings and zero', () => {
  assert.equal(JSON.stringify(parsePunchCoordinates(-23.55, -46.63)), JSON.stringify({ latitude: -23.55, longitude: -46.63 }));
  assert.equal(JSON.stringify(parsePunchCoordinates('-23.5', '-46.6')), JSON.stringify({ latitude: -23.5, longitude: -46.6 }));
  assert.equal(JSON.stringify(parsePunchCoordinates(0, 0)), JSON.stringify({ latitude: 0, longitude: 0 }));
});

test('missing, blank, non-numeric or out-of-range coordinates are rejected', () => {
  for (const [la, lo] of [[null, null], [undefined, 1], ['', ''], ['abc', 1], [91, 0], [0, 181], [Number.NaN, 0], ['  ', ' '], [true, true], [[], []]]) {
    assert.equal(parsePunchCoordinates(la, lo), null, `${la},${lo}`);
  }
});
