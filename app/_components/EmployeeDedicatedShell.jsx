'use client';

import Link from 'next/link';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { AppLoading } from './AppLoading';

/**
 * Shared chrome for heavy collaborator modules (back + title + body).
 * Parent EmployeeShell already wraps with ContentEnter.
 */
export function EmployeeDedicatedShell({
  locale = 'pt-BR',
  title,
  hint = null,
  children,
  maxWidthClass = 'max-w-6xl',
  trailing = null,
}) {
  return (
    <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', maxWidthClass)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/employee" className={cn(S.cardLink, 'inline-flex')}>
            ← {t(locale, 'employeeHome.backHome')}
          </Link>
          <h1 className={cn(S.pageTitle, 'mt-3 mb-1 font-ui text-2xl font-semibold tracking-tight')}>{title}</h1>
          {hint ? <p className={cn(S.muted, 'mb-0 max-w-[70ch] text-prose')}>{hint}</p> : null}
        </div>
        {trailing ? <div className="shrink-0 pt-8 sm:pt-10">{trailing}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Panel skeleton inside the same container as collaborator pages, so content does not jump on load. */
export function EmployeePageLoading({ locale = 'pt-BR' }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <AppLoading variant="panel" locale={locale} />
    </div>
  );
}
