'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';

/** @typedef {{ id: string, href: string, icon: string, labelKey: string, hash?: string }} EmpNavItem */

/** Nav canônica do espaço do colaborador (home + perfil). */
export const EMPLOYEE_NAV_ITEMS = Object.freeze([
  { id: 'tasks', href: '/employee#tasks', icon: 'list', labelKey: 'employeeHome.tasksTitle', hash: 'tasks' },
  { id: 'journey', href: '/employee#journey', icon: 'sparkles', labelKey: 'employeeHome.journeyTitle', hash: 'journey' },
  { id: 'pdi', href: '/employee#pdi', icon: 'clipboard', labelKey: 'panel.employeePortal.pdiTitle', hash: 'pdi' },
  { id: 'lms', href: '/employee#lms', icon: 'book', labelKey: 'employeeHome.lmsTitle', hash: 'lms' },
  { id: 'surveys', href: '/employee#surveys', icon: 'climate', labelKey: 'employeeHome.surveysTitle', hash: 'surveys' },
  {
    id: 'oneOnOne',
    href: '/employee#oneOnOne',
    icon: 'team',
    labelKey: 'panel.employeePortal.agreementsTitle',
    hash: 'oneOnOne',
  },
  { id: 'company', href: '/employee#company', icon: 'building', labelKey: 'employeeHome.companyTitle', hash: 'company' },
  { id: 'profile', href: '/employee/profile', icon: 'user', labelKey: 'employeeHome.profile' },
]);

/**
 * Left nav for authenticated collaborator chrome (desktop sticky + mobile drawer via .db-sidebar).
 */
export function EmployeeSidebar({
  locale,
  companyName = '',
  open = false,
  onClose,
  activeHash = '',
}) {
  const pathname = usePathname() || '';
  const onHome = pathname === '/employee' || pathname === '/employee/';
  const onProfile = pathname.startsWith('/employee/profile');

  return (
    <aside
      id="employee-sidebar"
      className={cn(
        'db-sidebar flex w-[220px] flex-shrink-0 flex-col gap-2 border-r border-ink/12 bg-surface/95 px-3.5 pb-8 pt-5 backdrop-blur-[14px]',
        open && 'db-sidebar-open'
      )}
    >
      <div className="mb-3 flex flex-shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <BrandMark
            size={28}
            withWordmark
            href="/employee"
            title={t(locale, 'employeeHome.eyebrow')}
            aria-label={t(locale, 'employeeHome.eyebrow')}
          />
          <span className={cn(S.label, 'mt-2.5 block')}>{t(locale, 'employeeHome.sidebarLabel')}</span>
          {companyName ? (
            <span className="mt-1 block truncate font-ui text-xs text-ink-muted" title={companyName}>
              {companyName}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="db-sidebar-close-mobile flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ink/12 bg-transparent text-ink-muted"
          onClick={onClose}
          aria-label={t(locale, 'common.closeMenu')}
        >
          <Icon name="close" />
        </button>
      </div>

      <nav
        className="db-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"
        aria-label={t(locale, 'employeeHome.sectionNavAria')}
      >
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {EMPLOYEE_NAV_ITEMS.map((item) => {
            let active = false;
            if (item.id === 'profile') {
              active = onProfile;
            } else if (onHome) {
              active = activeHash === item.hash || (!activeHash && item.hash === 'tasks');
            }
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex min-h-touch items-center gap-2.5 rounded-control px-2.5 py-2 font-ui text-prose no-underline transition-colors',
                    active
                      ? 'bg-brand-500/12 font-medium text-brand-700'
                      : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink'
                  )}
                  onClick={onClose}
                >
                  <Icon name={item.icon} className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="truncate">{t(locale, item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
