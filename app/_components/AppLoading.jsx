'use client';

import { t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';

/**
 * Reusable loading indicator.
 * @param {{ locale?: string, label?: string, variant?: 'inline'|'block'|'panel' }} props
 */
export function AppLoading({ locale = 'pt-BR', label, variant = 'inline' }) {
  const text = label || t(locale, 'panel.common.loading');

  if (variant === 'panel') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.muted,
          fontFamily: FONTS.serif,
          fontSize: 15,
          padding: '24px',
        }}
      >
        {text}
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{ margin: '16px 0', color: C.muted, fontFamily: 'monospace', fontSize: 13 }}
      >
        {text}
      </p>
    );
  }

  return (
    <span role="status" aria-live="polite" style={{ color: C.muted, fontFamily: 'monospace', fontSize: 13 }}>
      {text}
    </span>
  );
}
