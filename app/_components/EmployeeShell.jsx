'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { EMPLOYEE_PUBLIC_PATHS } from '../../lib/employee-paths';
import { redirectEmployeeIfUnauthorized } from '../../lib/employee-client-session';
import { useLocale } from '../../lib/useLocale';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { AppFeedbackProvider } from './AppFeedback';
import { ContentEnter } from './AppLoading';
import { EmployeeTopBar } from './EmployeeTopBar';
import { EmployeeSidebar } from './EmployeeSidebar';
import { EmployeeNavProvider } from './EmployeeNavContext';
import { Icon } from './Icon';

/**
 * Shared chrome for authenticated collaborator pages — sidebar + top bar.
 */
export function EmployeeShell({
  children,
  initialLocale = 'pt-BR',
  personName = '',
  companyName = '',
  companyLogoUrl: initialLogoUrl = '',
}) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const isPublic = EMPLOYEE_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [locale, setLocale] = useLocale(initialLocale, { fromAccount: Boolean(personName) });
  const [displayName, setDisplayName] = useState(personName);
  const [company, setCompany] = useState(companyName);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(initialLogoUrl);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasServerPerson = Boolean(personName);

  useEffect(() => {
    if (!personName) return;
    setDisplayName(personName);
    setCompany(companyName);
    setCompanyLogoUrl(initialLogoUrl);
  }, [personName, companyName, initialLogoUrl]);

  useEffect(() => {
    if (isPublic || hasServerPerson) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/employee/me');
        if (redirectEmployeeIfUnauthorized(router, res.status)) return;
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDisplayName(data.person?.fullName || '');
        setCompany(data.person?.companyName || '');
        setCompanyLogoUrl(data.person?.companyLogoUrl || '');
        if (data.person?.preferredLocale) setLocale(data.person.preferredLocale);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublic, hasServerPerson, setLocale, router]);

  /** Applies at once in the chrome, saves on the account, then refreshes server-rendered pages. */
  const changeLocale = useCallback(async (next) => {
    setLocale(next);
    try {
      const res = await fetch('/api/employee/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLocale: next }),
      });
      if (redirectEmployeeIfUnauthorized(router, res.status)) return false;
      if (!res.ok) return false;
      router.refresh();
      return true;
    } catch {
      return false;
    }
  }, [router, setLocale]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!sidebarOpen) {
      document.body.classList.remove('sidebar-open');
      return undefined;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sidebar-open');
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('sidebar-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen]);

  if (isPublic) {
    return (
      <AppFeedbackProvider locale={locale}>
        <ContentEnter animKey={pathname}>{children}</ContentEnter>
      </AppFeedbackProvider>
    );
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <AppFeedbackProvider locale={locale}>
      <EmployeeNavProvider changeLocale={changeLocale}>
        <div className="relative min-h-screen bg-canvas font-ui text-ink">
          <button
            type="button"
            className="db-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label={t(locale, 'common.openMenu')}
            aria-expanded={sidebarOpen}
            aria-controls="employee-sidebar"
          >
            <Icon name="menu" />
          </button>
          <div
            className={cn('db-overlay', sidebarOpen && 'db-overlay-visible')}
            onClick={closeSidebar}
            aria-hidden={!sidebarOpen}
          />

          <div className="relative flex min-h-screen">
            <EmployeeSidebar
              locale={locale}
              companyName={company}
              companyLogoUrl={companyLogoUrl}
              open={sidebarOpen}
              onClose={closeSidebar}
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <EmployeeTopBar
                locale={locale}
                displayName={displayName}
                companyName={company}
              />
              <main className="emp-main min-w-0 flex-1">
                <ContentEnter animKey={pathname}>{children}</ContentEnter>
              </main>
            </div>
          </div>
        </div>
      </EmployeeNavProvider>
    </AppFeedbackProvider>
  );
}
