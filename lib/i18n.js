import ptBR from './i18n/catalogs/pt-BR.js';
import enUS from './i18n/catalogs/en-US.js';
import { REGIONAL_MESSAGES } from './i18n/regional.js';

/**
 * UI locales. `en` remains the internal compatibility key used by older
 * sessions and APIs; it is presented as English (US) in the UI.
 */
export const LOCALES = ['pt-BR', 'pt-PT', 'en', 'es-419'];
export const DEFAULT_LOCALE = 'pt-BR';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function normalizeLocale(locale) {
  const raw = String(locale || '').trim().toLowerCase();
  if (raw === 'en' || raw === 'en-us' || raw === 'en_us') return 'en';
  if (raw === 'pt' || raw === 'pt-br' || raw === 'pt_br') return 'pt-BR';
  if (raw === 'pt-pt' || raw === 'pt_pt') return 'pt-PT';
  if (raw === 'es' || raw === 'es-419' || raw === 'es_419' || raw === 'es-latam') return 'es-419';
  return DEFAULT_LOCALE;
}

export function localeLabel(locale) {
  switch (normalizeLocale(locale)) {
    case 'pt-PT': return 'Português (Portugal)';
    case 'en': return 'English (US)';
    case 'es-419': return 'Español (LatAm)';
    default: return 'Português (Brasil)';
  }
}

export function localeHtmlLang(locale) {
  switch (normalizeLocale(locale)) {
    case 'pt-PT': return 'pt-PT';
    case 'en': return 'en-US';
    case 'es-419': return 'es-419';
    default: return 'pt-BR';
  }
}

/** Region defaults are intentionally separate from language selection. */
export const LOCALE_REGION_CONFIG = Object.freeze({
  'pt-BR': Object.freeze({ language: 'pt', region: 'BR', currency: 'BRL', timezone: 'America/Sao_Paulo' }),
  'pt-PT': Object.freeze({ language: 'pt', region: 'PT', currency: 'EUR', timezone: 'Europe/Lisbon' }),
  en: Object.freeze({ language: 'en', region: 'US', currency: 'USD', timezone: 'America/New_York' }),
  'es-419': Object.freeze({ language: 'es', region: '419', currency: 'USD', timezone: 'America/Mexico_City' }),
});

export function localeRegionConfig(locale) {
  return LOCALE_REGION_CONFIG[normalizeLocale(locale)] || LOCALE_REGION_CONFIG[DEFAULT_LOCALE];
}

export function localeNumberLocale(locale) {
  return localeHtmlLang(locale);
}

export function localeCurrency(locale) {
  return localeRegionConfig(locale).currency;
}

export const messages = { 'pt-BR': ptBR, en: enUS };

function readMessage(catalog, parts) {
  let node = catalog;
  for (const part of parts) node = node?.[part];
  return node;
}

function localeCatalogs(locale) {
  const loc = normalizeLocale(locale);
  const fallback = loc === 'pt-PT' ? 'pt-BR' : loc === 'es-419' ? 'en' : null;
  return [REGIONAL_MESSAGES[loc], messages[loc], fallback ? messages[fallback] : null, messages[DEFAULT_LOCALE]];
}

export function interpolate(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
    const val = values[key];
    return val == null ? '' : String(val);
  });
}

export function t(locale, path, values = {}) {
  const parts = String(path || '').split('.');
  let node;
  for (const catalog of localeCatalogs(locale)) {
    node = readMessage(catalog, parts);
    if (node != null) break;
  }
  return interpolate(node ?? path, values);
}

export function errorMessage(locale, code, fallback = '') {
  return t(locale, `errors.${code}`) || fallback || t(locale, 'errors.INTERNAL');
}
