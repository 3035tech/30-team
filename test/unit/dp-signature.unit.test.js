/**
 * B-2724 admission signature constants (offline).
 * Run: node --test test/unit/dp-signature.unit.test.js
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DP_DOCUMENT_SIGNATURE_STATUS } from '../../lib/domain-status.js';
import {
  DP_SIGNATURE_CONSENT_VERSION,
  DP_SIGNATURE_STROKE_MAX_CHARS,
} from '../../lib/people/employee-dp.js';

/** Minimal 1×1 PNG data URL (valid prefix for stroke gate). */
export const TINY_STROKE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('DP signature domain', () => {
  it('exposes closed signature statuses', () => {
    assert.equal(DP_DOCUMENT_SIGNATURE_STATUS.NONE, 'none');
    assert.equal(DP_DOCUMENT_SIGNATURE_STATUS.REQUESTED, 'requested');
    assert.equal(DP_DOCUMENT_SIGNATURE_STATUS.SIGNED, 'signed');
    assert.equal(DP_DOCUMENT_SIGNATURE_STATUS.WAIVED, 'waived');
  });

  it('pins consent version for audit', () => {
    assert.equal(DP_SIGNATURE_CONSENT_VERSION, 'v1-internal-ack');
  });

  it('caps stroke PNG data URL length', () => {
    assert.equal(DP_SIGNATURE_STROKE_MAX_CHARS, 200000);
    assert.ok(TINY_STROKE_PNG.startsWith('data:image/png;base64,'));
    assert.ok(TINY_STROKE_PNG.length >= 64);
    assert.ok(TINY_STROKE_PNG.length < DP_SIGNATURE_STROKE_MAX_CHARS);
  });
});
