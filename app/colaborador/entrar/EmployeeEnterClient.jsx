'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading } from '../../_components/AppLoading';

/**
 * Consume magic-link token → set employee cookie → redirect /colaborador
 */
export default function EmployeeEnterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const locale = params.get('locale') === 'en' ? 'en' : 'pt-BR';

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError(t(locale, 'employeeHome.invalidLink'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/employee/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, locale }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'session');
        if (!cancelled) router.replace('/colaborador');
      } catch {
        if (!cancelled) setError(t(locale, 'employeeHome.invalidLink'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, locale, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
        <a href="/colaborador/login" className={cn(S.btnBrandSoft, 'mt-4 inline-flex min-h-touch')}>
          {t(locale, 'employeeHome.backToLogin')}
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <AppLoading variant="panel" />
    </div>
  );
}
