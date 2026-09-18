import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('module hardening', () => {
  it('gates compensation surfaces with dedicated capabilities', () => {
    assert.match(source('app/api/admin/compensation/route.js'), /CAP\.COMPENSATION_VIEW/);
    assert.match(source('app/api/admin/candidates/[id]/compensation/route.js'), /CAP\.COMPENSATION_MANAGE/);
    assert.doesNotMatch(source('app/api/admin/compensation/route.js'), /CAP\.TEAM_VIEW/);
  });

  it('uses the canonical admin API wrapper on the migrated performance route', () => {
    const route = source('app/api/admin/performance-reviews/route.js');
    assert.match(route, /withAdminApi/);
    assert.match(route, /companyFrom: 'query'/);
    assert.match(route, /companyFrom: 'body'/);
  });

  it('ships the compatibility migration and template management endpoint', () => {
    assert.match(source('migrations/112_compensation_module_entitlement.sql'), /array_append/);
    const route = source('app/api/admin/pipeline-templates/[id]/route.js');
    assert.match(route, /export const PATCH/);
    assert.match(route, /export const DELETE/);
  });

  it('lets tenant managers use pipeline templates without a client-supplied company id', () => {
    const manager = source('app/dashboard/vacancies/PipelineTemplatesManager.jsx');
    assert.doesNotMatch(manager, /if \(!companyId \|\| !template\?\.id\)/);
    assert.match(manager, /companyId \? \{ companyId: Number\(companyId\) \} : \{\}/);
  });

  it('keeps recruiting UX telemetry tenant-scoped and free of vacancy copy', () => {
    const route = source('app/api/admin/recruiting-ux-event/route.js');
    assert.match(route, /CAP\.VACANCIES_MANAGE/);
    assert.match(route, /companyFrom: 'body'/);
    assert.doesNotMatch(route, /description|salary|candidate/i);
  });

  it('ships tenant-scoped recruiting ownership and saved views', () => {
    const migration = source('migrations/113_recruiting_workspace.sql');
    assert.match(migration, /owner_user_id/);
    assert.match(migration, /recruiting_candidate_assignments/);
    assert.match(migration, /recruiting_saved_views/);
    const route = source('app/api/admin/recruiting-workspace/route.js');
    assert.match(route, /withAdminApi/);
    assert.match(route, /CAP\.VACANCIES_MANAGE/);
  });

  it('keeps logout available in the fixed sidebar footer', () => {
    const dashboard = source('app/dashboard/DashboardClient.jsx');
    assert.match(dashboard, /border-t border-ink\/\[0\.08\] pt-2\.5/);
    assert.match(dashboard, /Icon name="logout"/);
    assert.match(dashboard, /onClick=\{\(\) => void logout\(\)\}/);
    assert.match(dashboard, /!navCollapsed \? <span>\{t\(locale, 'dashboard\.logout'\)\}/);
  });

  it('keeps the sidebar focused on destinations and utility actions', () => {
    const dashboard = source('app/dashboard/DashboardClient.jsx');
    assert.doesNotMatch(dashboard, /dashboard\.workShortcuts/);
    assert.match(dashboard, /<NavLink id="help" icon="help"/);
    assert.match(dashboard, /DASHBOARD_NAV_SECTION\.DEVELOPMENT/);
    assert.match(dashboard, /DASHBOARD_NAV_SECTION\.CULTURE_HR/);
  });

  it('organizes the vacancy workspace around recruiter tasks', () => {
    const vacancies = source('app/dashboard/tabs/VacanciesAdminTab.jsx');
    const navigation = source('app/dashboard/hooks/useDashboardNavigation.js');
    for (const section of ['pipeline', 'candidates', 'information', 'distribution', 'settings']) {
      assert.match(vacancies, new RegExp(`id: '${section}'`));
    }
    assert.doesNotMatch(vacancies, /detailSection === '(fit|analytics|referral|report)'/);
    assert.match(vacancies, /normalizeVacancyDetailSection/);
    assert.match(navigation, /vacancySection/);
  });

  it('keeps the team person workspace deep-linkable and destructive actions secondary', () => {
    const team = source('app/dashboard/tabs/TeamTab.jsx');
    assert.match(team, /personNavigationFromSection/);
    assert.match(team, /candidate: null, section: null/);
    assert.match(team, /section,\s*scroll: false/);
    assert.match(team, /panel\.team\.moreActions/);
    assert.match(team, /StatusToneChip tone="info"/);
    assert.match(team, /aria-label=\{`\$\{t\(locale, 'panel\.team\.openDetail'\)\}/);
    assert.match(team, /<IconActionTip label=\{t\(locale, 'panel\.team\.moreActions'\)\}>/);
  });

  it('keeps canonical admin chrome responsive and avoids nested DP tables', () => {
    const shared = source('app/dashboard/dashboard-shared.jsx');
    const filters = source('app/_components/AdminListFilters.jsx');
    const dp = source('app/dashboard/tabs/DpAdminTab.jsx');
    assert.match(shared, /sm:flex-row sm:items-start/);
    assert.match(shared, /overscroll-x-contain/);
    assert.match(shared, /role="region"/);
    assert.match(shared, /panel\.common\.dataTable/);
    assert.match(shared, /focus-visible:ring-2/);
    assert.match(filters, /font-ui text-sm/);
    assert.doesNotMatch(dp, /<AdminTableShell[^>]*>\s*<table/);
  });
});
