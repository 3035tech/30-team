import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../../app/api/mobile/v1/employee/time-clock/route.js', import.meta.url);

test('mobile time punches require and persist valid phone coordinates', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.match(source, /const coords = parsePunchCoordinates\(body\.latitude, body\.longitude\)/);
  assert.match(source, /!coords\) return apiError\(request, ERR\.INVALID_DATA/);
  assert.match(source, /createTimePunch[\s\S]*latitude: coords\.latitude, longitude: coords\.longitude/);
});
