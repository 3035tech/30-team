import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCALES,
  localeHtmlLang,
  localeAccessibleLabel,
  localeFlag,
  localeRegionConfig,
  localeLabel,
  normalizeLocale,
  t,
} from '../../lib/i18n.js';

test('regional locales normalize with stable aliases and region metadata', () => {
  assert.deepEqual(LOCALES, ['pt-BR', 'pt-PT', 'en', 'es-419']);
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('pt_pt'), 'pt-PT');
  assert.equal(normalizeLocale('es'), 'es-419');
  assert.equal(localeHtmlLang('en'), 'en-US');
  assert.equal(localeHtmlLang('es-419'), 'es-419');
  assert.equal(localeRegionConfig('pt-PT').currency, 'EUR');
  assert.equal(localeRegionConfig('es-419').region, '419');
  assert.equal(localeLabel('pt-PT'), 'Português');
  assert.equal(localeAccessibleLabel('pt-PT'), 'Português, Portugal');
  assert.equal(localeFlag('pt-BR'), '🇧🇷');
  assert.equal(localeFlag('es-419'), '🌎');
});

test('regional catalogs override high-traffic copy and fall back safely', () => {
  assert.equal(t('pt-PT', 'pricing.navEarly'), 'Experimentar 30 dias grátis');
  assert.equal(t('pt-BR', 'pricing.planName'), '30Grow Essencial');
  assert.equal(t('en', 'pricing.planName'), '30Grow Essentials');
  assert.equal(t('pt-BR', 'pricing.completePlanName'), '30Grow Completo');
  assert.equal(t('en', 'pricing.completePlanName'), '30Grow Complete');
  assert.equal(t('es-419', 'pricing.navEarly'), 'Probar 30 días gratis');
  assert.equal(t('es-419', 'pricing.completePlanName'), '30Grow Completo');
  assert.equal(t('es-419', 'common.closeMenu'), 'Close menu');
  assert.notEqual(t('es-419', 'pricing.planName'), 'pricing.planName');
});
