'use client';

import Link from 'next/link';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/**
 * Shared chrome for heavy collaborator modules (back + title + body).
 * Parent EmployeeShell already wraps with ContentEnter.
 */
export function EmployeeDedicatedShell({
  locale = 'pt-BR',
  title,
  hint = null,
  children,
  maxWidthClass = 'max-w-3xl lg:max-w-4xl',
  trailing = null,
}) {
  return (
    <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', maxWidthClass)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/employee" className={cn(S.cardLink, 'inline-flex')}>
            ← {t(locale, 'employeeHome.backHome')}
          </Link>
          <h1 className={cn(S.pageTitle, 'mt-3 mb-1')}>{title}</h1>
          {hint ? <p className={cn(S.muted, 'mb-0 text-prose')}>{hint}</p> : null}
        </div>
        {trailing ? <div className="shrink-0 pt-8 sm:pt-10">{trailing}</div> : null}
      </div>
      {children}
    </div>
  );
}
