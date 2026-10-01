'use client';

import { useCallback, useEffect, useState } from 'react';
import { LOCALE_COOKIE, localeHtmlLang, normalizeLocale } from './i18n.js';
import { loadCatalog } from './i18n-client.js';

function readCookieLocale() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${LOCALE_COOKIE}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function useLocale(initialLocale = 'pt-BR') {
  const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale));

  /** Switches only after the new catalog is in the browser, so text never shows raw keys. */
  const setLocale = useCallback((next) => {
    const target = normalizeLocale(next);
    loadCatalog(target)
      .then(() => setLocaleState(target))
      .catch(() => setLocaleState(target));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('lang');
    const next = normalizeLocale(fromQuery || readCookieLocale() || initialLocale);
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
  }, [initialLocale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang(locale);
  }, [locale]);

  return [locale, setLocale];
}
