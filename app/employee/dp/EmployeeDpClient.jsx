'use client';

import { useCallback, useEffect } from 'react';
import { t } from '../../../lib/i18n';
import { EmployeeDedicatedShell } from '../../_components/EmployeeDedicatedShell';
import { EmployeeDpSection } from '../../_components/EmployeeDpSection';
import { useEmployeeNav } from '../../_components/EmployeeNavContext';

/**
 * Dedicated collaborator DP (ficha, docs, férias).
 */
export function EmployeeDpClient({ locale = 'pt-BR' }) {
  const { setNavMeta } = useEmployeeNav();

  const onBadge = useCallback(
    (n) => setNavMeta({ badges: { dp: Number(n) || 0 } }),
    [setNavMeta]
  );

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, 'employeeHome.dpDocumentTitle');
    return () => {
      document.title = prev;
    };
  }, [locale]);

  return (
    <EmployeeDedicatedShell
      locale={locale}
      title={t(locale, 'employeeHome.dpPageTitle')}
      hint={t(locale, 'employeeHome.dpPageHint')}
    >
      <EmployeeDpSection locale={locale} showIntro={false} onBadge={onBadge} />
    </EmployeeDedicatedShell>
  );
}
