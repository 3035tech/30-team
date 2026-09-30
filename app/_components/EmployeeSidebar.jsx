'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { EmployeeLogoutButton } from './EmployeeLogoutButton';
import { SidebarRail, SidebarRailButton } from './SidebarRail';
import { useEmployeeNav } from './EmployeeNavContext';
import { employeeSectionAllowedByCompanyModules } from '../../lib/company-modules';

/** @typedef {{ id: string, href: string, icon: string, labelKey: string, hash?: string }} EmpNavItem */

export const EMPLOYEE_NAV_ITEMS = Object.freeze([
  { id: 'tasks', href: '/employee#tasks', icon: 'list', labelKey: 'employeeHome.tasksTitle', hash: 'tasks' },
  { id: 'journey', href: '/employee#journey', icon: 'sparkles', labelKey: 'employeeHome.journeyTitle', hash: 'journey' },
  { id: 'surveys', href: '/employee#surveys', icon: 'climate', labelKey: 'employeeHome.surveysTitle', hash: 'surveys' },
  { id: 'pdi', href: '/employee/pdi', icon: 'clipboard', labelKey: 'panel.employeePortal.pdiTitle' },
  { id: 'formalReviews', href: '/employee#formalReviews', icon: 'clipboard', labelKey: 'dashboard.performanceReviews', hash: 'formalReviews' },
  { id: 'okr', href: '/employee#okr', icon: 'chart', labelKey: 'employeeHome.okrTitle', hash: 'okr' },
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
  { id: 'dp', href: '/employee/dp', icon: 'dp', labelKey: 'employeeHome.dpTitle' },
  {
    id: 'timeClock',
    href: '/employee/time-clock',
    icon: 'clock',
    labelKey: 'employeeHome.timeClockTitle',
  },
  {
    id: 'variablePay',
    href: '/employee#variablePay',
    icon: 'salary',
    labelKey: 'employeeHome.variablePayTitle',
    hash: 'variablePay',
  },
  { id: 'feed', href: '/employee#feed', icon: 'bell', labelKey: 'employeeHome.feedTitle', hash: 'feed' },
  { id: 'kudos', href: '/employee#kudos', icon: 'gift', labelKey: 'employeeHome.kudosTitle', hash: 'kudos' },
  { id: 'company', href: '/employee#company', icon: 'building', labelKey: 'employeeHome.companyTitle', hash: 'company' },
  { id: 'profile', href: '/employee/profile', icon: 'user', labelKey: 'dashboard.profile' },
]);

/** Menu groups — same chrome idea as dashboard section labels. */
const NAV_GROUPS = Object.freeze([
  {
    id: 'today',
    icon: 'list',
    labelKey: 'employeeHome.navGroupToday',
    ids: ['tasks', 'journey', 'surveys'],
  },
  {
    id: 'grow',
    icon: 'academy',
    labelKey: 'employeeHome.navGroupGrow',
    ids: ['pdi', 'formalReviews', 'okr', 'lms', 'oneOnOne', 'feedback'],
  },
  {
    id: 'work',
    icon: 'briefcase',
    labelKey: 'employeeHome.navGroupWork',
    ids: ['dp', 'timeClock', 'variablePay', 'feed', 'kudos', 'company'],
  },
]);

function NavBadge({ n }) {
  if (!n || n < 1) return null;
  return (
    <span className="ml-auto min-w-[18px] rounded-full bg-action px-1.5 text-center font-mono text-2xs text-action-ink">
      {n > 9 ? '9+' : n}
    </span>
  );
}

