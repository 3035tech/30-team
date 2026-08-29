'use client';

import { LOCALES, LOCALE_COOKIE, localeLabel, normalizeLocale, t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { fieldSelectClass } from './form-control-styles';

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
        compact ? 'text-2xs' : 'text-xs'
      )}
    >
      <span className="font-mono uppercase tracking-wide">{t(current, 'common.language')}</span>
      <select
        value={current}
        onChange={(e) => changeLocale(e.target.value)}
        className={cn(
          fieldSelectClass,
          'border-brand-500/16 font-display text-xs',
          compact ? 'min-h-touch' : ''
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
