import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMPANY_LICENSE, companyLicenseSummary } from '../../lib/company-license.js';
import { t } from '../../lib/i18n.js';
import { HELP_GUIDE_GROUPS, TAB_BY_HELP_SECTION, validateHelpGuideCoverage } from '../../lib/help-sections.js';

test('license number is a padded string without bigint precision loss', () => {
  const row = { licenseNumber: '1', licenseStartsAt: '2026-09-20T10:00:00Z', licenseExpiresAt: '2027-09-20T10:00:00Z', licenseExpired: false };
  assert.deepEqual(companyLicenseSummary(row), { number: '30T-EA-000001', plan: COMPANY_LICENSE.PLAN, startsAt: row.licenseStartsAt, expiresAt: row.licenseExpiresAt, status: COMPANY_LICENSE.ACTIVE });
  assert.equal(companyLicenseSummary({ ...row, licenseNumber: '9007199254740993' }).number, '30T-EA-9007199254740993');
  assert.equal(companyLicenseSummary({ ...row, licenseExpired: true }).status, COMPANY_LICENSE.EXPIRED);
  assert.equal(companyLicenseSummary({ licenseNumber: null }), null);
});

test('license and logout have bilingual help and UI copy', () => {
  assert.deepEqual(validateHelpGuideCoverage(), { ok: true });
  assert.equal(TAB_BY_HELP_SECTION.companyLicense, 'profile');
  assert.equal(HELP_GUIDE_GROUPS.filter((g) => g.sections.includes('companyLicense')).length, 1);
  for (const locale of ['pt-BR', 'en']) {
    for (const key of ['licenseTitle', 'licensePlan', 'licenseNumber', 'licenseStartsAt', 'licenseExpiresAt', 'licenseActive', 'licenseExpired', 'licenseEmployeeFree', 'licenseExpiredNotice', 'licenseNone']) {
      assert.notEqual(t(locale, `dashboard.${key}`), `dashboard.${key}`);
    }
    assert.notEqual(t(locale, 'employeeHome.logoutFailed'), 'employeeHome.logoutFailed');
  }
});
