/**
 * Offline unit: slugify + checkCompanySlugAvailable shape (no DB for slugify path).
 */
import assert from 'node:assert/strict';
import { slugify } from '../../lib/slugify.js';

assert.equal(slugify('Acme Corp!'), 'acme-corp');
assert.equal(slugify('  '), '');
assert.equal(slugify('Café'), 'cafe');
assert.equal(slugify('a'.repeat(60), { maxLength: 48 }).length, 48);

console.log('ok · company-slug-check (slugify)');
