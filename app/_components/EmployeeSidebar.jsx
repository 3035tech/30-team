'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { useEmployeeNav } from './EmployeeNavContext';

/** @typedef {{ id: string, href: string, icon: string, labelKey: string, hash?: string }} EmpNavItem */

export const EMPLOYEE_NAV_ITEMS = Object.freeze([
  { id: 'tasks', href: '/employee#tasks', icon: 'list', labelKey: 'employeeHome.tasksTitle', hash: 'tasks' },
  { id: 'journey', href: '/employee#journey', icon: 'sparkles', labelKey: 'employeeHome.journeyTitle', hash: 'journey' },
  { id: 'surveys', href: '/employee#surveys', icon: 'climate', labelKey: 'employeeHome.surveysTitle', hash: 'surveys' },
  { id: 'pdi', href: '/employee#pdi', icon: 'clipboard', labelKey: 'panel.employeePortal.pdiTitle', hash: 'pdi' },
  { id: 'lms', href: '/employee/lms', icon: 'book', labelKey: 'employeeHome.lmsTitle' },
  {
    id: 'oneOnOne',
    href: '/employee#oneOnOne',
    icon: 'team',
    labelKey: 'panel.employeePortal.agreementsTitle',
    hash: 'oneOnOne',
  },
  {
    id: 'feedback',
    href: '/employee#feedback',
    icon: 'feedbackInfo',
    labelKey: 'employeeHome.feedbackTitle',
    hash: 'feedback',
  },
  { id: 'dp', href: '/employee#dp', icon: 'dp', labelKey: 'employeeHome.dpTitle', hash: 'dp' },
  {
    id: 'timeClock',
    href: '/employee#timeClock',
    icon: 'list',
    labelKey: 'employeeHome.timeClockTitle',
    hash: 'timeClock',
  },
  {
    id: 'variablePay',
    href: '/employee#variablePay',
    icon: 'clipboard',
    labelKey: 'employeeHome.variablePayTitle',
    hash: 'variablePay',
  },
  { id: 'feed', href: '/employee#feed', icon: 'list', labelKey: 'employeeHome.feedTitle', hash: 'feed' },
  { id: 'kudos', href: '/employee#kudos', icon: 'sparkles', labelKey: 'employeeHome.kudosTitle', hash: 'kudos' },
  { id: 'company', href: '/employee#company', icon: 'building', labelKey: 'employeeHome.companyTitle', hash: 'company' },
  { id: 'profile', href: '/employee/profile', icon: 'user', labelKey: 'employeeHome.profile' },
]);

/** Menu groups — same chrome idea as dashboard section labels. */
const NAV_GROUPS = Object.freeze([
  {
    id: 'today',
    labelKey: 'employeeHome.navGroupToday',
    ids: ['tasks', 'journey', 'surveys'],
  },
  {
    id: 'grow',
    labelKey: 'employeeHome.navGroupGrow',
    ids: ['pdi', 'lms', 'oneOnOne', 'feedback'],
  },
  {
    id: 'account',
    labelKey: 'employeeHome.navGroupAccount',
    ids: ['dp', 'timeClock', 'variablePay', 'feed', 'kudos', 'company', 'profile'],
  },
]);

function NavBadge({ n }) {
  if (!n || n < 1) return null;
  return (
    <span className="ml-auto min-w-[18px] rounded-full bg-brand-500 px-1.5 text-center font-mono text-2xs text-white">
      {n > 9 ? '9+' : n}
    </span>
  );
}

function badgeFor(itemId, badges) {
  if (itemId === 'tasks') return badges.tasks;
  if (itemId === 'surveys') return badges.surveys;
  if (itemId === 'lms') return badges.lms;
  if (itemId === 'dp') return badges.dp;
  if (itemId === 'timeClock') return badges.timeClock;
  if (itemId === 'feed') return badges.feed;
  if (itemId === 'kudos') return badges.kudos;
  if (itemId === 'feedback') return badges.feedback;
  return 0;
}

/**
 * Left nav for authenticated collaborator chrome.
 * Always lists functionalities; empty sections open with EmptyState on the home page.
 */
