import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { t } from '../../lib/i18n.js';
import {
  HELP_GUIDE_GROUPS,
  HELP_GUIDE_SECTIONS,
  validateHelpGuideCoverage,
} from '../../lib/help-sections.js';

describe('help guide information architecture', () => {
  it('places every guide section in exactly one presentation group', () => {
    const grouped = HELP_GUIDE_GROUPS.flatMap((group) => group.sections);
    assert.equal(grouped.length, HELP_GUIDE_SECTIONS.length);
    assert.deepEqual(new Set(grouped), new Set(HELP_GUIDE_SECTIONS));
  });

  it('keeps category and hub copy translated', () => {
    assert.deepEqual(validateHelpGuideCoverage(), { ok: true });
    for (const locale of ['pt-BR', 'en']) {
      for (const group of HELP_GUIDE_GROUPS) {
        assert.notEqual(t(locale, `panel.help.category_${group.id}`), `panel.help.category_${group.id}`);
      }
      for (const key of ['searchLabel', 'searchPlaceholder', 'quickStartTitle', 'chooseTopic', 'articleSteps', 'openFeature']) {
        assert.notEqual(t(locale, `panel.help.${key}`), `panel.help.${key}`);
      }
    }
  });
});
