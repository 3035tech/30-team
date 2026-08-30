/**
 * Unit smoke — sliding session window (gestor + colaborador), no DB.
 */
import assert from 'node:assert/strict';
import { shouldSlideSession, SESSION_SLIDE_WITHIN_SEC, MANAGER_SESSION_MAX_AGE_SEC } from '../../lib/session-ttl.js';
import { EMPLOYEE_SESSION_MAX_AGE } from '../../lib/employee-auth-constants.js';
import { MAX_AGE } from '../../lib/auth.js';

assert.equal(MAX_AGE, MANAGER_SESSION_MAX_AGE_SEC);

const now = 1_700_000_000;

assert.equal(shouldSlideSession(now + 60, { nowSec: now }), true);
assert.equal(shouldSlideSession(now + SESSION_SLIDE_WITHIN_SEC, { nowSec: now }), true);
assert.equal(shouldSlideSession(now + SESSION_SLIDE_WITHIN_SEC + 1, { nowSec: now }), false);
assert.equal(shouldSlideSession(now + MANAGER_SESSION_MAX_AGE_SEC, { nowSec: now }), false);
assert.equal(shouldSlideSession(now + EMPLOYEE_SESSION_MAX_AGE, { nowSec: now }), false);
assert.equal(shouldSlideSession(now - 1, { nowSec: now }), false);
assert.equal(shouldSlideSession(null, { nowSec: now }), false);
assert.equal(shouldSlideSession(Number.NaN, { nowSec: now }), false);

console.log('session-slide.test.js: ok');
