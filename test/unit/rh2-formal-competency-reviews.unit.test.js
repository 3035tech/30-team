/**
 * Unit: B-RH2-15 formal competency review constants + lib helpers (no DB).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  FORMAL_LIKERT_MAX,
  FORMAL_LIKERT_MIN,
  FORMAL_RATER_ROLE,
  FORMAL_RATER_ROLES,
  FORMAL_REVIEW_MODEL,
  FORMAL_REVIEW_MODELS,
  FORMAL_REVIEW_STATUS,
  FORMAL_REVIEW_STATUSES,
} from '../../lib/domain-status.js';
import { FORMAL_REVIEW_CAPS } from '../../lib/people/formal-competency-reviews.js';
import { t } from '../../lib/i18n.js';
import { validateHelpGuideCoverage } from '../../lib/help-sections.js';
import { ERR } from '../../lib/api-error-codes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('B-RH2-15 formal competency reviews', () => {
  it('exposes frozen model/status/rater constants', () => {
    assert.deepEqual([...FORMAL_REVIEW_MODELS].sort(), ['180', '360', '90']);
    assert.equal(FORMAL_REVIEW_MODEL.NINETY, '90');
    assert.ok(FORMAL_REVIEW_STATUSES.includes(FORMAL_REVIEW_STATUS.SENT));
    assert.ok(FORMAL_RATER_ROLES.includes(FORMAL_RATER_ROLE.UPWARD));
    assert.equal(FORMAL_LIKERT_MIN, 1);
    assert.equal(FORMAL_LIKERT_MAX, 5);
    assert.equal(FORMAL_REVIEW_CAPS.LIKERT_MIN, 1);
    assert.equal(FORMAL_REVIEW_CAPS.LIKERT_MAX, 5);
  });

  it('has API error codes for competency / formal review duplicates', () => {
    assert.equal(ERR.COMPETENCY_NAME_EXISTS, 'COMPETENCY_NAME_EXISTS');
    assert.equal(ERR.FORMAL_REVIEW_EXISTS, 'FORMAL_REVIEW_EXISTS');
  });

  it('ships migration 108 and public formal-review route', () => {
    const mig = readFileSync(join(root, 'migrations/108_formal_competency_reviews.sql'), 'utf8');
    assert.match(mig, /formal_review_cycles/);
    assert.match(mig, /company_competencies/);
    assert.match(mig, /formal_review_raters/);
    const route = readFileSync(
      join(root, 'app/api/public/formal-review/[token]/route.js'),
      'utf8'
    );
    assert.match(route, /resolveFormalRaterByToken/);
    assert.match(route, /submitFormalRaterByToken/);
  });

  it('i18n formal + help formalCompetency exist in pt-BR and en', () => {
    assert.match(t('pt-BR', 'performanceReviews.formal.title'), /competência/i);
    assert.match(t('en', 'performanceReviews.formal.title'), /competency/i);
    assert.ok(t('pt-BR', 'panel.help.formalCompetencyTitle'));
    assert.ok(t('en', 'panel.help.formalCompetencyTitle'));
    const coverage = validateHelpGuideCoverage();
    assert.equal(coverage.ok, true, JSON.stringify(coverage.missing || []));
  });

  it('copy has no space-emdash-space in formal strings', () => {
    const keys = [
      'performanceReviews.formal.subtitle',
      'performanceReviews.formal.publicHint',
      'performanceReviews.formal.catalogHint',
      'performanceReviews.formal.finalizeBlocked',
      'panel.help.formalCompetencyBody',
    ];
    for (const locale of ['pt-BR', 'en']) {
      for (const key of keys) {
        const s = t(locale, key);
        assert.equal(s.includes(' — '), false, `${locale} ${key}`);
      }
    }
  });
});
