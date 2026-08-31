'use client';

import { cn } from '../../lib/cn';

/**
 * Horizontal stacked segments (e.g. below / in-band / above). CSS-only; no chart kit.
 * Uses flex-grow so proportions stay accurate (no min-% inflation).
 *
 * @param {{
 *   segments: Array<{ id: string, value: number, toneClass: string, label?: string }>,
 *   height?: number,
 *   className?: string,
 *   'aria-label'?: string,
 * }} props
 */
export function StackedSegmentBar({
  segments = [],
  height = 10,
  className = '',
  'aria-label': ariaLabel,
}) {
  const parts = (Array.isArray(segments) ? segments : []).filter(
    (s) => s && (Number(s.value) || 0) > 0
  );
  const total = parts.reduce((n, s) => n + (Number(s.value) || 0), 0);
  if (total <= 0) {
    return (
      <div
        className={cn('w-full overflow-hidden rounded-full bg-ink/[0.06]', className)}
        style={{ height }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn('flex w-full overflow-hidden rounded-full bg-ink/[0.06]', className)}
      style={{ height }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      {parts.map((s) => {
        const value = Number(s.value) || 0;
        return (
          <div
            key={s.id}
            className={cn('h-full min-w-[1px]', s.toneClass)}
            style={{ flexGrow: value, flexBasis: 0 }}
            title={s.label ? `${s.label}: ${value}` : undefined}
          />
        );
      })}
    </div>
  );
}
