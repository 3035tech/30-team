'use client';

import { cn } from '../../lib/cn';

/**
 * Shared empty state for dashboard lists — one message + optional primary CTA.
 */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  actionDisabled = false,
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-ink/12 bg-ink/[0.02] px-5 py-7 text-center">
      {title ? (
        <p className="mb-2 mt-0 font-display text-base text-ink">{title}</p>
      ) : null}
      {message ? (
        <p className="mx-auto my-0 max-w-[42ch] text-prose leading-[1.55] text-ink-muted">
          {message}
        </p>
      ) : null}
      {actionLabel && typeof onAction === 'function' ? (
        <button
          type="button"
          disabled={actionDisabled}
          onClick={onAction}
          className={cn(
            'mt-4 min-h-touch rounded-control border border-brand-500/30 bg-brand-500/10 px-4 py-2 font-mono text-prose text-brand-600',
            actionDisabled ? 'cursor-default opacity-55' : 'cursor-pointer'
          )}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
