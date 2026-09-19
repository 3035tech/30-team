import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../../app/api/mobile/v1/employee/time-clock/route.js', import.meta.url);

test('mobile time punches require and persist valid phone coordinates', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.match(source, /Number\.isFinite\(latitude\)/);
  assert.match(source, /latitude < -90 \|\| latitude > 90/);
  assert.match(source, /Number\.isFinite\(longitude\)/);
  assert.match(source, /longitude < -180 \|\| longitude > 180/);
  assert.match(source, /createTimePunch[\s\S]*latitude, longitude/);
});
