'use client';

import { cn } from '../../lib/cn';

/**
 * Thin progress / fill meter. Prefer over ad-hoc track+fill divs.
 * Pass either `value`+`max` or `percent` (0–100).
 */
export function MeterBar({
  value = 0,
  max = 100,
  percent = null,
  color = null,
  toneClass = 'bg-brand-500',
  height = 6,
  className = '',
  trackClassName = 'bg-ink/[0.08]',
  'aria-label': ariaLabel,
}) {
  const pct =
    percent != null && Number.isFinite(Number(percent))
      ? Math.max(0, Math.min(100, Number(percent)))
      : Math.max(0, Math.min(100, (Number(value) / Math.max(Number(max) || 1, 1)) * 100));
  const fillStyle = color
    ? {
        width: `${pct}%`,
        height: '100%',
        borderRadius: height / 2,
        background: typeof color === 'string' && color.includes('gradient')
          ? color
          : `linear-gradient(90deg,${color}99,${color})`,
      }
    : { width: `${pct}%`, height: '100%', borderRadius: height / 2 };

  return (
    <div
      className={cn('ui-meter-track w-full overflow-hidden', trackClassName, className)}
      style={{ height, borderRadius: height / 2 }}
      role={ariaLabel ? 'meter' : undefined}
      aria-label={ariaLabel}
      aria-valuenow={ariaLabel ? Math.round(pct) : undefined}
      aria-valuemin={ariaLabel ? 0 : undefined}
      aria-valuemax={ariaLabel ? 100 : undefined}
    >
      <div
        className={cn('ui-meter-fill h-full transition-[width] duration-200', !color && toneClass)}
        style={fillStyle}
      />
    </div>
  );
}
