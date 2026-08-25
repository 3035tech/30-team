/**
 * Unit: origin of panel users vs early-access /signup.
 * Run: node test/unit/user-signup-origin.js
 */
import assert from 'node:assert/strict';
import { resolveUserOrigin, isSelfServiceOrigin } from '../../lib/user-signup-origin.js';

assert.equal(resolveUserOrigin({}), 'admin');
assert.equal(resolveUserOrigin({ signupSource: null }), 'admin');
assert.equal(resolveUserOrigin({ signupSource: 'early_access' }), 'early_access');
assert.equal(resolveUserOrigin({ signupSource: 'paid' }), 'paid');
assert.equal(resolveUserOrigin({ signupSource: 'admin_invite' }), 'admin_invite');
assert.equal(resolveUserOrigin({ signupPending: true }), 'self_service');
assert.equal(
  resolveUserOrigin({ signupMetadata: { fullName: 'Ana' } }),
  'self_service'
);
assert.equal(resolveUserOrigin({ companySignupAutoCreated: true }), 'self_service');

assert.equal(isSelfServiceOrigin('admin'), false);
assert.equal(isSelfServiceOrigin('early_access'), true);
assert.equal(isSelfServiceOrigin('self_service'), true);

console.log('user-signup-origin: ok');
