'use client';

import { cn } from '../../lib/cn';
import { statusToneClass } from './StatusToneChip';
import { Icon } from './Icon';

function emphasisIcon(tone) {
  if (tone === 'danger') return 'feedbackError';
  if (tone === 'warning') return 'feedbackWarning';
  if (tone === 'success') return 'feedbackOk';
  return 'feedbackInfo';
}

function emphasisIconClass(tone) {
  if (tone === 'danger') return 'text-danger';
  if (tone === 'warning') return 'text-warning';
  if (tone === 'success') return 'text-success';
  return 'text-info';
}

/**
 * Soft inline banner (info / warning / danger / success). Not a modal/toast.
 * `emphasis` = stronger border + icon (login / blocking form errors).
 */
export function InlineCallout({
  tone = 'info',
  children,
  className = '',
  role = 'status',
  emphasis = false,
  title = '',
}) {
  return (
    <div
      role={role}
      className={cn(
        'rounded-control border px-3.5 py-2.5 font-ui text-prose leading-snug',
        statusToneClass(tone),
        emphasis &&
          'flex items-start gap-2.5 border-l-4 py-3 font-medium shadow-sm',
        emphasis && tone === 'danger' && 'border-danger/40 border-l-danger bg-danger/15',
        emphasis && tone === 'warning' && 'border-warning/40 border-l-warning bg-warning/15',
        emphasis && tone === 'success' && 'border-success/40 border-l-success bg-success/15',
        emphasis && tone === 'info' && 'border-info/40 border-l-info bg-info/15',
        className
      )}
    >
      {emphasis ? (
        <span className={cn('mt-0.5 shrink-0', emphasisIconClass(tone))} aria-hidden>
          <Icon name={emphasisIcon(tone)} className="h-4 w-4 shrink-0" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="mb-0.5 font-mono text-2xs uppercase tracking-wide">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
