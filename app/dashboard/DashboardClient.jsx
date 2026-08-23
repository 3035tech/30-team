'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCompat } from '../../lib/data';
import { getTypeData, localizeAreaLabel } from '../../lib/i18n-data';
import { typeHintTooltip } from '../../lib/type-en';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { CAP, can, canSeeManagementSection, isAdminRole } from '../../lib/permissions';
import { cn } from '../../lib/cn';
import LanguageSelect from '../_components/LanguageSelect';
import { BrandMark } from '../_components/BrandMark';
import { Icon } from '../_components/Icon';

import {
  PAGE_SIZE_OPTIONS,
  parseComparePagination,
  parseCompatTabPagination,
  parseDashboardTab,
  parseTeamSort,
} from '../../lib/assessment-filters';

import { DashboardBreadcrumb, getDashboardTabNav, S } from './dashboard-shared';
import { useDashboardNavigation } from './hooks/useDashboardNavigation';
import { PipelineExtrasProvider } from './PipelineExtrasContext';
import { AppFeedbackProvider, useAppFeedbackOptional } from '../_components/AppFeedback';
import { AppLoading } from '../_components/AppLoading';
import { DashboardTopBarMenus } from '../_components/DashboardTopBarMenus';

function TabLoadingFallback() {
  return <AppLoading variant="panel" />;
}

const TeamTab = dynamic(
  () => import('./tabs/TeamTab').then((m) => ({ default: m.TeamTab })),
  { loading: () => <TabLoadingFallback /> }
);

