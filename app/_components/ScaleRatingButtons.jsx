'use client';

import { cn } from '../../lib/cn';

/**
 * Numeric scale / Likert picker (1…N). Shared across climate, pulse, scorecard.
 * Spans ≥10 (e.g. eNPS 0–10) default to compact: denser buttons + horizontal scroll on mobile.
 */
export function ScaleRatingButtons({
  min = 1,
  max = 5,
  value,
  onChange,
  disabled = false,
  className = '',
  ariaLabel,
  size = 'md',
  compact,
}) {
  const lo = Number(min);
  const hi = Number(max);
  const opts = [];
  for (let n = lo; n <= hi; n += 1) opts.push(n);
  const selected = value != null && value !== '' ? Number(value) : null;
  const isCompact = compact === true || (compact !== false && hi - lo >= 10);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        isCompact
          ? 'flex flex-nowrap gap-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]'
          : 'flex flex-wrap gap-1.5',
        className
      )}
    >
      {opts.map((n) => {
        const on = selected === n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange?.(n)}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control border font-mono tabular-nums disabled:cursor-default disabled:opacity-55',
              isCompact
                ? 'min-h-9 min-w-9 px-1.5 text-2xs'
                : cn(
                    'min-h-touch min-w-touch',
                    size === 'sm' ? 'px-2 text-2xs' : 'px-2.5 text-xs'
                  ),
              on
                ? 'border-brand-500/40 bg-brand-500/15 text-brand-600'
                : 'border-ink/12 bg-transparent text-ink-muted hover:bg-ink/[0.04]'
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
