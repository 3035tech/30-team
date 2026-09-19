import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { HTTP_STATUS } from '../../lib/api-error-codes.js';

const MOBILE_ROOT = join(process.cwd(), 'app/api/mobile/v1');
const MAGIC_HTTP_STATUS = /apiError\([^\n]*(?:,|status:)\s*(?:400|401|403|404|409|422|429|500|503)(?:\s*[,})])/;

function routes(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routes(path) : entry.name === 'route.js' ? [path] : [];
  });
}

test('HTTP status catalog preserves protocol values', () => {
  assert.equal(HTTP_STATUS.BAD_REQUEST, 400);
  assert.equal(HTTP_STATUS.UNAUTHORIZED, 401);
  assert.equal(HTTP_STATUS.FORBIDDEN, 403);
  assert.equal(HTTP_STATUS.NOT_FOUND, 404);
  assert.equal(HTTP_STATUS.CONFLICT, 409);
  assert.equal(HTTP_STATUS.TOO_MANY_REQUESTS, 429);
  assert.equal(HTTP_STATUS.INTERNAL_SERVER_ERROR, 500);
  assert.equal(HTTP_STATUS.SERVICE_UNAVAILABLE, 503);
});

test('mobile routes do not use magic HTTP status numbers in apiError', () => {
  const violations = routes(MOBILE_ROOT).filter((path) => MAGIC_HTTP_STATUS.test(readFileSync(path, 'utf8')));
  assert.deepEqual(violations, []);
});
