'use client';

import { t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';

/**
 * Spinner animado — bordas/tamanho inline; keyframes em globals.css (`team30spin`).
 * Não injeta <style> (inválido dentro de <button>).
 * @param {{ size?: number, color?: string, style?: object }} props
 */
export function Spinner({ size = 14, color, style }) {
  const stroke = color || 'currentColor';
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        boxSizing: 'border-box',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        border: `2.5px solid ${stroke}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'team30spin 0.65s linear infinite',
        flexShrink: 0,
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}

/**
 * Loading reutilizável (texto + spinner).
 * @param {{
 *   locale?: string,
 *   label?: string,
 *   variant?: 'inline'|'block'|'panel'|'button'|'banner',
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
        {withSpinner ? <Spinner size={20} color={C.purple} /> : null}
        {text}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: '8px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: `${C.purple}12`,
          border: `1px solid ${C.purple}40`,
          color: C.purple,
          fontFamily: FONTS.mono,
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        {withSpinner ? <Spinner size={16} color={C.purple} /> : null}
        <span>{text}</span>
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{
          margin: '10px 0 4px',
          color: C.muted,
          fontFamily: 'monospace',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {withSpinner ? <Spinner size={14} color={C.purple} /> : null}
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
        {withSpinner ? <Spinner size={14} color={C.purple} /> : null}
        <span>{text}</span>
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
      {withSpinner ? <Spinner size={14} color={C.purple} /> : null}
      {text}
    </span>
  );
}