function ExportCsvButton({ href, locale }) {
  const fb = useAppFeedbackOptional();
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error('export_failed');
      const truncated = res.headers.get('X-Export-Truncated') === '1';
      const maxRows = parseInt(res.headers.get('X-Export-Max-Rows') || '', 10);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (truncated) {
        fb?.toast?.(
          t(locale, 'dashboard.exportTruncated', {
            n: Number.isFinite(maxRows) ? maxRows : 10000,
          }),
          'info'
        );
      }
    } catch {
      fb?.toast?.(t(locale, 'dashboard.exportFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={busy}
      className={cn(
        'inline-flex min-h-touch items-center gap-1.5 whitespace-nowrap rounded-control border border-brand-500/25 bg-brand-500/10 px-4 py-2.5 font-display text-[13px] text-brand-500',
        busy ? 'cursor-wait opacity-70' : 'cursor-pointer'
      )}
    >
      ↓ {t(locale, 'dashboard.exportCsv')}
    </button>
  );
}

const CompareTabLoader = dynamic(
  () => import('./tabs/CompareTabLoader').then((m) => ({ default: m.CompareTabLoader })),
  { loading: () => <TabLoadingFallback /> }
);
const CompatTab = dynamic(
  () => import('./tabs/CompatTab').then((m) => ({ default: m.CompatTab })),
  { loading: () => <TabLoadingFallback /> }
);
const CompaniesAdminTab = dynamic(
  () => import('./tabs/CompaniesAdminTab').then((m) => ({ default: m.CompaniesAdminTab })),
  { loading: () => <TabLoadingFallback /> }
);
const GroupTab = dynamic(
  () => import('./tabs/GroupTab').then((m) => ({ default: m.GroupTab })),
  { loading: () => <TabLoadingFallback /> }
);
const LeadershipTab = dynamic(
  () => import('./tabs/LeadershipTab').then((m) => ({ default: m.LeadershipTab })),
  { loading: () => <TabLoadingFallback /> }
);
const OverviewTab = dynamic(
  () => import('./tabs/OverviewTab').then((m) => ({ default: m.OverviewTab })),
  { loading: () => <TabLoadingFallback /> }
);
const UsersAdminTab = dynamic(
  () => import('./tabs/UsersAdminTab').then((m) => ({ default: m.UsersAdminTab })),
  { loading: () => <TabLoadingFallback /> }
);
const VacanciesAdminTab = dynamic(
  () => import('./tabs/VacanciesAdminTab').then((m) => ({ default: m.VacanciesAdminTab })),
  { loading: () => <TabLoadingFallback /> }
);
const MotivatorsAdminTab = dynamic(() => import('./tabs/MotivatorsAdminTab'), {
  loading: () => <TabLoadingFallback />,
});
const ClimateTab = dynamic(
  () => import('./tabs/ClimateTab').then((m) => ({ default: m.ClimateTab })),
  { loading: () => <TabLoadingFallback /> }
);
const HelpTab = dynamic(
  () => import('./tabs/HelpTab').then((m) => ({ default: m.HelpTab })),
  { loading: () => <TabLoadingFallback /> }
);
const ProfileTab = dynamic(
  () => import('../_components/ProfileTab').then((m) => ({ default: m.ProfileTab })),
  { loading: () => <TabLoadingFallback /> }
);

const SIDEBAR_COLLAPSED_KEY = '30team_sidebar_collapsed';

/** Tabs that use the shared assessment filter chrome (area/vacancy/hist). */
const COHORT_TABS = new Set([
  'overview',
  'team',
  'compatibility',
  'compare',
  'group',
  'leadership',
]);

export default function DashboardClient({
  results,
  areas = [],
  companies = [],
  counts = [],
  vacancies = [],
  selectedArea = 'all',
  selectedVacancy = 'all',
  selectedPipeline = 'all',
  selectedRoster = 'internal',
  selectedCompany = 'all',
  selectedDateFrom = null,
  selectedDateTo = null,
  selectedSearch = '',
  pagination = { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  compatMetrics = {
    pairs: [],
    tensions: [],
    synergies: [],
    typeCount: {},
    total: 0,
  },
  interactionPeople = [],
  selectedEnneagram = 'all',
  analytics = null,
  overviewMetrics = null,
  auth = null,
  initialLocale = 'pt-BR',
  /** Shell-only paint while tab queries stream (B-201). */
  panelLoading = false,
}) {
  const router = useRouter();
  const urlParams = useSearchParams();
  const [locale, setLocale] = useLocale(auth?.locale || initialLocale);

  const [area, setArea] = useState(selectedArea);
  const [vacancy, setVacancy] = useState(selectedVacancy);
  const [company, setCompany] = useState(selectedCompany);
  const [enneagram, setEnneagram] = useState(selectedEnneagram);
  const [pipeline, setPipeline] = useState(selectedPipeline);
  const [roster, setRoster] = useState(selectedRoster);
  const [dateFrom, setDateFrom] = useState(selectedDateFrom || '');
  const [dateTo, setDateTo] = useState(selectedDateTo || '');
  const [search, setSearch] = useState(selectedSearch || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const [newCandidates, setNewCandidates] = useState(false);
  const [groupBaseId, setGroupBaseId] = useState(null);
  const [groupIds, setGroupIds] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const typeData = getTypeData(locale);
  const [sessionAuth, setSessionAuth] = useState(auth);

  useEffect(() => {
    setSessionAuth(auth);
  }, [auth]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const isAdmin = isAdminRole(sessionAuth);
  const tab = parseDashboardTab(urlParams, sessionAuth);
  const showsCohortChrome = COHORT_TABS.has(tab);
  /** Global search duplicates TeamTab; Leadership is chart-first — hide there. */
  const showGlobalSearch = showsCohortChrome && tab !== 'team' && tab !== 'leadership';
  const showVacancies = can(sessionAuth, CAP.VACANCIES_VIEW);
  const showMotivators = can(sessionAuth, CAP.MOTIVATORS_VIEW);
  const showClimate = can(sessionAuth, CAP.CLIMATE_VIEW);
  const showCompanies = can(sessionAuth, CAP.COMPANIES_MANAGE);
  const showUsers = can(sessionAuth, CAP.USERS_MANAGE);
  const showManagement = canSeeManagementSection(sessionAuth);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await orig(...args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (res.status === 401 && String(url).includes('/api/admin')) {
          const next = `${window.location.pathname}${window.location.search || ''}`;
          window.location.assign(`/login?redirect=${encodeURIComponent(next)}`);
        }
      } catch {
        /* ignore */
      }
      return res;
    };
    return () => {
      window.fetch = orig;
    };
  }, []);

  useEffect(() => {
    setArea(selectedArea);
  }, [selectedArea]);
  useEffect(() => {
    setVacancy(selectedVacancy);
  }, [selectedVacancy]);
  useEffect(() => {
    setCompany(selectedCompany);
  }, [selectedCompany]);
  useEffect(() => {
    setEnneagram(selectedEnneagram);
  }, [selectedEnneagram]);
  useEffect(() => {
    setPipeline(selectedPipeline);
  }, [selectedPipeline]);
  useEffect(() => {
    setRoster(selectedRoster);
  }, [selectedRoster]);
  useEffect(() => { setDateFrom(selectedDateFrom || ''); }, [selectedDateFrom]);
  useEffect(() => { setDateTo(selectedDateTo || ''); }, [selectedDateTo]);
  useEffect(() => { setSearch(selectedSearch || ''); }, [selectedSearch]);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 769px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen, isDesktop]);

  useEffect(() => {
    if (isDesktop) setSidebarOpen(false);
  }, [isDesktop]);

  const navCollapsed = sidebarCollapsed && isDesktop;

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('30team_group') || '{}');
      if (saved.baseId != null) setGroupBaseId(saved.baseId);
      if (Array.isArray(saved.ids)) setGroupIds(saved.ids);
      if (Array.isArray(saved.dismissed)) setDismissedIds(saved.dismissed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('30team_group', JSON.stringify({
        baseId: groupBaseId,
        ids: groupIds,
        dismissed: dismissedIds,
      }));
    } catch {}
  }, [groupBaseId, groupIds, dismissedIds]);

  const listTotal = compatMetrics.total ?? 0;
  /**
   * Bolinha em Equipe: heurística local (não é a notificação do sino).
   * Qualquer role com empresa; super admin (admin sem company_id) não usa.
   */
  const teamBadgeScopeRef = useRef(null);
  useEffect(() => {
    const homeCompanyId = sessionAuth?.companyId;
    const isSuperAdmin = isAdmin && (homeCompanyId == null || homeCompanyId === '');
    if (isSuperAdmin) {
      setNewCandidates(false);
      teamBadgeScopeRef.current = null;
      return;
    }
    const scope = `u:${sessionAuth?.userId != null ? sessionAuth.userId : 'me'}:c:${homeCompanyId}`;
    try {
      const key = `30team_lastTotal:${scope}`;
      if (teamBadgeScopeRef.current !== scope) {
        const prev = parseInt(localStorage.getItem(key) || '0', 10);
        if (prev > 0 && listTotal > prev) setNewCandidates(true);
        else setNewCandidates(false);
        localStorage.setItem(key, String(listTotal));
        teamBadgeScopeRef.current = scope;
      }
    } catch {
      /* ignore */
    }
  }, [isAdmin, sessionAuth?.userId, sessionAuth?.companyId, listTotal]);

  const {
    snapshot,
    navigateWithOpts,
    navigateToTab,
    pushFilters,
    pushTeamPagination,
    pushTeamSort,
    pushComparePagination,
    pushCompatListPagination,
  } = useDashboardNavigation({
    router,
    urlParams,
    area,
    vacancy,
    company,
    enneagram,
    pipeline,
    dateFrom,
    dateTo,
    search,
    isAdmin,
    teamPagination: pagination,
  });

  const pairs = compatMetrics.pairs || [];
  const tensions = compatMetrics.tensions || [];
  const synergies = compatMetrics.synergies || [];
  const typeCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  Object.assign(typeCount, compatMetrics.typeCount || {});
  const maxCount = Math.max(...Object.values(typeCount), 1);

  const byAssessmentId = {};
  interactionPeople.forEach((r) => {
    byAssessmentId[String(r.assessmentId)] = r;
  });

  const groupBase = groupBaseId ? byAssessmentId[String(groupBaseId)] : null;
  const groupMembers = groupIds.map((id) => byAssessmentId[String(id)]).filter(Boolean);

  const suggestions = groupBase
    ? interactionPeople
        .filter((r) => String(r.assessmentId) !== String(groupBase.assessmentId))
        .filter((r) => !dismissedIds.includes(String(r.assessmentId)))
        .map((r) => ({ person: r, compat: getCompat(groupBase.topType, r.topType, locale) }))
        .sort((x, y) => {
          const order = { synergy: 0, neutral: 1, tension: 2 };
          return (order[x.compat.level] ?? 9) - (order[y.compat.level] ?? 9);
        })
    : [];

  const groupPairs = [];
  for (let i = 0; i < groupMembers.length; i++) {
    for (let j = i + 1; j < groupMembers.length; j++) {
      const c = getCompat(groupMembers[i].topType, groupMembers[j].topType, locale);
      groupPairs.push({ a: groupMembers[i], b: groupMembers[j], compat: c });
    }
  }
  const groupTensions = groupPairs.filter((p) => p.compat.level === 'tension');

  const compareQueryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (isAdmin && company && company !== 'all') sp.set('company', company);
    if (area && area !== 'all') sp.set('area', area);
    if (vacancy && vacancy !== 'all') sp.set('vacancy', vacancy);
    if (enneagram && enneagram !== 'all') sp.set('enneagram', enneagram);
    if (roster && roster !== 'internal') sp.set('roster', roster);
    return sp.toString();
  }, [isAdmin, company, area, vacancy, enneagram, roster]);

  const comparePagSnap = parseComparePagination(snapshot());
  const compatListPagination = parseCompatTabPagination(snapshot());
  const teamQuerySort = parseTeamSort(snapshot());

  const clearAllFilters = () => {
    setArea('all');
    setVacancy('all');
    setPipeline('all');
    setRoster('internal');
    setEnneagram('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    if (isAdmin) setCompany('all');
    pushFilters({
      area: 'all', vacancy: 'all', pipeline: 'all', roster: 'internal', enneagram: 'all',
      dateFrom: null, dateTo: null, search: null,
      ...(isAdmin ? { company: 'all' } : {}),
    });
  };

  const _pipelineChipLabels = {
    new: t(locale, 'recruiting.pipelineNew'),
    interview: t(locale, 'recruiting.pipelineInterview'),
    test_completed: t(locale, 'recruiting.pipelineTestCompleted'),
    screening: t(locale, 'recruiting.pipelineScreening'),
    approved: t(locale, 'recruiting.pipelineApproved'),
    rejected: t(locale, 'recruiting.pipelineRejected'),
    archived: t(locale, 'recruiting.pipelineArchived'),
  };
  const activeChips = [];
  if (isAdmin && company !== 'all') {
    const co = companies.find((c) => String(c.id) === company);
    activeChips.push({ key: 'company', label: co?.name || company,
      onRemove: () => { setCompany('all'); pushFilters({ company: 'all', vacancy: 'all', pipeline: 'all' }); } });
  }
  if (area !== 'all') {
    const ar = areas.find((a) => a.key === area);
    activeChips.push({ key: 'area', label: localizeAreaLabel(ar, locale) || area,
      onRemove: () => { setArea('all'); setPipeline('all'); pushFilters({ area: 'all', pipeline: 'all' }); } });
  }
  if (vacancy !== 'all') {
    const vac = vacancies.find((v) => String(v.id) === vacancy);
    activeChips.push({ key: 'vacancy', label: vac?.title || vacancy,
      onRemove: () => { setVacancy('all'); setPipeline('all'); pushFilters({ vacancy: 'all', pipeline: 'all' }); } });
  }
  if (enneagram !== 'all') {
    activeChips.push({
      key: 'enneagram',
      label: `T${enneagram}`,
      title: typeHintTooltip(Number(enneagram), locale),
      onRemove: () => { setEnneagram('all'); pushFilters({ enneagram: 'all' }); },
    });
  }
  if (pipeline !== 'all') {
    activeChips.push({ key: 'pipeline', label: _pipelineChipLabels[pipeline] || pipeline,
      onRemove: () => { setPipeline('all'); pushFilters({ pipeline: 'all' }); } });
  }
  if (roster !== 'internal') {
    activeChips.push({
      key: 'roster',
      label: roster === 'recruiting'
        ? t(locale, 'dashboard.rosterRecruiting')
        : t(locale, 'dashboard.rosterAll'),
      onRemove: () => { setRoster('internal'); pushFilters({ roster: 'internal' }); },
    });
  }
  if (dateFrom) {
    activeChips.push({ key: 'dateFrom', label: t(locale, 'dashboard.dateFromChip', { date: dateFrom }),
      onRemove: () => { setDateFrom(''); pushFilters({ dateFrom: null, dateTo: dateTo || null }); } });
  }
  if (dateTo) {
    activeChips.push({ key: 'dateTo', label: t(locale, 'dashboard.dateToChip', { date: dateTo }),
      onRemove: () => { setDateTo(''); pushFilters({ dateFrom: dateFrom || null, dateTo: null }); } });
  }
  if (selectedSearch) {
    activeChips.push({ key: 'search', label: `"${selectedSearch}"`,
      onRemove: () => { setSearch(''); pushFilters({ search: null }); } });
  }

  /**
   * Leadership task is reading charts, not filtering people — stay collapsed by default.
   * Other tabs auto-expand advanced filters only when non-essential chips exist
   * (roster/vacancy stay in the always-visible essentials row).
   */
  const advancedChipCount = activeChips.filter((c) =>
    ['company', 'area', 'enneagram', 'pipeline', 'dateFrom', 'dateTo', 'search'].includes(c.key)
  ).length;
  const filtersExpanded = filtersOpen ?? (tab === 'leadership' ? false : advancedChipCount > 0);

  const exportUrl = `/api/admin/export?area=${encodeURIComponent(area)}${
    isAdmin && company !== 'all' ? `&company=${encodeURIComponent(company)}` : ''
  }${vacancy && vacancy !== 'all' ? `&vacancy=${encodeURIComponent(vacancy)}` : ''}${
    roster && roster !== 'internal' ? `&roster=${encodeURIComponent(roster)}` : ''
  }${
    pipeline && pipeline !== 'all' ? `&pipeline=${encodeURIComponent(pipeline)}` : ''
  }${dateFrom ? `&dateFrom=${encodeURIComponent(dateFrom)}` : ''}${
    dateTo ? `&dateTo=${encodeURIComponent(dateTo)}` : ''
  }${selectedSearch ? `&search=${encodeURIComponent(selectedSearch)}` : ''}`;

  const NavLink = ({ id, label, badge, icon }) => (
    <button
      type="button"
      onClick={() => { navigateToTab(id); setSidebarOpen(false); if (id === 'team') setNewCandidates(false); }}
      title={navCollapsed ? label : undefined}
      aria-label={label}
      aria-current={tab === id ? 'page' : undefined}
      className={cn(
        'relative mb-1 flex w-full items-center gap-2.5 rounded-control border-none font-mono text-[13px] tracking-[0.5px]',
        navCollapsed ? 'justify-center px-0 py-[11px]' : 'justify-start py-[11px]',
        !navCollapsed && (tab === id ? 'border-l-[3px] border-l-brand-500 pl-[9px] pr-3' : 'border-l-[3px] border-l-transparent pl-[11px] pr-3'),
        tab === id ? 'bg-brand-500/10 text-brand-800' : 'bg-transparent text-ink-muted',
        'cursor-pointer text-left'
      )}
    >
      <Icon name={icon} />
      {!navCollapsed ? <span className="min-w-0 flex-1">{label}</span> : null}
      {badge ? (
        <span
          className={cn(
            'inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full bg-brand-500',
            navCollapsed && 'absolute right-2.5 top-2'
          )}
        />
      ) : null}
    </button>
  );

  const sectionLabel = (text) => (
    navCollapsed ? (
      <div className="mx-1 mb-2 mt-2.5 h-px bg-ink/[0.08]" aria-hidden />
    ) : (
      <span className={S.sidebarSection}>{text}</span>
    )
  );

  return (
    <AppFeedbackProvider locale={locale}>
    <PipelineExtrasProvider>
    <div className="relative min-h-screen bg-canvas font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />

      <button
        type="button"
        className="db-hamburger"
        onClick={() => setSidebarOpen(true)}
        aria-label={t(locale, 'common.openMenu')}
        aria-expanded={sidebarOpen}
        aria-controls="dashboard-sidebar"
      >
        <Icon name="menu" />
      </button>
      <div
        className={`db-overlay${sidebarOpen ? ' db-overlay-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="relative z-[1] flex min-h-screen">
        <aside
          id="dashboard-sidebar"
          className={cn(
            'db-sidebar flex flex-shrink-0 flex-col gap-2 border-r border-ink/12 bg-white/88 backdrop-blur-[14px]',
            sidebarOpen && 'db-sidebar-open',
            navCollapsed && 'db-sidebar-collapsed',
            navCollapsed ? 'w-[72px] px-2.5 pb-6 pt-5' : 'w-[226px] pb-8 pl-[18px] pr-3.5 pt-6'
          )}
        >
          <div
            className={cn(
              'mb-2 flex gap-2',
              navCollapsed ? 'flex-col items-center justify-center' : 'flex-row items-start justify-between'
            )}
          >
            <div className={cn('min-w-0', navCollapsed ? 'text-center' : 'text-left')}>
              <BrandMark
                size={28}
                withWordmark={!navCollapsed}
                onClick={() => {
                  navigateToTab('overview');
                  setSidebarOpen(false);
                }}
                title={t(locale, 'dashboard.homeAria')}
                aria-label={t(locale, 'dashboard.homeAria')}
              />
              {!navCollapsed ? (
                <span className={cn(S.label, 'mt-2.5 block')}>{t(locale, 'dashboard.panel')}</span>
              ) : null}
            </div>
            <button
              type="button"
              className={cn(
                'db-sidebar-collapse-toggle flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-ink/12 bg-transparent text-ink-muted',
                !navCollapsed && 'mt-0.5'
              )}
              onClick={toggleSidebarCollapsed}
              aria-label={navCollapsed ? t(locale, 'dashboard.expandSidebar') : t(locale, 'dashboard.collapseSidebar')}
              title={navCollapsed ? t(locale, 'dashboard.expandSidebar') : t(locale, 'dashboard.collapseSidebar')}
            >
              <Icon name={navCollapsed ? 'expand' : 'collapse'} />
            </button>
          </div>
          <nav className="flex-1">
            {sectionLabel(t(locale, 'dashboard.sectionAnalysis'))}
            {can(sessionAuth, CAP.OVERVIEW_VIEW) ? (
              <NavLink id="overview" icon="overview" label={t(locale, 'dashboard.overview')} />
            ) : null}
            {can(sessionAuth, CAP.TEAM_VIEW) ? (
              <NavLink id="team" icon="team" label={t(locale, 'dashboard.team')} badge={newCandidates && tab !== 'team'} />
            ) : null}
            {can(sessionAuth, CAP.COMPATIBILITY_VIEW) ? (
              <NavLink id="compatibility" icon="compatibility" label={t(locale, 'dashboard.compatibility')} />
            ) : null}
            {can(sessionAuth, CAP.COMPARE_VIEW) ? (
              <NavLink id="compare" icon="compare" label={t(locale, 'dashboard.compare')} />
            ) : null}
            {can(sessionAuth, CAP.GROUP_VIEW) ? (
              <NavLink id="group" icon="group" label={t(locale, 'dashboard.group')} />
            ) : null}
            {can(sessionAuth, CAP.LEADERSHIP_VIEW) ? (
              <NavLink id="leadership" icon="leadership" label={t(locale, 'dashboard.leadership')} />
            ) : null}
            {showManagement ? (
              <>
                <div className="my-2 h-px bg-ink/[0.08]" />
                {sectionLabel(t(locale, 'dashboard.sectionManagement'))}
                {showVacancies ? <NavLink id="vacancies" icon="vacancies" label={t(locale, 'dashboard.vacancies')} /> : null}
                {showMotivators ? (
                  <NavLink id="motivators" icon="motivators" label={t(locale, 'dashboard.motivators')} />
                ) : null}
                {showClimate ? (
                  <NavLink id="climate" icon="climate" label={t(locale, 'dashboard.climate')} />
                ) : null}
                {showCompanies ? <NavLink id="companies" icon="companies" label={t(locale, 'dashboard.companies')} /> : null}
                {showUsers ? <NavLink id="users" icon="users" label={t(locale, 'dashboard.users')} /> : null}
              </>
            ) : showMotivators || showClimate ? (
              <>
                <div className="my-2 h-px bg-ink/[0.08]" />
                {sectionLabel(t(locale, 'dashboard.sectionManagement'))}
                {showMotivators ? (
                  <NavLink id="motivators" icon="motivators" label={t(locale, 'dashboard.motivators')} />
                ) : null}
                {showClimate ? (
                  <NavLink id="climate" icon="climate" label={t(locale, 'dashboard.climate')} />
                ) : null}
              </>
            ) : null}
            <div className="my-2 h-px bg-ink/[0.08]" />
            {sectionLabel(t(locale, 'dashboard.sectionHelp'))}
            {can(sessionAuth, CAP.HELP_VIEW) ? (
              <NavLink id="help" icon="help" label={t(locale, 'dashboard.help')} />
            ) : null}
          </nav>
          <div className={cn('flex flex-col gap-2', navCollapsed ? 'items-center' : 'items-stretch')}>
            <button
              type="button"
              onClick={logout}
              title={navCollapsed ? t(locale, 'dashboard.logout') : undefined}
              aria-label={t(locale, 'dashboard.logout')}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-control border border-danger/25 bg-transparent font-mono text-[11px] text-danger/60',
                navCollapsed ? 'w-10 justify-center p-[9px]' : 'w-full justify-start px-3 py-[9px] text-left'
              )}
            >
              <Icon name="logout" />
              {!navCollapsed ? <span>{t(locale, 'dashboard.logout')}</span> : null}
            </button>
            {!navCollapsed ? (
              <LanguageSelect locale={locale} onChange={setLocale} persistUser compact />
            ) : null}
          </div>
        </aside>

        <div className="db-main max-w-[1600px] min-w-0 flex-1 px-6 pb-[60px] pt-7">

          <div className="db-top-row mb-4 flex flex-wrap items-start gap-3">
          {showGlobalSearch ? (
          <div className="relative min-w-0 flex-[1_1_280px]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  pushFilters({ search: search.trim() || null });
                }
              }}
              onBlur={() => {
                const trimmed = search.trim();
                if (trimmed !== (selectedSearch || '').trim()) {
                  pushFilters({ search: trimmed || null });
                }
              }}
              placeholder={t(locale, 'dashboard.searchPlaceholder')}
              aria-label={t(locale, 'dashboard.searchAriaLabel')}
              className="box-border w-full rounded-xl border border-ink/12 bg-ink/[0.03] py-3 pl-[42px] pr-4 font-display text-sm text-ink"
            />
            <span className="pointer-events-none absolute left-[15px] top-1/2 inline-flex -translate-y-1/2 text-ink-faint"><Icon name="search" /></span>
            {selectedSearch && (
              <button
                type="button"
                onClick={() => { setSearch(''); pushFilters({ search: null }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent font-mono text-[13px] text-ink-muted"
              >
                {t(locale, 'common.clearSearch')}
              </button>
            )}
          </div>
          ) : (
            <div className="min-w-0 flex-[1_1_120px]" aria-hidden />
          )}
          <DashboardTopBarMenus
            locale={locale}
            auth={sessionAuth}
            navigateToTab={navigateToTab}
            onLogout={logout}
            onNavigateHref={(href) => {
              try {
                const u = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://local');
                router.push(`${u.pathname}${u.search}`);
              } catch {
                router.push(href);
              }
            }}
          />
          </div>

          {/* Title row */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1.5">
                <DashboardBreadcrumb
                  locale={locale}
                  tab={tab}
                  onHome={() => navigateToTab('overview')}
                />
              </div>
              <h2 className="db-page-title mb-1 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-[32px] font-normal text-transparent">
                {t(locale, getDashboardTabNav(tab).labelKey)}
              </h2>
              <span className="text-[13px] text-ink-muted">
                {panelLoading ? (
                  t(locale, 'dashboard.loadingPanel')
                ) : showsCohortChrome ? (
                  <>
                    {listTotal}{' '}
                    {listTotal === 1
                      ? t(locale, 'dashboard.assessmentSingular')
                      : t(locale, 'dashboard.assessmentPlural')}
                    {pagination.total > 0 && tab === 'team' ? (
                      <span className="text-ink-faint">
                        {' '}
                        ·{' '}
                        {t(locale, 'dashboard.pageInfo', {
                          page: pagination.page,
                          totalPages: pagination.totalPages,
                          pageSize: pagination.pageSize,
                        })}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-end">
              {showsCohortChrome && !panelLoading ? (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(!filtersExpanded)}
                  aria-expanded={filtersExpanded}
                  aria-label={t(locale, 'dashboard.filtersToggleAria')}
                  className={cn(
                    'min-h-touch cursor-pointer rounded-control border px-3.5 py-2.5 font-mono text-[13px]',
                    filtersExpanded
                      ? 'border-brand-500/25 bg-brand-500/10 text-brand-500'
                      : 'border-ink/12 bg-transparent text-ink-muted'
                  )}
                >
                  {filtersExpanded
                    ? t(locale, 'dashboard.hideFilters')
                    : t(locale, 'dashboard.showFilters')}
                  {!filtersExpanded && advancedChipCount > 0
                    ? ` · ${advancedChipCount}`
                    : ''}
                </button>
              ) : null}
              {showsCohortChrome && !panelLoading ? (
              <ExportCsvButton href={exportUrl} locale={locale} />
              ) : null}
            </div>
          </div>

          {panelLoading ? (
            <div role="status" aria-live="polite" className="min-h-[240px] py-12">
              <AppLoading variant="panel" label={t(locale, 'dashboard.loadingPanel')} />
            </div>
          ) : (
          <>
          {/* Filter row — essentials always on; advanced behind disclosure */}
          {showsCohortChrome ? (
          <>
          <div
            className={cn(
              'db-filters flex flex-wrap items-center gap-2',
              filtersExpanded ? 'mb-2' : 'mb-2.5'
            )}
            role="group"
            aria-label={t(locale, 'dashboard.filtersEssentialsAria')}
          >
            <select
              value={roster}
              onChange={(e) => {
                const v = e.target.value;
                setRoster(v);
                pushFilters({ roster: v });
              }}
              className={S.select}
              title={t(locale, 'dashboard.rosterHint')}
            >
              <option value="internal">{t(locale, 'dashboard.rosterInternal')}</option>
              <option value="recruiting">{t(locale, 'dashboard.rosterRecruiting')}</option>
              <option value="all">{t(locale, 'dashboard.rosterAll')}</option>
            </select>
            <select
              value={vacancy}
              onChange={(e) => {
                const v = e.target.value;
                setVacancy(v);
                setPipeline('all');
                if (isAdmin && v !== 'all') {
                  const hit = vacancies.find((x) => String(x.id) === v);
                  if (hit != null && hit.companyId != null) {
                    setCompany(String(hit.companyId));
                    pushFilters({ vacancy: v, company: String(hit.companyId), pipeline: 'all' });
                    return;
                  }
                }
                pushFilters({ vacancy: v, pipeline: 'all' });
              }}
              className={S.select}
            >
              <option value="all">{t(locale, 'dashboard.allVacancies')}</option>
              {vacancies.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.title} {v.status === 'closed' ? t(locale, 'dashboard.closed') : ''}
                </option>
              ))}
            </select>
          </div>

          {filtersExpanded ? (
          <div
            className="db-filters mb-2.5 flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t(locale, 'dashboard.filtersAdvancedAria')}
          >
            {isAdmin && companies.length > 0 ? (
              <select
                value={company}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompany(v);
                  setPipeline('all');
                  pushFilters({ company: v, vacancy: 'all', pipeline: 'all' });
                }}
                className={S.select}
              >
                <option value="all">{t(locale, 'dashboard.allCompanies')}</option>
                {companies.map((co) => (
                  <option key={co.id} value={String(co.id)}>{co.name}</option>
                ))}
              </select>
            ) : null}
            <select value={area} onChange={(e) => { const v = e.target.value; setArea(v); setPipeline('all'); pushFilters({ area: v, pipeline: 'all' }); }} className={S.select}>
              <option value="all">{t(locale, 'dashboard.allAreas')}</option>
              {areas.map((a) => (
                <option key={a.key} value={a.key}>
                  {localizeAreaLabel(a, locale)} ({counts.find((c) => c.key === a.key)?.count ?? 0})
                </option>
              ))}
            </select>
            <select value={enneagram} onChange={(e) => { const v = e.target.value; setEnneagram(v); pushFilters({ enneagram: v }); }} className={S.select}>
              <option value="all">{t(locale, 'dashboard.allProfiles')}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                <option key={t} value={String(t)} title={typeHintTooltip(t, locale)}>
                  T{t} · {typeData[t].short}
                </option>
              ))}
            </select>
            <select value={pipeline} onChange={(e) => { const v = e.target.value; setPipeline(v); pushFilters({ pipeline: v }); }} className={S.select}>
              <option value="all">{t(locale, 'recruiting.pipelineAll')}</option>
              <option value="new">{t(locale, 'recruiting.pipelineNew')}</option>
              <option value="interview">{t(locale, 'recruiting.pipelineInterview')}</option>
              <option value="test_completed">{t(locale, 'recruiting.pipelineTestCompleted')}</option>
              <option value="screening">{t(locale, 'recruiting.pipelineScreening')}</option>
              <option value="approved">{t(locale, 'recruiting.pipelineApproved')}</option>
              <option value="rejected">{t(locale, 'recruiting.pipelineRejected')}</option>
              <option value="archived">{t(locale, 'recruiting.pipelineArchived')}</option>
            </select>
            <div className="inline-flex items-center gap-1.5 rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-1.5">
              <span className="whitespace-nowrap font-mono text-[11px] text-ink-faint">{t(locale, 'dashboard.dateFromLabel')}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { const v = e.target.value; setDateFrom(v); pushFilters({ dateFrom: v || null, dateTo: dateTo || null }); }}
                className="min-w-[120px] border-none bg-transparent font-mono text-xs text-ink-muted outline-none"
              />
              <span className="whitespace-nowrap font-mono text-[11px] text-ink-faint">{t(locale, 'dashboard.dateToLabel')}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { const v = e.target.value; setDateTo(v); pushFilters({ dateFrom: dateFrom || null, dateTo: v || null }); }}
                className="min-w-[120px] border-none bg-transparent font-mono text-xs text-ink-muted outline-none"
              />
            </div>
          </div>
          ) : null}

          {/* Active filter chips — always visible when set */}
          {activeChips.length > 0 ? (
            <div className="mb-5 flex flex-wrap items-center gap-1.5">
              {activeChips.map((chip) => (
                <span key={chip.key} className={S.filterChip} title={chip.title}>
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={chip.title || chip.label}
                    className="inline-flex cursor-pointer items-center border-none bg-transparent p-0 pl-0.5 leading-none text-brand-600"
                  >
                    <Icon name="clear" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="cursor-pointer rounded-full border border-ink/12 bg-transparent px-2.5 py-1 font-mono text-[11px] text-ink-muted"
              >
                {t(locale, 'common.clearAll')}
              </button>
            </div>
          ) : (
            <div className="mb-4" />
          )}
          </>
          ) : (
            <div className="mb-3" />
          )}

          {showsCohortChrome && compatMetrics.total === 0 && tab !== 'overview' ? (
            <div className={cn(S.card, 'p-[60px] text-center')}>
              <div className="mb-4 text-[40px]">🌑</div>
              <p className="italic text-ink-muted">
                {t(locale, 'dashboard.empty').split('\n').map((line, i) => (
                  <span key={line}>
                    {i > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <>
              {tab === 'leadership' && <LeadershipTab analytics={analytics} locale={locale} />}
              {tab === 'overview' && (
                <OverviewTab
                  overview={overviewMetrics}
                  typeCount={typeCount}
                  distributionTotal={listTotal}
                  locale={locale}
                  filters={{
                    companyLabel:
                      isAdmin && company !== 'all'
                        ? (companies.find((c) => String(c.id) === String(company))?.name || company)
                        : null,
                    area,
                    areaLabel: areas.find((a) => a.key === area)?.label,
                    vacancy,
                    vacancyLabel: vacancies.find((v) => String(v.id) === String(vacancy))?.title,
                    dateFrom: dateFrom || null,
                    dateTo: dateTo || null,
                    search: selectedSearch || null,
                  }}
                  navigateDashboard={(opts) => {
                    if (opts.pipeline != null) setPipeline(opts.pipeline);
                    if (opts.search != null) setSearch(opts.search || '');
                    navigateWithOpts({
                      ...opts,
                      teamPage: 1,
                      ...(opts.search !== undefined ? { search: opts.search } : {}),
                    });
                  }}
                />
              )}
              {tab === 'team' && (
                <>
                  <TeamTab
                    results={results}
                    sortKey={teamQuerySort.sort}
                    sortDir={teamQuerySort.dir}
                    onSort={pushTeamSort}
                    locale={locale}
                    isAdmin={isAdmin}
                    search={selectedSearch}
                    listTotal={listTotal}
                    focusCandidateId={urlParams.get('candidate')}
                    onSearch={(value) => {
                      setSearch(value || '');
                      pushFilters({ search: value });
                    }}
                  />
                  {listTotal > 0 ? (
                    <div className={cn(S.card, 'mt-[18px] flex flex-wrap items-center justify-between gap-3 px-[22px] py-4')}>
                      <span className="font-mono text-[13px] text-ink-muted">
                        {t(locale, 'dashboard.itemsPerPageTeam')}
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <select
                          value={String(pagination.pageSize)}
                          onChange={(e) => {
                            const ps = parseInt(e.target.value, 10);
                            pushTeamPagination({ teamPage: 1, teamPageSize: ps });
                          }}
                          className="cursor-pointer rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-2 font-mono text-xs text-ink-muted"
                        >
                          {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={String(n)}>{t(locale, 'dashboard.perPage', { n })}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => pushTeamPagination({ teamPage: pagination.page - 1 })}
                            className={cn(
                              'rounded-control border border-ink/12 bg-transparent px-3.5 py-2 font-mono text-[13px]',
                              pagination.page <= 1
                                ? 'cursor-default text-ink-faint'
                                : 'cursor-pointer text-ink-muted'
                            )}
                          >
                            {t(locale, 'dashboard.previous')}
                          </button>
                          <span className="min-w-[100px] text-center font-mono text-[13px] text-ink-muted">
                            {pagination.page} / {pagination.totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => pushTeamPagination({ teamPage: pagination.page + 1 })}
                            className={cn(
                              'rounded-control border border-ink/12 bg-transparent px-3.5 py-2 font-mono text-[13px]',
                              pagination.page >= pagination.totalPages
                                ? 'cursor-default text-ink-faint'
                                : 'cursor-pointer text-ink-muted'
                            )}
                          >
                            {t(locale, 'dashboard.next')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              {tab === 'compatibility' && (
                <CompatTab
                  tensions={tensions}
                  synergies={synergies}
                  pairs={pairs}
                  compatPage={compatListPagination.page}
                  compatPageSize={compatListPagination.pageSize}
                  onCompatPagination={pushCompatListPagination}
                  locale={locale}
                />
              )}
              {tab === 'compare' && (
                <CompareTabLoader
                  filterQueryString={compareQueryString}
                  comparePage={comparePagSnap.page}
                  comparePageSize={comparePagSnap.pageSize}
                  onComparePagination={pushComparePagination}
                  locale={locale}
                  search={selectedSearch}
                  onSearch={(value) => {
                    setSearch(value || '');
                    pushFilters({ search: value });
                  }}
                />
              )}
              {tab === 'vacancies' && showVacancies && <VacanciesAdminTab isAdmin={isAdmin} navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'motivators' && showMotivators && (
                <MotivatorsAdminTab isAdmin={isAdmin} companies={companies} locale={locale} />
              )}
              {tab === 'climate' && showClimate && (
                <ClimateTab isAdmin={isAdmin} companies={companies} locale={locale} />
              )}
              {tab === 'companies' && showCompanies && <CompaniesAdminTab navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'users' && showUsers && <UsersAdminTab navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'help' && can(sessionAuth, CAP.HELP_VIEW) && <HelpTab locale={locale} navigateDashboard={navigateWithOpts} />}
              {tab === 'profile' && can(sessionAuth, CAP.PROFILE_SELF) && (
                <ProfileTab
                  locale={locale}
                  onLocaleChange={setLocale}
                  onProfileSaved={(user) => {
                    if (!user) return;
                    setSessionAuth((prev) => ({
                      ...(prev || {}),
                      displayName: user.displayName != null ? user.displayName : prev?.displayName,
                      email: user.email || prev?.email,
                      locale: user.locale || prev?.locale,
                    }));
                  }}
                />
              )}
              {tab === 'group' && (
                <GroupTab
                  results={interactionPeople}
                  groupBase={groupBase}
                  setGroupBaseId={setGroupBaseId}
                  groupIds={groupIds}
                  setGroupIds={setGroupIds}
                  dismissedIds={dismissedIds}
                  setDismissedIds={setDismissedIds}
                  suggestions={suggestions}
                  groupTensions={groupTensions}
                  locale={locale}
                  companyId={
                    isAdmin
                      ? (company !== 'all' ? company : null)
                      : (sessionAuth?.companyId ?? null)
                  }
                />
              )}
            </>
          )}
          </>
          )}
        </div>
      </div>
    </div>
    </PipelineExtrasProvider>
    </AppFeedbackProvider>
  );
}
