'use client';

import Link from 'next/link';
import { cn } from '../../lib/cn';

const actionClass =
  'inline-flex min-h-touch items-center justify-center rounded-control border border-brand-500/30 bg-brand-500/10 px-4 py-2 font-mono text-prose text-brand-500 no-underline';

const secondaryActionClass =
  'inline-flex min-h-touch items-center justify-center rounded-control border border-ink/15 bg-transparent px-4 py-2 font-mono text-prose text-ink-muted no-underline';

/**
 * Shared empty state for dashboard lists — one message + optional primary/secondary CTAs.
 */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
  actionDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionHref,
  className,
}) {
  const showLink = Boolean(actionLabel && actionHref);
  const showButton = Boolean(actionLabel && typeof onAction === 'function' && !actionHref);
  const showSecondaryLink = Boolean(secondaryActionLabel && secondaryActionHref);
  const showSecondaryButton = Boolean(
    secondaryActionLabel && typeof onSecondaryAction === 'function' && !secondaryActionHref
  );
  const showActions = showLink || showButton || showSecondaryLink || showSecondaryButton;

  return (
    <div
      className={cn(
        'rounded-[14px] border border-dashed border-ink/12 bg-ink/[0.02] px-5 py-7 text-center',
        className
      )}
    >
      {title ? (
        <p className="mb-2 mt-0 font-display text-base text-ink">{title}</p>
      ) : null}
      {message ? (
        <p className="mx-auto my-0 max-w-[42ch] text-prose leading-[1.55] text-ink-muted">
          {message}
        </p>
      ) : null}
      {showActions ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
          {showSecondaryLink ? (
            <Link href={secondaryActionHref} className={secondaryActionClass}>
              {secondaryActionLabel}
            </Link>
          ) : null}
          {showSecondaryButton ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className={cn(secondaryActionClass, 'cursor-pointer')}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
