import test from 'node:test';
import assert from 'node:assert/strict';

import { DASHBOARD_TAB_NAV } from '../../lib/dashboard-navigation.js';
import { HELP_GUIDE_SECTIONS } from '../../lib/help-sections.js';
import { helpMetaForTab } from '../../lib/help-screen-context.js';

test('every dashboard screen has a valid contextual Guide destination', () => {
  for (const tab of Object.keys(DASHBOARD_TAB_NAV)) {
    const meta = helpMetaForTab(tab);
    assert.ok(meta, `missing contextual help metadata for ${tab}`);
    assert.ok(meta.guideSections.length > 0, `missing Guide destination for ${tab}`);
    for (const section of meta.guideSections) {
      assert.ok(HELP_GUIDE_SECTIONS.includes(section), `unknown Guide section ${section} for ${tab}`);
    }
  }
});
