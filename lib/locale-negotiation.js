/**
 * Edge-safe locale constants and browser negotiation (no catalogs imported).
 * `lib/i18n.js` re-exports the constants; `proxy.js` uses the negotiation.
 */
export const LOCALES = ['pt-BR', 'pt-PT', 'en', 'es-419', 'es-ES', 'fr-FR', 'de-DE'];
export const DEFAULT_LOCALE = 'pt-BR';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
/** Browser language outside `LOCALES` falls back to English. */
export const BROWSER_FALLBACK_LOCALE = 'en';
export const LOCALE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

const MAX_ACCEPT_LANGUAGE_ENTRIES = 20;

/** Stored/cookie value -> supported locale; unknown values fall back to DEFAULT_LOCALE. */
export function normalizeLocale(locale) {
  const raw = String(locale || '').trim().toLowerCase();
  if (raw === 'en' || raw === 'en-us' || raw === 'en_us') return 'en';
  if (raw === 'pt' || raw === 'pt-br' || raw === 'pt_br') return 'pt-BR';
  if (raw === 'pt-pt' || raw === 'pt_pt') return 'pt-PT';
  if (raw === 'es-es' || raw === 'es_es') return 'es-ES';
  if (raw === 'es' || raw === 'es-419' || raw === 'es_419' || raw === 'es-latam') return 'es-419';
  if (/^fr([-_]|$)/.test(raw)) return 'fr-FR';
  if (/^de([-_]|$)/.test(raw)) return 'de-DE';
  return DEFAULT_LOCALE;
}


/**
 * For content that only exists in Portuguese and English (Enneagram bank,
 * Motivators, AI prompts, print templates): Portuguese family -> pt-BR,
 * every other UI language -> en.
 */
export function contentLocale(locale) {
  return normalizeLocale(locale).startsWith('pt-') ? 'pt-BR' : 'en';
}

/** Maps one BCP 47 tag to a supported locale, or null when unsupported. */
export function matchSupportedLocale(tag) {
  const raw = String(tag || '').trim().toLowerCase().replace('_', '-');
  if (!raw) return null;
  const [lang, region] = raw.split('-');
  if (lang === 'en') return 'en';
  if (lang === 'pt') return region === 'pt' ? 'pt-PT' : 'pt-BR';
  if (lang === 'es') return region === 'es' ? 'es-ES' : 'es-419';
  if (lang === 'fr') return 'fr-FR';
  if (lang === 'de') return 'de-DE';
  return null;
}

/**
 * Picks the best supported locale from an Accept-Language header
 * (q-values respected). Unsupported or missing header -> English.
 */
export function localeFromAcceptLanguage(header) {
  const entries = String(header || '')
    .split(',')
    .slice(0, MAX_ACCEPT_LANGUAGE_ENTRIES)
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const entry of entries) {
    const match = matchSupportedLocale(entry.tag);
    if (match) return match;
  }
  return BROWSER_FALLBACK_LOCALE;
}
