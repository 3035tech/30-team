'use client';

import { t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';

/**
 * Spinner CSS (app/globals.css .spinner) — reutilizar em botões/ações longas.
 * @param {{ size?: number, style?: object, className?: string }} props
 */
export function Spinner({ size = 14, style, className = 'spinner' }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/**
 * Loading reutilizável (texto + spinner opcional).
 * @param {{
 *   locale?: string,
 *   label?: string,
 *   variant?: 'inline'|'block'|'panel'|'button',
 *   withSpinner?: boolean,
 * }} props
 */
export function AppLoading({
  locale = 'pt-BR',
  label,
  variant = 'inline',
  withSpinner = true,
}) {
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
          gap: '10px',
          color: C.muted,
          fontFamily: FONTS.serif,
          fontSize: 15,
          padding: '24px',
        }}
      >
        {withSpinner ? <Spinner size={18} /> : null}
        {text}
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{
          margin: '16px 0',
          color: C.muted,
          fontFamily: 'monospace',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {withSpinner ? <Spinner /> : null}
        {text}
      </p>
    );
  }

  if (variant === 'button') {
    return (
      <span
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          verticalAlign: 'middle',
        }}
      >
        {withSpinner ? <Spinner size={12} style={{ opacity: 0.85 }} /> : null}
        {text}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        color: C.muted,
        fontFamily: 'monospace',
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {withSpinner ? <Spinner /> : null}
      {text}
    </span>
  );
}
