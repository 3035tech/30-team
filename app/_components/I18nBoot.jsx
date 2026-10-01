'use client';

import { use } from 'react';
import { ensureCatalogs } from '../../lib/i18n-client';

/**
 * Holds rendering (and hydration) until the catalogs of `locales` are in the browser.
 * No-op on the server, which always has every catalog. Wrap subtrees whose locale
 * does not come from the locale cookie (session locale, `?locale=`).
 */
export function I18nBoot({ locales, children }) {
  const loading = ensureCatalogs(locales);
  if (loading) use(loading);
  return children;
}
