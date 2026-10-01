import { catalogKeyForLocale, DEFAULT_LOCALE, messages, normalizeLocale, registerCatalog } from './i18n.js';

const LOADERS = {
  'pt-BR': () => import(/* webpackChunkName: "i18n-pt-BR" */ './i18n/catalogs/pt-BR.js'),
  en: () => import(/* webpackChunkName: "i18n-en-US" */ './i18n/catalogs/en-US.js'),
  'fr-FR': () => import(/* webpackChunkName: "i18n-fr-FR" */ './i18n/catalogs/fr-FR.js'),
  'de-DE': () => import(/* webpackChunkName: "i18n-de-DE" */ './i18n/catalogs/de-DE.js'),
};

const pending = new Map();

/**
 * Loads the full catalog a locale needs. Returns `null` when it is already
 * available (always on the server), otherwise a stable promise for `use()`.
 */
export function ensureCatalog(locale) {
  const key = catalogKeyForLocale(locale);
  if (messages[key]) return null;
  if (!pending.has(key)) {
    pending.set(
      key,
      LOADERS[key]()
        .then((mod) => registerCatalog(key, mod.default))
        .catch((error) => {
          pending.delete(key);
          throw error;
        })
    );
  }
  return pending.get(key);
}

const combined = new Map();

/** Like `ensureCatalog` for several locales; the promise is stable per locale set. */
export function ensureCatalogs(locales) {
  const waits = (locales || []).map((locale) => ensureCatalog(locale)).filter(Boolean);
  if (waits.length === 0) return null;
  if (waits.length === 1) return waits[0];
  const key = (locales || []).map(catalogKeyForLocale).sort().join('|');
  if (!combined.has(key)) {
    const all = Promise.all(waits);
    all.finally(() => combined.delete(key)).catch(() => {});
    combined.set(key, all);
  }
  return combined.get(key);
}

/** Resolves once the locale's catalog is loaded (for locale switches). */
export async function loadCatalog(locale) {
  await ensureCatalog(locale);
  return normalizeLocale(locale);
}

// Start the download as soon as this module is evaluated, before hydration reaches I18nBoot.
if (typeof document !== 'undefined') {
  for (const locale of [document.documentElement.lang, DEFAULT_LOCALE]) {
    if (locale) ensureCatalog(locale)?.catch(() => {});
  }
}
