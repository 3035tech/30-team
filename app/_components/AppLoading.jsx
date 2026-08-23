'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';

/**
 * Spinner animado — reusa `.spinner` em globals.css; size/color só via style quando dinâmico.
 * @param {{ size?: number, color?: string, style?: object, className?: string }} props
 */
export function Spinner({ size = 14, color, style, className }) {
  const sizeOverride =
    size !== 14
      ? { width: size, height: size, minWidth: size, minHeight: size }
      : null;
  const colorOverride = color
    ? { color, borderColor: color, borderTopColor: 'transparent' }
    : null;
  const merged =
    sizeOverride || colorOverride || style
      ? { ...sizeOverride, ...colorOverride, ...style }
      : undefined;
  return (
    <span aria-hidden="true" className={cn('spinner', className)} style={merged} />
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
        className="flex min-h-[120px] items-center justify-center gap-2.5 p-6 font-display text-[15px] text-ink-muted"
      >
        {withSpinner ? <Spinner size={20} className="text-brand-500" /> : null}
        {text}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-1 mt-2 flex items-center gap-2.5 rounded-control border border-brand-500/25 bg-brand-500/10 px-3 py-2.5 font-mono text-xs leading-snug text-brand-500"
      >
        {withSpinner ? <Spinner size={16} className="text-brand-500" /> : null}
        <span>{text}</span>
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mb-1 mt-2.5 flex items-center gap-2 font-mono text-xs text-ink-muted"
      >
        {withSpinner ? <Spinner size={14} className="text-brand-500" /> : null}
        {text}
      </p>
    );
  }

  if (variant === 'button') {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 align-middle"
      >
        {withSpinner ? <Spinner size={14} className="text-brand-500" /> : null}
        <span>{text}</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 font-mono text-[13px] text-ink-muted"
    >
      {withSpinner ? <Spinner size={14} className="text-brand-500" /> : null}
      {text}
    </span>
  );
}
