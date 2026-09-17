/**
 * Unit: company commercial modules (SKU allow-list above CAP).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  COMPANY_MODULE,
  COMPANY_MODULES,
  capsForCompanyModules,
  employeeSectionAllowedByCompanyModules,
  intersectCapsWithCompanyModules,
  modulesSelectionEqual,
  modulesSelectionForPersist,
  modulesSelectionForUi,
  normalizeEnabledModules,
  tabAllowedByCompanyModules,
} from '../../lib/company-modules.js';
import { t } from '../../lib/i18n.js';
import { validateHelpGuideCoverage } from '../../lib/help-sections.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('company modules entitlements', () => {
  it('normalize: null / empty → unrestricted; forces core', () => {
    assert.equal(normalizeEnabledModules(null), null);
    assert.equal(normalizeEnabledModules([]), null);
    assert.deepEqual(normalizeEnabledModules(['performance']), ['core', 'performance'].sort());
    assert.ok(COMPANY_MODULES.includes(COMPANY_MODULE.CORE));
  });

  it('persist selection: all-on → null; subset keeps core', () => {
    assert.equal(modulesSelectionForPersist([...COMPANY_MODULES]), null);
    assert.deepEqual(modulesSelectionForPersist(['performance']).sort(), ['core', 'performance']);
    assert.deepEqual(modulesSelectionForUi(null).sort(), [...COMPANY_MODULES].sort());
    assert.ok(modulesSelectionForUi(['climate']).includes('core'));
  });

  it('modulesSelectionEqual is order-insensitive', () => {
    assert.equal(modulesSelectionEqual(['core', 'climate'], ['climate', 'core']), true);
    assert.equal(modulesSelectionEqual(['core'], ['core', 'climate']), false);
  });

  it('intersect caps: null modules leave caps; allow-list drops others', () => {
    const caps = new Set(['overview.view', 'performance.view', 'climate.view', 'profile.self']);
    assert.equal(intersectCapsWithCompanyModules(caps, null).has('climate.view'), true);
    const next = intersectCapsWithCompanyModules(caps, ['core', 'performance']);
    assert.equal(next.has('performance.view'), true);
    assert.equal(next.has('climate.view'), false);
    assert.equal(next.has('profile.self'), true);
    assert.equal(next.has('overview.view'), true);
  });

  it('tab and employee section gates', () => {
    assert.equal(tabAllowedByCompanyModules(null, 'climate'), true);
    assert.equal(tabAllowedByCompanyModules(['core'], 'climate'), false);
    assert.equal(tabAllowedByCompanyModules(['core', 'climate'], 'climate'), true);
    assert.equal(tabAllowedByCompanyModules(['core'], 'users'), true);
    assert.equal(employeeSectionAllowedByCompanyModules(['core'], 'okr'), false);
    assert.equal(employeeSectionAllowedByCompanyModules(['core', 'performance'], 'formalReviews'), true);
    assert.equal(employeeSectionAllowedByCompanyModules(['core', 'dp'], 'timeClock'), true);
    assert.equal(employeeSectionAllowedByCompanyModules(['core'], 'profile'), true);
  });

  it('capsForCompanyModules returns Set when restricted', () => {
    const set = capsForCompanyModules(['core', 'recruiting']);
    assert.ok(set instanceof Set);
    assert.equal(set.has('vacancies.view'), true);
    assert.equal(set.has('performance.view'), false);
  });

  it('ships migration 109 + onboarding i18n + help', () => {
    const mig = readFileSync(join(root, 'migrations/109_company_module_entitlements.sql'), 'utf8');
    assert.match(mig, /enabled_modules/);
    assert.match(t('pt-BR', 'onboarding.modules.title'), /módulos/i);
    assert.match(t('en', 'onboarding.modules.title'), /modules/i);
    assert.ok(t('pt-BR', 'panel.help.companyModulesTitle'));
    assert.ok(t('en', 'panel.help.companyModulesTitle'));
    const coverage = validateHelpGuideCoverage();
    assert.equal(coverage.ok, true, JSON.stringify(coverage.missing || []));
  });

  it('copy has no space-emdash-space in module strings', () => {
    const keys = [
      'onboarding.modules.body',
      'onboarding.modules.hint',
      'onboarding.modules.allOn',
      'onboarding.modules.selectAll',
      'dashboard.profileModulesHint',
      'panel.help.companyModulesBody',
    ];
    for (const locale of ['pt-BR', 'en']) {
      for (const key of keys) {
        const s = t(locale, key);
        assert.equal(s.includes(' — '), false, `${locale} ${key}`);
      }
    }
  });
});
