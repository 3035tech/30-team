'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { employeeLoginUrl } from '../../lib/employee-client-session';
import { S } from '../dashboard/dashboard-shared';
import { Icon } from './Icon';
import { useAppFeedback } from './AppFeedback';

/** Both employee menus share the same logout and failure behavior. */
export function EmployeeLogoutButton({ locale, compact = false, role, onLoggedOut }) {
  const router = useRouter();
  const { toast } = useAppFeedback();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const label = t(locale, 'employeeHome.logout');
  const logout = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch('/api/auth/employee/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('logout');
      onLoggedOut?.();
      router.replace(employeeLoginUrl({ reason: 'logout' }));
    } catch {
      toast(t(locale, 'employeeHome.logoutFailed'), 'error');
      pending.current = false;
      setBusy(false);
    }
  };
  return <button type="button" role={role} onClick={logout} disabled={busy} aria-busy={busy}
    aria-label={label} title={compact ? label : undefined}
    className={cn(S.btnGhost, 'flex min-h-touch w-full items-center gap-2.5 text-danger', compact ? 'justify-center' : 'justify-start')}>
    <Icon name="logout" className="h-4 w-4 shrink-0 opacity-80" />
    {!compact ? <span>{busy ? t(locale, 'panel.common.loading') : label}</span> : null}
  </button>;
}
