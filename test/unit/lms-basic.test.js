/**
 * Unit smoke for LMS next-cut helpers (no DB).
 */
import assert from 'node:assert/strict';
import { inferLmsContentKind } from '../../lib/lms.js';

assert.equal(inferLmsContentKind('https://youtu.be/abc'), 'youtube');
assert.equal(inferLmsContentKind('https://vimeo.com/1'), 'vimeo');
assert.equal(inferLmsContentKind('https://cdn.example.com/a.pdf'), 'pdf');
assert.equal(inferLmsContentKind('https://docs.example.com/guide'), 'link');

console.log('lms-basic.test.js OK');
