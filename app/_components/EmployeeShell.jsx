'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '../../lib/useLocale';
import { AppFeedbackProvider } from './AppFeedback';
import { ContentEnter } from './AppLoading';
import { EmployeeTopBar } from './EmployeeTopBar';

const PUBLIC_PATHS = ['/colaborador/login', '/colaborador/entrar', '/colaborador/cadastrar-senha'];

/**
 * Shared chrome for authenticated collaborator pages.
 */
export function EmployeeShell({ children, initialLocale = 'pt-BR', personName = '', companyName = '' }) {
  const pathname = usePathname() || '';
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [locale, setLocale] = useLocale(initialLocale);
  const [displayName, setDisplayName] = useState(personName);
  const [company, setCompany] = useState(companyName);

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/employee/me');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDisplayName(data.person?.fullName || '');
        setCompany(data.person?.companyName || '');
        if (data.person?.preferredLocale) setLocale(data.person.preferredLocale);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublic, setLocale]);

  if (isPublic) {
    return (
      <AppFeedbackProvider locale={locale}>
        <ContentEnter animKey={pathname}>{children}</ContentEnter>
      </AppFeedbackProvider>
    );
  }

  return (
    <AppFeedbackProvider locale={locale}>
      <div className="min-h-screen bg-canvas text-ink">
        <EmployeeTopBar
          locale={locale}
          onLocaleChange={setLocale}
          displayName={displayName}
          companyName={company}
        />
        <ContentEnter animKey={pathname}>{children}</ContentEnter>
      </div>
    </AppFeedbackProvider>
  );
}
