'use client';

import { LOCALES, LOCALE_COOKIE, localeLabel, normalizeLocale, t } from '../../lib/i18n';
import { cn } from '../../lib/cn';

export default function LanguageSelect({ locale, onChange, persistUser = false, compact = false }) {
  const current = normalizeLocale(locale);

  const changeLocale = async (nextRaw) => {
    const next = normalizeLocale(nextRaw);
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    onChange?.(next);
    if (persistUser) {
      try {
        await fetch('/api/me/locale', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: next }),
        });
      } catch (e) {
        console.error('Failed to persist locale:', e);
      }
    }
  };

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 text-ink-muted',
        compact ? 'text-[11px]' : 'text-xs'
      )}
    >
      <span className="font-mono uppercase tracking-wide">{t(current, 'common.language')}</span>
      <select
        value={current}
        onChange={(e) => changeLocale(e.target.value)}
        className={cn(
          'cursor-pointer rounded-control border border-brand-500/16 bg-ink/[0.05] font-display text-xs text-ink-muted',
          compact ? 'min-h-touch px-3 py-2.5' : 'px-3 py-[9px]'
        )}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {localeLabel(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}
