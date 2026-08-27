/**
 * Smoke B-2200 — roster empty + Overview ops intel help keys.
 * Run: node --test test/unit/b2200-roster-grids.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../../lib/i18n.js';
import { ROSTER_SCOPE } from '../../lib/domain-status.js';

describe('B-2200 roster + grids', () => {
  it('roster scope constants', () => {
    assert.equal(ROSTER_SCOPE.INTERNAL, 'internal');
    assert.equal(ROSTER_SCOPE.RECRUITING, 'recruiting');
    assert.equal(ROSTER_SCOPE.ALL, 'all');
  });

  for (const locale of ['pt-BR', 'en']) {
    it(`roster empty + help keys (${locale})`, () => {
      assert.ok(String(t(locale, 'dashboard.rosterEmptyTitle')).length > 4);
      assert.ok(String(t(locale, 'dashboard.rosterCtaRecruiting')).length > 4);
      assert.ok(String(t(locale, 'panel.overview.opsIntelExpand')).length > 2);
      assert.ok(String(t(locale, 'panel.admin.nameSearchPh')).length > 4);
      assert.ok(String(t(locale, 'panel.admin.companiesSearchPh')).length > 4);
      for (let i = 1; i <= 4; i += 1) {
        const step = t(locale, `panel.help.b2200RosterGridsStep${i}`);
        assert.notEqual(step, `panel.help.b2200RosterGridsStep${i}`);
      }
    });
  }
});
