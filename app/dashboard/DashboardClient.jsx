'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCompat } from '../../lib/data';
import { getTypeData, localizeAreaLabel } from '../../lib/i18n-data';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { C, FONTS, GRADIENT } from '../../lib/theme';
import LanguageSelect from '../_components/LanguageSelect';

import {
  PAGE_SIZE_OPTIONS,
  parseComparePagination,
  parseCompatTabPagination,
  parseDashboardTab,
  parseTeamSort,
} from '../../lib/assessment-filters';

import { S } from './dashboard-shared';
import { useDashboardNavigation } from './hooks/useDashboardNavigation';
import { CompareTabLoader } from './tabs/CompareTabLoader';
import { CompatTab } from './tabs/CompatTab';
import { CompaniesAdminTab } from './tabs/CompaniesAdminTab';
import { GroupTab } from './tabs/GroupTab';
import { LeadershipTab } from './tabs/LeadershipTab';
import { OverviewTab } from './tabs/OverviewTab';
import { TeamTab } from './tabs/TeamTab';
import { UsersAdminTab } from './tabs/UsersAdminTab';
import { VacanciesAdminTab } from './tabs/VacanciesAdminTab';
import MotivatorsAdminTab from './tabs/MotivatorsAdminTab';
import { HelpTab } from './tabs/HelpTab';
import { PipelineExtrasProvider } from './PipelineExtrasContext';

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
  const [newCandidates, setNewCandidates] = useState(false);
  const [groupBaseId, setGroupBaseId] = useState(null);
  const [groupIds, setGroupIds] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const typeData = getTypeData(locale);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const isAdmin = (auth?.role || '') === 'admin';
  const canManage = ['admin', 'hr', 'direction'].includes(auth?.role || '');
  const tab = parseDashboardTab(urlParams, { canVacancies: canManage, isAdmin });

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
  useEffect(() => {
    try {
      const prev = parseInt(localStorage.getItem('30team_lastTotal') || '0', 10);
      if (listTotal > prev) setNewCandidates(true);
      localStorage.setItem('30team_lastTotal', String(listTotal));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    activeChips.push({ key: 'enneagram', label: `T${enneagram}`,
      onRemove: () => { setEnneagram('all'); pushFilters({ enneagram: 'all' }); } });
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

  const exportUrl = `/api/admin/export?area=${encodeURIComponent(area)}${
    isAdmin && company !== 'all' ? `&company=${encodeURIComponent(company)}` : ''
  }${vacancy && vacancy !== 'all' ? `&vacancy=${encodeURIComponent(vacancy)}` : ''}${
    roster && roster !== 'internal' ? `&roster=${encodeURIComponent(roster)}` : ''
  }${
    pipeline && pipeline !== 'all' ? `&pipeline=${encodeURIComponent(pipeline)}` : ''
  }${dateFrom ? `&dateFrom=${encodeURIComponent(dateFrom)}` : ''}${
    dateTo ? `&dateTo=${encodeURIComponent(dateTo)}` : ''
  }${selectedSearch ? `&search=${encodeURIComponent(selectedSearch)}` : ''}`;

  const NavLink = ({ id, label, badge }) => (
    <button
      type="button"
      onClick={() => { navigateToTab(id); setSidebarOpen(false); if (id === 'team') setNewCandidates(false); }}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '11px 12px',
        marginBottom: '4px',
        borderRadius: '10px',
        border: 'none',
        background: tab === id ? `${C.purple}18` : 'transparent',
        color: tab === id ? C.purpleDark : C.muted,
        fontSize: '13px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        letterSpacing: '0.5px',
        borderLeft: tab === id ? `3px solid ${C.purple}` : '3px solid transparent',
        paddingLeft: tab === id ? '9px' : '11px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {label}
      {badge && (
        <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
          background: C.purple, flexShrink: 0 }} />
      )}
    </button>
  );

  return (
    <PipelineExtrasProvider>
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Georgia','Times New Roman',serif",
      color: C.text,
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.06) 0%,transparent 55%)' }} />

      <button
        type="button"
        className="db-hamburger"
        onClick={() => setSidebarOpen(true)}
        aria-label={t(locale, 'common.openMenu')}
      >
        ☰
      </button>
      <div
        className={`db-overlay${sidebarOpen ? ' db-overlay-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <aside className={`db-sidebar${sidebarOpen ? ' db-sidebar-open' : ''}`} style={{
          width: '226px',
          flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          padding: '24px 14px 32px 18px',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <span style={{ ...S.label, marginBottom: '4px', display: 'block' }}>{t(locale, 'dashboard.panel')}</span>
          <nav style={{ flex: 1 }}>
            <span style={S.sidebarSection}>{t(locale, 'dashboard.sectionAnalysis')}</span>
            <NavLink id="overview" label={t(locale, 'dashboard.overview')} />
            <NavLink id="team" label={t(locale, 'dashboard.team')} badge={newCandidates && tab !== 'team'} />
            <NavLink id="compatibility" label={t(locale, 'dashboard.compatibility')} />
            <NavLink id="compare" label={t(locale, 'dashboard.compare')} />
            <NavLink id="group" label={t(locale, 'dashboard.group')} />
            <NavLink id="leadership" label={t(locale, 'dashboard.leadership')} />
            {(canManage || isAdmin) && (
              <>
                <div style={{ height: '1px', background: 'rgba(26,22,37,.08)', margin: '10px 0 8px' }} />
                <span style={S.sidebarSection}>{t(locale, 'dashboard.sectionManagement')}</span>
                {canManage ? <NavLink id="vacancies" label={t(locale, 'dashboard.vacancies')} /> : null}
                {canManage ? <NavLink id="motivators" label={t(locale, 'dashboard.motivators')} /> : null}
                {isAdmin ? <NavLink id="companies" label={t(locale, 'dashboard.companies')} /> : null}
                {isAdmin ? <NavLink id="users" label={t(locale, 'dashboard.users')} /> : null}
              </>
            )}
            <div style={{ height: '1px', background: 'rgba(26,22,37,.08)', margin: '10px 0 8px' }} />
            <span style={S.sidebarSection}>{t(locale, 'dashboard.sectionHelp')}</span>
            <NavLink id="help" label={t(locale, 'dashboard.help')} />
          </nav>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={logout}
              style={{ background: 'transparent', border: `1px solid rgba(220,38,38,.25)`,
                borderRadius: '10px', padding: '9px 12px', color: 'rgba(220,38,38,.6)',
                fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace',
                textAlign: 'left', width: '100%' }}
            >
              {t(locale, 'dashboard.logout')}
            </button>
            <LanguageSelect locale={locale} onChange={setLocale} persistUser compact />
          </div>
        </aside>

        <div className="db-main" style={{
          flex: 1,
          minWidth: 0,
          padding: '28px 24px 60px',
          maxWidth: '1600px',
        }}>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
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
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(26,22,37,.03)',
                border: `1px solid ${C.border}`, borderRadius: '12px',
                padding: '12px 16px 12px 42px', color: C.text, fontSize: '14px',
                fontFamily: "'Georgia',serif" }}
            />
            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)',
              color: C.faint, fontSize: '16px', pointerEvents: 'none' }}>⌕</span>
            {selectedSearch && (
              <button
                type="button"
                onClick={() => { setSearch(''); pushFilters({ search: null }); }}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}
              >
                {t(locale, 'common.clearSearch')}
              </button>
            )}
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <span style={S.label}>◈ 30Team · {t(locale, 'dashboard.dashboard')}</span>
              <h2 style={{ fontSize: '32px', fontWeight: 'normal', marginBottom: '4px',
                background: GRADIENT.title,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t(locale, 'dashboard.title')}
              </h2>
              <span style={{ fontSize: '13px', color: C.muted }}>
                {listTotal} {listTotal === 1 ? t(locale, 'dashboard.assessmentSingular') : t(locale, 'dashboard.assessmentPlural')}
                {pagination.total > 0 && tab === 'team' ? (
                  <span style={{ color: C.faint }}>
                    {' '}· {t(locale, 'dashboard.pageInfo', { page: pagination.page, totalPages: pagination.totalPages, pageSize: pagination.pageSize })}
                  </span>
                ) : null}
              </span>
            </div>
            <a
              href={exportUrl}
              style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}44`,
                borderRadius: '10px', padding: '10px 16px', color: C.purple,
                fontSize: '13px', fontFamily: FONTS.serif, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
            >
              ↓ {t(locale, 'dashboard.exportCsv')}
            </a>
          </div>

          {/* Filter row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            {isAdmin && companies.length > 0 ? (
              <select
                value={company}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompany(v);
                  setPipeline('all');
                  pushFilters({ company: v, vacancy: 'all', pipeline: 'all' });
                }}
                style={S.select}
              >
                <option value="all">{t(locale, 'dashboard.allCompanies')}</option>
                {companies.map((co) => (
                  <option key={co.id} value={String(co.id)}>{co.name}</option>
                ))}
              </select>
            ) : null}
            <select value={area} onChange={(e) => { const v = e.target.value; setArea(v); setPipeline('all'); pushFilters({ area: v, pipeline: 'all' }); }} style={S.select}>
              <option value="all">{t(locale, 'dashboard.allAreas')}</option>
              {areas.map((a) => (
                <option key={a.key} value={a.key}>
                  {localizeAreaLabel(a, locale)} ({counts.find((c) => c.key === a.key)?.count ?? 0})
                </option>
              ))}
            </select>
            <select
              value={roster}
              onChange={(e) => {
                const v = e.target.value;
                setRoster(v);
                pushFilters({ roster: v });
              }}
              style={S.select}
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
              style={S.select}
            >
              <option value="all">{t(locale, 'dashboard.allVacancies')}</option>
              {vacancies.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.title} {v.status === 'closed' ? t(locale, 'dashboard.closed') : ''}
                </option>
              ))}
            </select>
            <select value={enneagram} onChange={(e) => { const v = e.target.value; setEnneagram(v); pushFilters({ enneagram: v }); }} style={S.select}>
              <option value="all">{t(locale, 'dashboard.allProfiles')}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                <option key={t} value={String(t)}>T{t} · {typeData[t].short}</option>
              ))}
            </select>
            <select value={pipeline} onChange={(e) => { const v = e.target.value; setPipeline(v); pushFilters({ pipeline: v }); }} style={S.select}>
              <option value="all">{t(locale, 'recruiting.pipelineAll')}</option>
              <option value="new">{t(locale, 'recruiting.pipelineNew')}</option>
              <option value="interview">{t(locale, 'recruiting.pipelineInterview')}</option>
              <option value="test_completed">{t(locale, 'recruiting.pipelineTestCompleted')}</option>
              <option value="screening">{t(locale, 'recruiting.pipelineScreening')}</option>
              <option value="approved">{t(locale, 'recruiting.pipelineApproved')}</option>
              <option value="rejected">{t(locale, 'recruiting.pipelineRejected')}</option>
              <option value="archived">{t(locale, 'recruiting.pipelineArchived')}</option>
            </select>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '10px',
              padding: '6px 12px' }}>
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}>{t(locale, 'dashboard.dateFromLabel')}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { const v = e.target.value; setDateFrom(v); pushFilters({ dateFrom: v || null, dateTo: dateTo || null }); }}
                style={{ border: 'none', background: 'transparent', color: C.muted,
                  fontSize: '12px', fontFamily: FONTS.mono, outline: 'none', minWidth: '120px' }}
              />
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}>{t(locale, 'dashboard.dateToLabel')}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { const v = e.target.value; setDateTo(v); pushFilters({ dateFrom: dateFrom || null, dateTo: v || null }); }}
                style={{ border: 'none', background: 'transparent', color: C.muted,
                  fontSize: '12px', fontFamily: FONTS.mono, outline: 'none', minWidth: '120px' }}
              />
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
              {activeChips.map((chip) => (
                <span key={chip.key} style={S.filterChip}>
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: C.purpleLight, fontSize: '11px', padding: '0 0 0 2px',
                      lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                style={{ fontSize: '11px', color: C.muted, fontFamily: FONTS.mono,
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: '20px', padding: '4px 10px', cursor: 'pointer' }}
              >
                {t(locale, 'common.clearAll')}
              </button>
            </div>
          )}

          {compatMetrics.total === 0
            && tab !== 'companies'
            && tab !== 'users'
            && tab !== 'vacancies'
            && tab !== 'motivators'
            && tab !== 'help'
            && tab !== 'overview' ? (
            <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌑</div>
              <p style={{ color: C.muted, fontStyle: 'italic' }}>
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
                    onSearch={(value) => {
                      setSearch(value || '');
                      pushFilters({ search: value });
                    }}
                  />
                  {listTotal > 0 ? (
                    <div style={{ ...S.card, padding: '16px 22px', marginTop: '18px', display: 'flex',
                      flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: C.muted, fontFamily: 'monospace' }}>
                        {t(locale, 'dashboard.itemsPerPageTeam')}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <select
                          value={String(pagination.pageSize)}
                          onChange={(e) => {
                            const ps = parseInt(e.target.value, 10);
                            pushTeamPagination({ teamPage: 1, teamPageSize: ps });
                          }}
                          style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                            borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                            cursor: 'pointer', fontFamily: 'monospace' }}
                        >
                          {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={String(n)}>{t(locale, 'dashboard.perPage', { n })}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => pushTeamPagination({ teamPage: pagination.page - 1 })}
                            style={{ background: pagination.page <= 1 ? 'transparent' : `${C.purple}18`,
                              border: `1px solid ${pagination.page <= 1 ? C.border : `${C.purple}55`}`,
                              borderRadius: '10px', padding: '8px 14px', color: pagination.page <= 1 ? C.faint : C.purple,
                              fontSize: '13px', cursor: pagination.page <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                          >
                            {t(locale, 'dashboard.previous')}
                          </button>
                          <span style={{ fontSize: '13px', color: C.muted, fontFamily: 'monospace', minWidth: '100px', textAlign: 'center' }}>
                            {pagination.page} / {pagination.totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => pushTeamPagination({ teamPage: pagination.page + 1 })}
                            style={{ background: pagination.page >= pagination.totalPages ? 'transparent' : `${C.purple}18`,
                              border: `1px solid ${pagination.page >= pagination.totalPages ? C.border : `${C.purple}55`}`,
                              borderRadius: '10px', padding: '8px 14px',
                              color: pagination.page >= pagination.totalPages ? C.faint : C.purple,
                              fontSize: '13px',
                              cursor: pagination.page >= pagination.totalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
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
              {tab === 'vacancies' && canManage && <VacanciesAdminTab isAdmin={isAdmin} navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'motivators' && canManage && (
                <Suspense fallback={<div style={{ color: C.muted, padding: '24px' }}>{t(locale, 'common.loading')}</div>}>
                  <MotivatorsAdminTab isAdmin={isAdmin} companies={companies} locale={locale} />
                </Suspense>
              )}
              {tab === 'companies' && isAdmin && <CompaniesAdminTab navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'users' && isAdmin && <UsersAdminTab navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'help' && <HelpTab locale={locale} navigateDashboard={navigateWithOpts} />}
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
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </PipelineExtrasProvider>
  );
}
