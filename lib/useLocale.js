'use client';

import { useEffect, useState } from 'react';
import { LOCALE_COOKIE, normalizeLocale } from './i18n';

function readCookieLocale() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${LOCALE_COOKIE}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function useLocale(initialLocale = 'pt-BR') {
  const [locale, setLocale] = useState(() => normalizeLocale(initialLocale));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('lang');
    const next = normalizeLocale(fromQuery || readCookieLocale() || initialLocale);
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
  }, [initialLocale]);

  return [locale, setLocale];
}
