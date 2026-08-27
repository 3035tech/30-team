/**
 * Smoke B-2100 — Guia demoRoteiro keys + jobRoles empty copy (pt-BR + en).
 * Run: node --test test/unit/b2100-ux-consistency.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../../lib/i18n.js';

describe('B-2100 UX consistency', () => {
  for (const locale of ['pt-BR', 'en']) {
    it(`demoRoteiro help keys (${locale})`, () => {
      assert.ok(String(t(locale, 'panel.help.demoRoteiroTitle')).length > 4);
      assert.ok(String(t(locale, 'panel.help.demoRoteiroBody')).length > 20);
      for (let i = 1; i <= 7; i += 1) {
        const step = t(locale, `panel.help.demoRoteiroStep${i}`);
        assert.ok(String(step).length > 10, `missing step ${i}`);
        assert.notEqual(step, `panel.help.demoRoteiroStep${i}`);
      }
    });

    it(`jobRoles listEmptyDesc (${locale})`, () => {
      const desc = t(locale, 'jobRoles.listEmptyDesc');
      assert.ok(String(desc).length > 10);
      assert.notEqual(desc, 'jobRoles.listEmptyDesc');
    });
  }
});