export function EmployeeSidebar({
  locale,
  companyName = '',
  companyLogoUrl = '',
  open = false,
  onClose,
}) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const onHome = pathname === '/employee' || pathname === '/employee/';
  const onProfile = pathname.startsWith('/employee/profile');
  const onLms = pathname.startsWith('/employee/lms');
  const { activeSection, badges, navCollapsed, setNavCollapsed, focusSection } = useEmployeeNav();

  const itemById = Object.fromEntries(EMPLOYEE_NAV_ITEMS.map((it) => [it.id, it]));

  const isActive = (item) => {
    if (item.id === 'profile') return onProfile;
    if (item.id === 'lms') return onLms;
    if (onHome) return activeSection === item.hash || activeSection === item.id;
    return false;
  };

  const goItem = (item, e) => {
    onClose?.();
    if (item.id === 'profile' || item.id === 'lms') return; // let Link navigate
    e.preventDefault();
    if (onHome) {
      focusSection(item.hash || item.id);
      if (typeof window !== 'undefined') {
        const next = `#${item.hash || item.id}`;
        if (window.location.hash !== next) {
          window.history.replaceState(null, '', next);
        }
      }
      return;
    }
    router.push(item.href);
  };

  return (
    <aside
      id="employee-sidebar"
      className={cn(
        'db-sidebar flex flex-shrink-0 flex-col gap-2 border-r border-ink/12 bg-surface/95 backdrop-blur-[14px]',
        open && 'db-sidebar-open',
        navCollapsed ? 'db-sidebar-collapsed w-[72px] px-2.5 pb-6 pt-5' : 'w-[220px] px-3.5 pb-8 pt-5'
      )}
    >
      <div
        className={cn(
          'mb-3 flex flex-shrink-0 gap-2',
          navCollapsed ? 'flex-col items-center' : 'items-start justify-between'
        )}
      >
        <div className={cn('min-w-0', navCollapsed && 'text-center')}>
          <BrandMark
            size={28}
            withWordmark={!navCollapsed}
            href="/employee"
            title={t(locale, 'employeeHome.eyebrow')}
            aria-label={t(locale, 'employeeHome.eyebrow')}
          />
          {!navCollapsed ? (
            <>
              <span className={cn(S.label, 'mt-2.5 block')}>{t(locale, 'employeeHome.sidebarLabel')}</span>
              {companyName || companyLogoUrl ? (
                <div className="mt-1.5 flex min-w-0 items-center gap-2">
                  {companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote company logo URL from S3
                    <img
                      src={companyLogoUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 flex-shrink-0 rounded object-contain"
                    />
                  ) : null}
                  {companyName ? (
                    <span className="truncate font-ui text-xs text-ink-muted" title={companyName}>
                      {companyName}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogoUrl}
              alt={companyName || ''}
              width={28}
              height={28}
              className="mt-2 h-7 w-7 rounded object-contain"
              title={companyName || undefined}
            />
          ) : null}
        </div>
        <button
          type="button"
          className="db-sidebar-collapse-toggle flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ink/12 bg-transparent text-ink-muted"
          onClick={() => setNavCollapsed((v) => !v)}
          aria-label={
            navCollapsed
              ? t(locale, 'dashboard.expandSidebar')
              : t(locale, 'dashboard.collapseSidebar')
          }
          title={
            navCollapsed
              ? t(locale, 'dashboard.expandSidebar')
              : t(locale, 'dashboard.collapseSidebar')
          }
        >
          <Icon name={navCollapsed ? 'expand' : 'collapse'} />
        </button>
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
        {NAV_GROUPS.map((group, gIdx) => {
          const items = group.ids.map((id) => itemById[id]).filter(Boolean);
          if (!items.length) return null;
          return (
            <div key={group.id} className={cn(gIdx > 0 && 'mt-2')}>
              {gIdx > 0 ? <div className="mb-2 h-px bg-ink/[0.08]" aria-hidden /> : null}
              {!navCollapsed ? (
                <span className={cn(S.label, 'mb-1 block px-2.5')}>{t(locale, group.labelKey)}</span>
              ) : null}
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {items.map((item) => {
                  const active = isActive(item);
                  const badgeN = badgeFor(item.id, badges);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        title={navCollapsed ? t(locale, item.labelKey) : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative flex min-h-touch items-center gap-2.5 rounded-control font-ui text-prose no-underline transition-colors',
                          navCollapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2',
                          active
                            ? 'bg-brand-500/12 font-medium text-brand-700'
                            : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink'
                        )}
                        onClick={(e) => goItem(item, e)}
                      >
                        <Icon name={item.icon} className="h-4 w-4 shrink-0 opacity-80" />
                        {!navCollapsed ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">{t(locale, item.labelKey)}</span>
                            <NavBadge n={badgeN} />
                          </>
                        ) : badgeN > 0 ? (
                          <span
                            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500"
                            aria-hidden
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
