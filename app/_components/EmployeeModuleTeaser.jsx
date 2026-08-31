'use client';

import Link from 'next/link';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { StatusToneChip } from './StatusToneChip';
import { Icon } from './Icon';

/**
 * Compact destination card for dedicated collaborator modules (LMS / DP / ponto).
 * Not a CollapsibleBlock: one job is “open the module”.
 */
export function EmployeeModuleTeaser({
  id,
  href,
  title,
  hint = null,
  ctaLabel,
  icon = null,
  chipLabel = null,
  chipTone = 'info',
  children = null,
  className = '',
}) {
  return (
    <section id={id} className={cn('mt-6 scroll-mt-24', className)}>
      <div className={cn(S.cardTight, 'transition-colors hover:border-brand-500/25')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon ? (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-500/10 text-brand-700">
                <Icon name={icon} className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className={cn(S.cardSection, 'm-0')}>{title}</h2>
              {hint ? <p className={cn(S.muted, 'mb-0 mt-1 text-prose')}>{hint}</p> : null}
            </div>
          </div>
          {chipLabel ? <StatusToneChip tone={chipTone}>{chipLabel}</StatusToneChip> : null}
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
        <Link href={href} className={cn(S.btnPrimary, 'mt-3 inline-flex min-h-touch no-underline')}>
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
