import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPLOYEE_NOTIF } from '../../lib/employee-notification-catalog.js';
import { MOBILE_PUSH_DESTINATION, mobilePushDestinationFor, validExpoPushToken } from '../../lib/mobile-employee-push.js';

test('accepts only Expo push token shapes', () => {
  assert.equal(validExpoPushToken('ExpoPushToken[abc_DEF-123]'), true);
  assert.equal(validExpoPushToken('https://attacker.example/token'), false);
});

test('maps notification types to a closed mobile destination', () => {
  assert.equal(mobilePushDestinationFor(EMPLOYEE_NOTIF.KUDOS_RECEIVED), MOBILE_PUSH_DESTINATION.COMMUNITY);
  assert.equal(mobilePushDestinationFor(EMPLOYEE_NOTIF.DP_SIGNATURE_REQUESTED), MOBILE_PUSH_DESTINATION.DP);
  assert.equal(mobilePushDestinationFor('unknown'), MOBILE_PUSH_DESTINATION.TODAY);
});
