/**
 * Display dates for UI (pt-BR vs en) — never concatenate 'T00:00:00Z' onto ISO strings.
 *
 * Storage / forms stay ISO date-only `YYYY-MM-DD`.
 * Display: pt-BR → dd/mm/yyyy · en → mm/dd/yyyy (via Intl).
 */

import { localeHtmlLang, normalizeLocale } from './i18n.js';

/**
 * Normalize any date-ish value to `YYYY-MM-DD` or null.
 * Handles: Date, `YYYY-MM-DD`, ISO datetime, pg DATE serialized as ISO.
 * @param {unknown} value
 * @returns {string|null}
 */
export function toDateOnlyIso(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Format a calendar date for display (no timezone shift for date-only values).
 * Always numeric mask by locale: pt-BR → dd/mm/yyyy · en → mm/dd/yyyy.
 * Do not pass month: 'short'|'long' for product chips/tables (descriptive).
 * @param {unknown} value
 * @param {string} [locale='pt-BR']
 * @param {{ fallback?: string, month?: 'numeric'|'2-digit'|'short'|'long' }} [opts]
 * @returns {string}
 */
export function formatDisplayDate(value, locale = 'pt-BR', opts = {}) {
  const fallback = opts.fallback != null ? opts.fallback : '—';
  const iso = toDateOnlyIso(value);
  if (!iso) return fallback;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return fallback;
  const local = new Date(y, m - 1, d);
  if (Number.isNaN(local.getTime())) return fallback;

  const lang = localeHtmlLang(normalizeLocale(locale));
  // Product default: numeric mask only (ignore descriptive short/long).
  const month =
    opts.month === 'numeric' || opts.month === '2-digit' ? opts.month : '2-digit';
  return local.toLocaleDateString(lang, {
    day: '2-digit',
    month,
    year: 'numeric',
  });
}

/**
 * Format date+time for display (uses local timezone of the Instant).
 * @param {unknown} value
 * @param {string} [locale='pt-BR']
 * @param {{ fallback?: string }} [opts]
 */
export function formatDisplayDateTime(value, locale = 'pt-BR', opts = {}) {
  const fallback = opts.fallback != null ? opts.fallback : '—';
  if (value == null || value === '') return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  const lang = localeHtmlLang(normalizeLocale(locale));
  return d.toLocaleString(lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
