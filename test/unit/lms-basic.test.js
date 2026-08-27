/**
 * Unit — basic LMS helpers (B-2400).
 */
import assert from 'node:assert/strict';
import { inferLmsContentKind } from '../../lib/lms.js';

assert.equal(inferLmsContentKind('https://youtu.be/abc'), 'youtube');
assert.equal(inferLmsContentKind('https://www.youtube.com/watch?v=abc'), 'youtube');
assert.equal(inferLmsContentKind('https://vimeo.com/123'), 'vimeo');
assert.equal(inferLmsContentKind('https://cdn.example.com/a.pdf'), 'pdf');
assert.equal(inferLmsContentKind('https://docs.example.com/guide'), 'link');

console.log('lms-basic.test.js OK');
