'use client';

import { cn } from '../../lib/cn';

/** Semantic tones for pills / chips (not brand CTA, not pipeline stage colors). */
export const STATUS_TONES = Object.freeze([
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
  'brand',
]);

/**
 * Tailwind classes for a tone chip.
 * @param {'success'|'warning'|'danger'|'info'|'neutral'|'brand'} tone
 * @param {{ bordered?: boolean }} [opts]
 */
export function statusToneClass(tone, opts = {}) {
  const bordered = opts.bordered !== false;
  switch (tone) {
    case 'success':
      return bordered
        ? 'border-success/25 bg-success/10 text-success'
        : 'bg-success/10 text-success';
    case 'warning':
      return bordered
        ? 'border-warning/25 bg-warning/10 text-warning'
        : 'bg-warning/10 text-warning';
    case 'danger':
      return bordered
        ? 'border-danger/25 bg-danger/10 text-danger'
        : 'bg-danger/10 text-danger';
    case 'info':
      return bordered
        ? 'border-info/25 bg-info/10 text-info'
        : 'bg-info/10 text-info';
    case 'brand':
      return bordered
        ? 'border-brand-500/25 bg-brand-500/10 text-brand-600'
        : 'bg-brand-500/10 text-brand-600';
    case 'neutral':
    default:
      return bordered
        ? 'border-ink/12 bg-ink/[0.04] text-ink-muted'
        : 'bg-ink/[0.04] text-ink-muted';
  }
}

/**
 * Compact semantic status pill used across admin lists and cards.
 */
export function StatusToneChip({
  tone = 'neutral',
  children,
  className = '',
  bordered = true,
  title,
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 font-mono text-2xs',
        statusToneClass(tone, { bordered }),
        className
      )}
    >
      {children}
    </span>
  );
}
