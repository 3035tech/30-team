import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWithConcurrency } from '../../lib/concurrency.js';

test('mapWithConcurrency keeps order and caps in-flight work', async () => {
  let inFlight = 0;
  let peak = 0;
  const items = [30, 5, 20, 1, 15, 10, 2];
  const out = await mapWithConcurrency(items, 3, async (ms, i) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, ms));
    inFlight -= 1;
    return `${i}:${ms}`;
  });
  assert.deepEqual(out, items.map((ms, i) => `${i}:${ms}`));
  assert.ok(peak <= 3, `peak ${peak}`);
  assert.equal(peak, 3);
});

test('mapWithConcurrency handles empty input and rejects like Promise.all', async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
  await assert.rejects(
    mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    }),
    /boom/
  );
});
