/**
 * Soft apply + public vacancy CTA helpers (B-RH1-13).
 */
import assert from 'node:assert/strict';
import { publicVacancyCanApply } from '../../lib/public-vacancy-lifecycle.js';

function testCanApplyWithoutAssessmentLink() {
  assert.equal(
    publicVacancyCanApply({
      vacancyId: 42,
      status: 'open',
      targetDate: null,
    }),
    true,
    'open public vacancy can soft-apply without /v link'
  );
  assert.equal(
    publicVacancyCanApply({
      vacancyId: 42,
      status: 'closed',
      targetDate: null,
    }),
    false
  );
  assert.equal(publicVacancyCanApply(null), false);
}

testCanApplyWithoutAssessmentLink();
console.log('ok: public-vacancy-apply.unit');
