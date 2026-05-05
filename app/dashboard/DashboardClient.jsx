'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCompat } from '../../lib/data';
import { getTypeData, localizeAreaLabel } from '../../lib/i18n-data';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { C } from '../../lib/theme';
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

export default function DashboardClient({
  results,
  areas = [],
  companies = [],
  counts = [],
  vacancies = [],
  selectedArea = 'all',
  selectedVacancy = 'all',
  selectedPipeline = 'all',
  selectedCompany = 'all',
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
    isAdmin,
    teamPagination: pagination,
  });

  const pairs = compatMetrics.pairs || [];
  const tensions = compatMetrics.tensions || [];
  const synergies = compatMetrics.synergies || [];
  const typeCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  Object.assign(typeCount, compatMetrics.typeCount || {});
  const maxCount = Math.max(...Object.values(typeCount), 1);
  const listTotal = compatMetrics.total ?? 0;

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
        .map((r) => ({ person: r, compat: getCompat(groupBase.topType, r.topType) }))
        .sort((x, y) => {
          const order = { synergy: 0, neutral: 1, tension: 2 };
          return (order[x.compat.level] ?? 9) - (order[y.compat.level] ?? 9);
        })
    : [];

  const groupPairs = [];
  for (let i = 0; i < groupMembers.length; i++) {
    for (let j = i + 1; j < groupMembers.length; j++) {
      const c = getCompat(groupMembers[i].topType, groupMembers[j].topType);
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
    return sp.toString();
  }, [isAdmin, company, area, vacancy, enneagram]);

  const comparePagSnap = parseComparePagination(snapshot());
  const compatListPagination = parseCompatTabPagination(snapshot());
  const teamQuerySort = parseTeamSort(snapshot());

  const NavLink = ({ id, label }) => (
    <button
      type="button"
      onClick={() => navigateToTab(id)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '11px 12px',
        marginBottom: '4px',
        borderRadius: '10px',
        border: 'none',
        background: tab === id ? `${C.purple}18` : 'transparent',
        color: tab === id ? C.purpleDark : C.muted,
        fontSize: '12px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        letterSpacing: '0.5px',
        borderLeft: tab === id ? `3px solid ${C.purple}` : '3px solid transparent',
        paddingLeft: tab === id ? '9px' : '11px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Georgia','Times New Roman',serif",
      color: C.text,
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.06) 0%,transparent 55%)' }} />

      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <aside style={{
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
            <NavLink id="overview" label={t(locale, 'dashboard.overview')} />
            <NavLink id="team" label={t(locale, 'dashboard.team')} />
            <NavLink id="compatibility" label={t(locale, 'dashboard.compatibility')} />
            <NavLink id="compare" label={t(locale, 'dashboard.compare')} />
            <NavLink id="group" label={t(locale, 'dashboard.group')} />
            <NavLink id="leadership" label={t(locale, 'dashboard.leadership')} />
            {canManage ? <NavLink id="vacancies" label={t(locale, 'dashboard.vacancies')} /> : null}
            {isAdmin ? <NavLink id="companies" label={t(locale, 'dashboard.companies')} /> : null}
            {isAdmin ? <NavLink id="users" label={t(locale, 'dashboard.users')} /> : null}
          </nav>
          <LanguageSelect locale={locale} onChange={setLocale} persistUser compact />
        </aside>

        <div style={{
          flex: 1,
          minWidth: 0,
          padding: '28px 24px 60px',
          maxWidth: '1120px',
        }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
            <div>
              <span style={S.label}>◈ 30Team · {t(locale, 'dashboard.dashboard')}</span>
              <h2 style={{ fontSize: '32px', fontWeight: 'normal', marginBottom: '4px',
                background: 'linear-gradient(135deg,#E8E0FF,#A78BFA 55%,#7C3AED)',
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {isAdmin && companies.length > 0 ? (
                <select
                  value={company}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompany(v);
                    setPipeline('all');
                    pushFilters({ company: v, vacancy: 'all', pipeline: 'all' });
                  }}
                  style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '10px 14px', color: C.muted,
                    fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif" }}
                >
                  <option value="all">{t(locale, 'dashboard.allCompanies')}</option>
                  {companies.map((co) => (
                    <option key={co.id} value={String(co.id)}>
                      {co.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <select value={area} onChange={(e) => { const v = e.target.value; setArea(v); setPipeline('all'); pushFilters({ area: v, pipeline: 'all' }); }}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 14px', color: C.muted,
                  fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif" }}>
                <option value="all">{t(locale, 'dashboard.allAreas')}</option>
                {areas.map((a) => (
                  <option key={a.key} value={a.key}>
                    {localizeAreaLabel(a, locale)} ({counts.find((c) => c.key === a.key)?.count ?? 0})
                  </option>
                ))}
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
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 14px', color: C.muted,
                  fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif" }}>
                <option value="all">{t(locale, 'dashboard.allVacancies')}</option>
                {vacancies.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.title} {v.status === 'closed' ? t(locale, 'dashboard.closed') : ''}
                  </option>
                ))}
              </select>
              <select
                value={enneagram}
                onChange={(e) => {
                  const v = e.target.value;
                  setEnneagram(v);
                  pushFilters({ enneagram: v });
                }}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 14px', color: C.muted,
                  fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif" }}>
                <option value="all">{t(locale, 'dashboard.allProfiles')}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                  <option key={t} value={String(t)}>
                    T{t} · {typeData[t].short}
                  </option>
                ))}
              </select>
              <select
                value={pipeline}
                onChange={(e) => {
                  const v = e.target.value;
                  setPipeline(v);
                  pushFilters({ pipeline: v });
                }}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 14px', color: C.muted,
                  fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif" }}
              >
                <option value="all">{t(locale, 'recruiting.pipelineAll')}</option>
                <option value="new">{t(locale, 'recruiting.pipelineNew')}</option>
                <option value="test_completed">{t(locale, 'recruiting.pipelineTestCompleted')}</option>
                <option value="screening">{t(locale, 'recruiting.pipelineScreening')}</option>
                <option value="interview">{t(locale, 'recruiting.pipelineInterview')}</option>
                <option value="approved">{t(locale, 'recruiting.pipelineApproved')}</option>
                <option value="rejected">{t(locale, 'recruiting.pipelineRejected')}</option>
                <option value="archived">{t(locale, 'recruiting.pipelineArchived')}</option>
              </select>
              <a
                href={`/api/admin/export?area=${encodeURIComponent(area)}${
                  isAdmin && company !== 'all' ? `&company=${encodeURIComponent(company)}` : ''
                }${vacancy && vacancy !== 'all' ? `&vacancy=${encodeURIComponent(vacancy)}` : ''}${
                  pipeline && pipeline !== 'all' ? `&pipeline=${encodeURIComponent(pipeline)}` : ''
                }`}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 14px', color: C.muted,
                  fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif",
                  textDecoration: 'none', display: 'inline-block' }}
              >
                {t(locale, 'dashboard.exportCsv')}
              </a>
              <button type="button" onClick={logout}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 20px', color: C.muted,
                  fontSize: '12px', cursor: 'pointer', fontFamily: "'Georgia',serif" }}>
                {t(locale, 'dashboard.logout')}
              </button>
            </div>
          </div>

          {compatMetrics.total === 0 && tab !== 'companies' && tab !== 'users' && tab !== 'vacancies' ? (
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
              {tab === 'overview' && <OverviewTab typeCount={typeCount} maxCount={maxCount} distributionTotal={listTotal} tensions={tensions} synergies={synergies} locale={locale} />}
              {tab === 'team' && (
                <>
                  <TeamTab
                    results={results}
                    sortKey={teamQuerySort.sort}
                    sortDir={teamQuerySort.dir}
                    onSort={pushTeamSort}
                    locale={locale}
                  />
                  {listTotal > 0 ? (
                    <div style={{ ...S.card, padding: '16px 22px', marginTop: '18px', display: 'flex',
                      flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
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
                              fontSize: '12px', cursor: pagination.page <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                          >
                            {t(locale, 'dashboard.previous')}
                          </button>
                          <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', minWidth: '100px', textAlign: 'center' }}>
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
                              fontSize: '12px',
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
                />
              )}
              {tab === 'vacancies' && canManage && <VacanciesAdminTab isAdmin={isAdmin} navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'companies' && isAdmin && <CompaniesAdminTab navigateDashboard={navigateWithOpts} locale={locale} />}
              {tab === 'users' && isAdmin && <UsersAdminTab navigateDashboard={navigateWithOpts} locale={locale} />}
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
  );
}
