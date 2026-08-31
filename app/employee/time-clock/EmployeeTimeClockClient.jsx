'use client';

import { useCallback, useEffect } from 'react';
import { t } from '../../../lib/i18n';
import { EmployeeDedicatedShell } from '../../_components/EmployeeDedicatedShell';
import { EmployeeTimeClockSection } from '../../_components/EmployeeTimeClockSection';
import { EmployeeHourBankSection } from '../../_components/EmployeeHourBankSection';
import { useEmployeeNav } from '../../_components/EmployeeNavContext';

/**
 * Dedicated collaborator time clock (punch in/out) + hour bank.
 */
export function EmployeeTimeClockClient({ locale = 'pt-BR' }) {
  const { setNavMeta } = useEmployeeNav();

  const onBadge = useCallback(
    (n) => setNavMeta({ badges: { timeClock: Number(n) || 0 } }),
    [setNavMeta]
  );

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, 'employeeHome.timeClockDocumentTitle');
    return () => {
      document.title = prev;
    };
  }, [locale]);

  return (
    <EmployeeDedicatedShell
      locale={locale}
      title={t(locale, 'employeeHome.timeClockPageTitle')}
      hint={t(locale, 'employeeHome.timeClockPageHint')}
    >
      <EmployeeTimeClockSection locale={locale} onBadge={onBadge} />
      <div className="mt-6">
        <h2 className="mb-2 font-display text-base text-ink">
          {t(locale, 'employeeHome.hourBank.sectionTitle')}
        </h2>
        <EmployeeHourBankSection locale={locale} />
      </div>
    </EmployeeDedicatedShell>
  );
}
