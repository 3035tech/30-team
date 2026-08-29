'use client';

import { cn } from '../../lib/cn';

/**
 * Numeric scale / Likert picker (1…N). Shared across climate, pulse, scorecard.
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
}) {
  const lo = Number(min);
  const hi = Number(max);
  const opts = [];
  for (let n = lo; n <= hi; n += 1) opts.push(n);
  const selected = value != null && value !== '' ? Number(value) : null;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-1.5', className)}
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
              'inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-control border font-mono tabular-nums disabled:cursor-default disabled:opacity-55',
              size === 'sm' ? 'px-2 text-2xs' : 'px-2.5 text-xs',
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
