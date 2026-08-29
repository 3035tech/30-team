'use client';

import Link from 'next/link';
import { cn } from '../../lib/cn';

const actionClass =
  'mt-4 inline-flex min-h-touch items-center justify-center rounded-control border border-brand-500/30 bg-brand-500/10 px-4 py-2 font-mono text-prose text-brand-500 no-underline';

/**
 * Shared empty state for dashboard lists — one message + optional primary CTA.
 */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
  actionDisabled = false,
}) {
  const showLink = Boolean(actionLabel && actionHref);
  const showButton = Boolean(actionLabel && typeof onAction === 'function' && !actionHref);

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
      {showLink ? (
        <Link href={actionHref} className={actionClass}>
          {actionLabel}
        </Link>
      ) : null}
      {showButton ? (
        <button
          type="button"
          disabled={actionDisabled}
          onClick={onAction}
          className={cn(actionClass, actionDisabled ? 'cursor-default opacity-55' : 'cursor-pointer')}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
