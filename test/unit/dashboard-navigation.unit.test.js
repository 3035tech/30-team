import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DASHBOARD_NAV_SECTIONS,
  DASHBOARD_NAV_SECTION,
  DASHBOARD_TAB_NAV,
  getDashboardSection,
  getDashboardTabNav,
  getDefaultDashboardSections,
} from '../../lib/dashboard-navigation.js';

describe('dashboard navigation information architecture', () => {
  it('keeps at most six product groups', () => {
    assert.equal(DASHBOARD_NAV_SECTIONS.length, 6);
    assert.equal(new Set(DASHBOARD_NAV_SECTIONS.map((item) => item.id)).size, 6);
  });

  it('assigns every product tab to a known section', () => {
    const known = new Set(DASHBOARD_NAV_SECTIONS.map((item) => item.id));
    for (const [tab, nav] of Object.entries(DASHBOARD_TAB_NAV)) {
      if (tab === 'help') continue;
      assert.ok(known.has(nav.section), `${tab} must have a known navigation section`);
    }
  });

  it('opens only the active group by default', () => {
    const state = getDefaultDashboardSections('vacancies');
    assert.equal(state[DASHBOARD_NAV_SECTION.RECRUITING], true);
    assert.equal(Object.values(state).filter(Boolean).length, 1);
  });

  it('uses the same ownership map for tabs and breadcrumbs', () => {
    assert.equal(getDashboardSection('lms'), DASHBOARD_NAV_SECTION.DEVELOPMENT);
    assert.equal(getDashboardTabNav('team').labelKey, 'dashboard.team');
    assert.deepEqual(getDashboardTabNav('unknown'), DASHBOARD_TAB_NAV.overview);
  });
});

