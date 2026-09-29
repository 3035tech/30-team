import assert from 'node:assert/strict';

const { localeFromAcceptLanguage, matchSupportedLocale, LOCALES } = await import(
  '../../lib/locale-negotiation.js'
);
const i18n = await import('../../lib/i18n.js');

assert.deepEqual(i18n.LOCALES, LOCALES);
assert.equal(i18n.LOCALE_COOKIE, 'NEXT_LOCALE');

assert.equal(localeFromAcceptLanguage('pt-BR,pt;q=0.9,en;q=0.8'), 'pt-BR');
assert.equal(localeFromAcceptLanguage('pt-PT,pt;q=0.9'), 'pt-PT');
assert.equal(localeFromAcceptLanguage('pt'), 'pt-BR');
assert.equal(localeFromAcceptLanguage('es-MX,es;q=0.9'), 'es-419');
assert.equal(localeFromAcceptLanguage('es-AR'), 'es-419');
assert.equal(localeFromAcceptLanguage('es-ES'), 'es-ES');
assert.equal(localeFromAcceptLanguage('en-GB,en;q=0.9'), 'en');

assert.equal(localeFromAcceptLanguage('fr-FR,fr;q=0.9,de;q=0.8'), 'en');
assert.equal(localeFromAcceptLanguage('ja,es;q=0.5'), 'es-419');
assert.equal(localeFromAcceptLanguage('en;q=0.3,pt-BR;q=0.9'), 'pt-BR');
assert.equal(localeFromAcceptLanguage('pt-BR;q=0,fr'), 'en');
assert.equal(localeFromAcceptLanguage(''), 'en');
assert.equal(localeFromAcceptLanguage(null), 'en');
assert.equal(localeFromAcceptLanguage('*'), 'en');

assert.equal(matchSupportedLocale('pt_BR'), 'pt-BR');
assert.equal(matchSupportedLocale('it-IT'), null);

console.log('locale negotiation unit: ok');
