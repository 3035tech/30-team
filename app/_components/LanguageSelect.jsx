'use client';

import { LOCALES, LOCALE_COOKIE, localeLabel, normalizeLocale, t } from '../../lib/i18n';

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
        console.error('Erro ao persistir idioma:', e);
      }
    }
  };

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: compact ? '11px' : '12px', color: 'rgba(82,74,102,.72)' }}>
      <span style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{t(current, 'common.language')}</span>
      <select
        value={current}
        onChange={(e) => changeLocale(e.target.value)}
        style={{
          background: 'rgba(26,22,37,.05)',
          border: '1px solid rgba(124,58,237,.16)',
          borderRadius: '10px',
          padding: compact ? '7px 10px' : '9px 12px',
          color: 'rgba(52,44,70,.8)',
          fontSize: compact ? '11px' : '12px',
          cursor: 'pointer',
          fontFamily: "'Georgia','Times New Roman',serif",
        }}
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