function badgeFor(itemId, badges) {
  if (itemId === 'tasks') return badges.tasks;
  if (itemId === 'surveys') return badges.surveys;
  if (itemId === 'lms') return badges.lms;
  if (itemId === 'okr') return badges.okr;
  if (itemId === 'dp') return badges.dp;
  if (itemId === 'timeClock') return badges.timeClock;
  if (itemId === 'variablePay') return badges.variablePay;
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
  const onPdi = pathname.startsWith('/employee/pdi');
  const onDp = pathname.startsWith('/employee/dp');
  const onTimeClock = pathname.startsWith('/employee/time-clock');
  const { activeSection, badges, navCollapsed, setNavCollapsed, focusSection, companyModules } =
    useEmployeeNav();

  const itemById = Object.fromEntries(EMPLOYEE_NAV_ITEMS.map((it) => [it.id, it]));
  const allowedGroups = NAV_GROUPS.map((g) => ({
    ...g,
    ids: g.ids.filter((id) => employeeSectionAllowedByCompanyModules(companyModules, id)),
  })).filter((g) => g.ids.length > 0);

  const isDedicatedRoute = (itemId) =>
    itemId === 'profile' || itemId === 'pdi' || itemId === 'lms' || itemId === 'dp' || itemId === 'timeClock';

  const isActive = (item) => {
    if (item.id === 'profile') return onProfile;
    if (item.id === 'pdi') return onPdi;
    if (item.id === 'lms') return onLms;
    if (item.id === 'dp') return onDp;
    if (item.id === 'timeClock') return onTimeClock;
    if (onHome) return activeSection === item.hash || activeSection === item.id;
    return false;
  };

  const goItem = (item, e) => {
    onClose?.();
    if (isDedicatedRoute(item.id)) {
      if (!e) router.push(item.href);
      return; // let Link navigate
    }
    e?.preventDefault();
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

  const groupsWithItems = allowedGroups
    .map((group) => ({ ...group, items: group.ids.map((id) => itemById[id]).filter(Boolean) }))
    .filter((group) => group.items.length > 0);
  const activeGroupId = groupsWithItems.find((group) => group.items.some(isActive))?.id || null;
  /** Group picked on the rail; only valid while the same group stays active. */
  const [railPick, setRailPick] = useState(null);
  const railGroup = railPick?.activeGroupId === activeGroupId ? railPick.group : activeGroupId;
  const panelGroup =
    groupsWithItems.find((group) => group.id === railGroup) ||
    groupsWithItems.find((group) => group.id === activeGroupId) ||
    groupsWithItems[0];

  const navRef = useRef(null);

  const onRailGroup = (group) => {
    if (navCollapsed) {
      goItem(group.items[0]);
      return;
    }
    setRailPick({ activeGroupId, group: group.id });
    const container = navRef.current;
    const target = document.getElementById(`emp-nav-group-${group.id}`);
    if (!container || !target) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({ top: target.offsetTop, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <aside
      id="employee-sidebar"
      className={cn(
        'db-sidebar db-sidebar--rail flex flex-shrink-0 flex-row border-r border-ink/12 bg-surface',
        open && 'db-sidebar-open',
        navCollapsed ? 'db-sidebar-collapsed w-16' : 'w-[288px]'
      )}
    >
      <SidebarRail
        ariaLabel={t(locale, 'employeeHome.sectionNavAria')}
        toggle={
          <SidebarRailButton
            icon={navCollapsed ? 'expand' : 'collapse'}
            label={navCollapsed ? t(locale, 'dashboard.expandSidebar') : t(locale, 'dashboard.collapseSidebar')}
            className="db-sidebar-collapse-toggle"
            onClick={() => setNavCollapsed((v) => !v)}
          />
        }
        brand={
          <BrandMark
            size={26}
            href="/employee"
            title={t(locale, 'employeeHome.eyebrow')}
            aria-label={t(locale, 'employeeHome.eyebrow')}
          />
        }
        footer={
          <>
            <SidebarRailButton
              icon="user"
              href="/employee/profile"
              label={t(locale, 'dashboard.profile')}
              active={onProfile}
              onClick={onClose}
            />
            <EmployeeLogoutButton locale={locale} variant="rail" onLoggedOut={onClose} />
          </>
        }
      >
        {groupsWithItems.map((group) => (
          <SidebarRailButton
            key={group.id}
            icon={group.icon}
            label={t(locale, group.labelKey)}
            active={group.id === activeGroupId}
            selected={!navCollapsed && group.id === panelGroup?.id}
            pressed={navCollapsed ? undefined : group.id === panelGroup?.id}
            badge={group.items.some((item) => badgeFor(item.id, badges) > 0)}
            onClick={() => onRailGroup(group)}
          />
        ))}
      </SidebarRail>
      {!navCollapsed ? (
        <div className="db-sidebar-panel flex min-w-0 flex-1 flex-col px-2 pb-4 pt-4">
          <div className="mb-2 flex min-h-10 flex-shrink-0 items-center justify-between gap-2 pl-3">
            <div className="min-w-0">
              {companyName || companyLogoUrl ? (
                <div className="flex min-w-0 items-center gap-2">
                  {companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote company logo URL from S3
                    <img
                      src={companyLogoUrl}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] flex-shrink-0 rounded object-contain"
                    />
                  ) : null}
                  {companyName ? (
                    <span className="truncate font-ui text-sm font-semibold text-ink" title={companyName}>
                      {companyName}
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="m-0 truncate font-ui text-sm font-semibold text-ink">
                  {t(locale, 'employeeHome.sidebarLabel')}
                </p>
              )}
            </div>
            <button
              type="button"
              className="db-sidebar-close-mobile flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-control border border-ink/12 bg-transparent text-ink-muted"
              onClick={onClose}
              aria-label={t(locale, 'common.closeMenu')}
            >
              <Icon name="close" />
            </button>
          </div>
          <nav
            ref={navRef}
            className="db-sidebar-nav relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"
            aria-label={t(locale, 'employeeHome.sectionNavAria')}
          >
            {groupsWithItems.map((group) => (
              <div key={group.id} id={`emp-nav-group-${group.id}`} className="mb-2">
                <p
                  id={`emp-nav-group-${group.id}-label`}
                  className={cn(
                    'sticky top-0 z-[1] m-0 bg-surface px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide',
                    group.id === activeGroupId ? 'text-ink' : 'text-ink-label'
                  )}
                >
                  {t(locale, group.labelKey)}
                </p>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-labelledby={`emp-nav-group-${group.id}-label`}>
                  {group.items.map((item) => {
                    const active = isActive(item);
                    const badgeN = badgeFor(item.id, badges);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative mb-0.5 flex min-h-touch w-full items-center gap-2.5 rounded-control border-none py-2 pl-3 pr-3 font-ui text-sm font-medium no-underline transition-colors',
                            active ? 'bg-brand-500/[0.09] text-brand-800' : 'bg-transparent text-ink-muted hover:bg-ink/[0.035] hover:text-ink',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500'
                          )}
                          onClick={(e) => goItem(item, e)}
                        >
                          <Icon name={item.icon} className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="min-w-0 flex-1 truncate">{t(locale, item.labelKey)}</span>
                          <NavBadge n={badgeN} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      ) : null}
    </aside>
  );
}
