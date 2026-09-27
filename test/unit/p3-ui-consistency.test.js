import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI_TYPE } from '../../lib/ui-typography.js';

test('P3 keeps all eight typography roles explicit', () => {
  assert.deepEqual(Object.keys(UI_TYPE).sort(), ['body', 'card', 'cta', 'label', 'page', 'section', 'status', 'supporting']);
  assert.match(UI_TYPE.page, /text-2xl/);
  assert.match(UI_TYPE.section, /text-xl/);
  assert.match(UI_TYPE.card, /text-base/);
  assert.match(UI_TYPE.supporting, /text-prose.*text-ink\/75/);
});

// Scope is the RH document's modules, not marketing, icons or chart geometry.
const modules = [
  "app/_components/PreOnboardingChecklistBlock.jsx",
  "app/_components/OnboardingCheckinsBlock.jsx",
  "app/_components/DevelopmentPlansBlock.jsx",
  "app/_components/StatMetricTile.jsx",
  "app/_components/RichTextView.jsx",
  "app/_components/LanguageSelect.jsx",
  "app/_components/AdminRichFormDrawer.jsx",
  "app/employee/pdi/EmployeePdiClient.jsx",
  "app/employee/lms/EmployeeLmsClient.jsx",
  "app/employee/EmployeeHomeClient.jsx",
  "app/_components/EmployeeSurveysSection.jsx",
  "app/_components/EmployeeOnboardingJourneySection.jsx",
  "app/_components/FormalCompetencyReviewsBlock.jsx",
  "app/_components/CompetencyCatalogBlock.jsx",
  "app/_components/CompetencyCategoriesBlock.jsx",
  "app/dashboard/tabs/JobRolesAdminTab.jsx",
  "app/_components/OkrHierarchyBlock.jsx",
  "app/dashboard/tabs/TeamTab.jsx",
  "app/dashboard/tabs/VacanciesAdminTab.jsx",
  "app/_components/PeopleManagementPanel.jsx",
  "app/_components/OrgManagerBlock.jsx",
  "app/_components/PersonDossierBlock.jsx",
  "app/_components/EmployeeFormalReviewsSection.jsx",
  "app/dashboard/tabs/PdiAdminTab.jsx",
  "app/dashboard/tabs/LmsAdminTab.jsx",
  "app/dashboard/tabs/PerformanceReviewsAdminTab.jsx",
  "app/dashboard/tabs/NineBoxBlock.jsx",
  "app/_components/MotivatorsRadarChart.jsx",
  "app/_components/RubricEditor.jsx"
];
for (const path of modules) {
  test(`P3 legibility: ${path}`, () => {
    const source = readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\btext-(?:2xs|xs)\b|\btext-ink-faint\b|\buppercase\b/);
  });
}
