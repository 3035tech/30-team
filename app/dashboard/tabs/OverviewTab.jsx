'use client';

import { useEffect, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { typeFullName, typeHintTooltip, typeShortLabel } from '../../../lib/type-en';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { C, PIPELINE_STAGE_COLORS } from '../../../lib/theme';
import { OVERVIEW_FUNNEL_STAGES } from '../../../lib/overview-constants';
import { cn } from '../../../lib/cn';
import { S, AdminIconButton } from '../dashboard-shared';
import { TeamBehavioralIntelBlock } from './TeamBehavioralIntelBlock';
import TurnoverRadarCard from './overview/TurnoverRadarCard';
import HrScoreCard from './overview/HrScoreCard';
import ExitInsightsCard from './overview/ExitInsightsCard';
import CultureInsightsCard from './overview/CultureInsightsCard';
import MultiSignalWorkbenchCard from './overview/MultiSignalWorkbenchCard';
import BirthdaysCard from './overview/BirthdaysCard';
import { OnboardingChecklist } from '../../_components/OnboardingChecklist';
import { TeamTensionNarrativeBlock } from '../../_components/TeamTensionNarrativeBlock';
import {
  DisclosureToggle,
  disclosureToggleButtonClass,
} from '../../_components/CollapsibleBlock';
import { ContentEnter } from '../../_components/AppLoading';
import { StatMetricTile } from '../../_components/StatMetricTile';
import { MeterBar } from '../../_components/MeterBar';
import { EmptyState } from '../../_components/EmptyState';

const PEOPLE_OPS_OPEN_KEY = '30team_overview_people_ops_open';
const RECRUITING_OPEN_KEY = '30team_overview_recruiting_open';
const OPS_INTEL_OPEN_KEY = '30team_overview_ops_intel_open';
const NO_PLAN_PREVIEW = 3;

const FUNNEL_LABEL_KEYS = {
  new: 'recruiting.pipelineNew',
  test_completed: 'recruiting.pipelineTestCompleted',
  screening: 'recruiting.pipelineScreening',
  interview: 'recruiting.pipelineInterview',
  approved: 'recruiting.pipelineApproved',
  hired: 'recruiting.pipelineHired',
  rejected: 'recruiting.pipelineRejected',
  archived: 'recruiting.pipelineArchived',
};

const FUNNEL_COLORS = { ...PIPELINE_STAGE_COLORS };

const PRIORITY_CLASS = {
  high: {
    card: 'border-danger/25 bg-danger/[0.08]',
    label: 'text-danger',
  },
  medium: {
    card: 'border-warning/25 bg-warning/[0.08]',
    label: 'text-warning',
  },
  low: {
    card: 'border-ink/12 bg-ink/[0.04]',
    label: 'text-ink-muted',
  },
};

function filterChips(locale, filters = {}) {
  const chips = [];
  if (filters.companyLabel) chips.push(filters.companyLabel);
  if (filters.area && filters.area !== 'all') chips.push(filters.areaLabel || filters.area);
  if (filters.vacancy && filters.vacancy !== 'all') chips.push(filters.vacancyLabel || filters.vacancy);
  if (filters.dateFrom || filters.dateTo) {
    chips.push(
      t(locale, 'panel.overview.dateRangeChip', {
        from: filters.dateFrom || '…',
        to: filters.dateTo || '…',
      })
    );
  }
  if (filters.search) chips.push(`"${filters.search}"`);
  return chips;
}

export function OverviewTab({
  overview = null,
  typeCount = {},
  distributionTotal = 0,
  locale = 'pt-BR',
  companyId = null,
  filters = {},
  navigateDashboard,
  onboardingProgress = null,
}) {
  const [peopleOpsOpen, setPeopleOpsOpen] = useState(false);
  const [recruitingOpen, setRecruitingOpen] = useState(false);
  const [opsIntelOpen, setOpsIntelOpen] = useState(false);
  const [noPlanExpanded, setNoPlanExpanded] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem(PEOPLE_OPS_OPEN_KEY) === '1') setPeopleOpsOpen(true);
        // Default collapsed so BCI wins the first viewport; '1' opens recruiting ops.
        if (localStorage.getItem(RECRUITING_OPEN_KEY) === '1') setRecruitingOpen(true);
        if (localStorage.getItem(OPS_INTEL_OPEN_KEY) === '1') setOpsIntelOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const togglePeopleOps = () => {
    setPeopleOpsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PEOPLE_OPS_OPEN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (!next) setNoPlanExpanded(false);
      return next;
    });
  };

  const toggleOpsIntel = () => {
    setOpsIntelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OPS_INTEL_OPEN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleRecruiting = () => {
    setRecruitingOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(RECRUITING_OPEN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const data = overview || {
    funnel: Object.fromEntries(OVERVIEW_FUNNEL_STAGES.map((s) => [s, 0])),
    funnelTotal: 0,
    hiredLast7d: 0,
    rejectedLast7d: 0,
    rejectionReasons: [],
    attention: [],
    vacancies: { openCount: 0, positionsOpen: 0, staleCount: 0, items: [] },
    typeMix: { typeCount, total: distributionTotal, dominantType: null },
  };

  const go = (opts) => {
    if (typeof navigateDashboard === 'function') navigateDashboard(opts);
  };

  const chips = filterChips(locale, filters);

  if (data.needsCompanyScope) {
    return (
      <div className={S.stack}>
        <div className={cn(S.card, 'p-5 sm:px-6')}>
          <span className={S.label}>{t(locale, 'panel.overview.needsCompanyScopeTitle')}</span>
          <p className="mt-2.5 mb-0 max-w-[62ch] text-prose leading-relaxed text-ink-muted">
            {t(locale, 'panel.overview.needsCompanyScopeBody')}
          </p>
        </div>
      </div>
    );
  }

  const funnelActive = OVERVIEW_FUNNEL_STAGES.filter((s) => (data.funnel[s] || 0) > 0);
  const funnelSum = Math.max(data.funnelTotal || 1, 1);
  const mixCount = data.typeMix?.typeCount || typeCount || {};
  const mixTotalRaw = Object.values(mixCount).reduce((a, b) => a + (Number(b) || 0), 0);
  const mixTotal = Math.max(data.typeMix?.total || 0, mixTotalRaw, 1);
  const mixEntries = Object.entries(mixCount)
    .map(([k, v]) => ({ type: parseInt(k, 10), n: Number(v) || 0 }))
    .filter((x) => x.n > 0 && x.type >= 1 && x.type <= 9)
    .sort((a, b) => a.type - b.type);
  const dominant =
    data.typeMix?.dominantType ||
    mixEntries.reduce((best, cur) => (!best || cur.n > best.n ? cur : best), null)?.type ||
    null;
  const advice = data.typeMix?.advice || null;
  const reasons = data.rejectionReasons || [];
  const maxReason = Math.max(...reasons.map((r) => r.n), 1);
  const rejectPatterns = data.rejectionPatterns || [];

  const compositionLine = (() => {
    if (!advice || advice.kind === 'empty' || mixTotalRaw === 0) return null;
    if (advice.kind === 'concentrated' && advice.dominantType) {
      return t(locale, 'panel.overview.compositionConcentrated', {
        type: typeFullName(advice.dominantType, locale),
        pct: advice.pct,
      });
    }
    if (advice.kind === 'gap' && advice.missingTypes?.length) {
      return t(locale, 'panel.overview.compositionGaps', {
        types: advice.missingTypes.map((x) => `T${x}`).join(', '),
      });
    }
    return t(locale, 'panel.overview.compositionBalanced');
  })();

  const rubricDeltaLine = (() => {
    const rd = data.typeMix?.rubricDelta;
    if (!rd || rd.kind === 'empty' || rd.kind === 'aligned') return null;
    if (rd.kind === 'scarce_sought' && rd.scarceTypes?.length) {
      return t(locale, 'panel.overview.rubricDeltaScarce', {
        types: rd.scarceTypes.map((x) => `T${x}`).join(', '),
      });
    }
    if (rd.kind === 'surplus_unweighted' && rd.surplusType) {
      return t(locale, 'panel.overview.rubricDeltaSurplus', {
        type: typeFullName(rd.surplusType, locale),
      });
    }
    return null;
  })();

  return (
    <div className="flex flex-col gap-4">
      {data.error ? (
        <p className="m-0 text-danger">{t(locale, 'panel.overview.loadError')}</p>
      ) : null}
      <div className={cn(S.card, 'p-5 sm:px-6')}>
        <span className={S.label}>
          {t(locale, 'dashboard.overview')}
        </span>
        <p className="mt-2.5 mb-0 max-w-[62ch] text-prose leading-relaxed text-ink-muted">
          {t(locale, 'panel.overview.intro')}
        </p>
        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-ink/12 bg-ink/[0.03] px-2.5 py-1 font-mono text-2xs text-ink-muted"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2.5 mb-0 font-mono text-xs text-ink-faint">
            {t(locale, 'panel.overview.noFilterChip')}
          </p>
        )}
      </div>

      {/* Onboarding Checklist */}
      {onboardingProgress && onboardingProgress.progress < 100 && (
        <OnboardingChecklist locale={locale} initialProgress={onboardingProgress} />
      )}

      <div className={S.card}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={cn(S.label, 'mb-0')}>
            {t(locale, 'panel.overview.attentionTitle')}
          </span>
          <span className="font-mono text-2xs text-ink-muted">
            {t(locale, 'panel.overview.attentionCount', { n: (data.attention || []).length })}
          </span>
        </div>
        {(data.attention || []).length === 0 ? (
          <ContentEnter animKey="overview-attention-empty">
            <EmptyState
              message={t(locale, 'panel.overview.attentionEmpty')}
              actionLabel={
                typeof navigateDashboard === 'function'
                  ? t(locale, 'panel.overview.attentionEmptyCtaVacancies')
                  : undefined
              }
              onAction={
                typeof navigateDashboard === 'function'
                  ? () => go({ tab: 'vacancies' })
                  : undefined
              }
              secondaryActionLabel={
                typeof navigateDashboard === 'function'
                  ? t(locale, 'panel.overview.attentionEmptyCtaTeam')
                  : undefined
              }
              onSecondaryAction={
                typeof navigateDashboard === 'function'
                  ? () => go({ tab: 'team' })
                  : undefined
              }
            />
          </ContentEnter>
        ) : (
          <div className="flex flex-col gap-2">
            {(data.attention || []).map((item) => {
              const pr = PRIORITY_CLASS[item.priority] || PRIORITY_CLASS.low;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.nav && go(item.nav)}
                  className={cn(
                    'flex flex-wrap items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left',
                    pr.card,
                    item.nav ? 'cursor-pointer' : 'cursor-default'
                  )}
                >
                  <span
                    className={cn(
                      'min-w-[52px] font-mono text-2xs uppercase tracking-wide',
                      pr.label
                    )}
                  >
                    {t(locale, `panel.overview.priority.${item.priority}`)}
                  </span>
                  <span className="min-w-0 flex-[1_1_180px] text-prose text-ink">
                    {t(locale, item.titleKey)}
                  </span>
                  <span className="min-w-0 flex-[1_1_160px] text-xs text-ink-muted">{item.context}</span>
                  {item.days != null ? (
                    <span className="font-mono text-2xs text-ink-faint">
                      {t(locale, 'panel.overview.daysAgo', { n: item.days })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TeamBehavioralIntelBlock
        locale={locale}
        intel={data.behavioralIntel}
        navigateDashboard={navigateDashboard}
      />

      {companyId ? (
        <TeamTensionNarrativeBlock
          locale={locale}
          intel={data.behavioralIntel}
          companyId={companyId}
          teamGroupId={data.behavioralIntel?.selectedTeamGroupId ?? data.behavioralIntel?.meta?.teamGroupId}
          navigateDashboard={navigateDashboard}
        />
      ) : null}

      {companyId ? (
        <BirthdaysCard
          locale={locale}
          companyId={companyId}
          navigateDashboard={navigateDashboard}
        />
      ) : null}

      {companyId ? (
        <div className={S.cardTight}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.overview.opsIntelTitle')}</span>
              <p className="mt-1.5 mb-0 text-prose leading-snug text-ink-muted">
                {t(locale, 'panel.overview.opsIntelBody')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOpsIntel}
              className={opsIntelOpen ? S.btnGhost : S.btnBrandSoft}
              aria-expanded={opsIntelOpen}
            >
              {opsIntelOpen ? (
                <DisclosureToggle locale={locale} open />
              ) : (
                t(locale, 'panel.overview.opsIntelExpand')
              )}
            </button>
          </div>
          {opsIntelOpen ? (
            <ContentEnter animKey="opsIntel">
            <div className="mt-3.5 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TurnoverRadarCard locale={locale} companyId={companyId} />
                <HrScoreCard locale={locale} companyId={companyId} />
              </div>
              <MultiSignalWorkbenchCard
                locale={locale}
                companyId={companyId}
                navigateDashboard={navigateDashboard}
              />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ExitInsightsCard locale={locale} companyId={companyId} />
                <CultureInsightsCard locale={locale} companyId={companyId} />
              </div>
            </div>
            </ContentEnter>
          ) : null}
        </div>
      ) : null}

      <div className={S.cardTight}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className={cn(S.label, 'mb-0')}>
            {t(locale, 'panel.overview.typeMixTitle')}
          </span>
          <AdminIconButton
            label={t(locale, 'panel.overview.openCompat')}
            icon="compatibility"
            onClick={() => go({ tab: 'compatibility' })}
          />
        </div>
        {mixTotalRaw === 0 ? (
          <div>
            <p className="m-0 text-prose text-ink-faint">
              {t(locale, 'panel.overview.typeMixEmpty')}
            </p>
            <button
              type="button"
              className={cn(S.btnBrandSoft, 'mt-3 min-h-touch')}
              onClick={() => go({ tab: 'vacancies' })}
            >
              {t(locale, 'panel.overview.typeMixEmptyCta')}
            </button>
          </div>
        ) : (
          <>
            <div role="img" aria-label={t(locale, 'panel.overview.typeHeatAria')}>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                {mixEntries.map((e) => (
                  <div
                    key={e.type}
                    className="ui-type-heat-seg"
                    style={{
                      width: `${(e.n / mixTotal) * 100}%`,
                      background: TYPE_DATA[e.type]?.color || C.purple,
                    }}
                    title={`${typeHintTooltip(e.type, locale)} (${e.n})`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex">
                {mixEntries.map((e) => (
                  <div
                    key={e.type}
                    className="flex min-w-0 flex-col items-center gap-0 overflow-hidden font-mono text-2xs leading-tight tabular-nums"
                    style={{ width: `${(e.n / mixTotal) * 100}%` }}
                    title={`${typeHintTooltip(e.type, locale)} (${e.n})`}
                  >
                    <span
                      className="ui-type-label cursor-help max-w-full truncate"
                      style={{ color: TYPE_DATA[e.type]?.color || undefined }}
                    >
                      T{e.type}
                    </span>
                    <span className="max-w-full truncate text-ink-faint">{e.n}</span>
                  </div>
                ))}
              </div>
            </div>
            {dominant ? (
              <p className="mt-2 mb-0 text-2xs leading-snug text-ink-muted">
                {t(locale, 'panel.overview.dominantHint', {
                  type: typeFullName(dominant, locale),
                  n: mixCount[dominant] || mixCount[String(dominant)] || 0,
                  pct: Math.round(
                    ((mixCount[dominant] || mixCount[String(dominant)] || 0) / mixTotal) * 100
                  ),
                })}
              </p>
            ) : null}
            {compositionLine ? (
              <p className="mt-1 mb-0 text-2xs leading-snug text-ink-faint">{compositionLine}</p>
            ) : null}
            {data.typeMix?.windowDelta?.available ? (
              <p className="mt-1.5 mb-0 text-2xs leading-snug text-ink-muted">
                {t(locale, 'panel.overview.typeMixWindowDelta', {
                  recent: typeFullName(data.typeMix.windowDelta.recentDominant, locale),
                  recentPct: data.typeMix.windowDelta.recentPct,
                  prior: typeFullName(data.typeMix.windowDelta.priorDominant, locale),
                  priorPct: data.typeMix.windowDelta.priorPct,
                  delta:
                    data.typeMix.windowDelta.pctDelta > 0
                      ? `+${data.typeMix.windowDelta.pctDelta}`
                      : String(data.typeMix.windowDelta.pctDelta),
                })}
              </p>
            ) : null}
            {rubricDeltaLine ? (
              <p className="mt-1.5 mb-0 text-2xs leading-snug text-ink-muted">{rubricDeltaLine}</p>
            ) : null}
          </>
        )}
      </div>

      <div className={S.card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className={cn(S.label, 'mb-0')}>
              {t(locale, 'panel.overview.recruitingTitle')}
            </span>
            <p className="mt-1 mb-0 text-xs text-ink-muted">
              {t(locale, 'panel.overview.recruitingHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleRecruiting}
            className={disclosureToggleButtonClass}
            aria-expanded={recruitingOpen}
          >
            <DisclosureToggle locale={locale} open={recruitingOpen} />
          </button>
        </div>
        {!recruitingOpen ? (
          <p className="m-0 font-mono text-2xs text-ink-faint">
            {t(locale, 'panel.overview.recruitingCollapsedHint', {
              n: data.funnelTotal || 0,
              open: data.vacancies?.openCount ?? 0,
            })}
          </p>
        ) : (
          <ContentEnter animKey="recruiting">
          <div className="flex flex-col gap-4">

      <div>
        <span className={cn(S.label, 'mb-2.5')}>
          {t(locale, 'panel.overview.funnelTitle')}
        </span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {OVERVIEW_FUNNEL_STAGES.filter((s) => s !== 'archived' || (data.funnel.archived || 0) > 0).map((stage) => (
            <StatMetricTile
              key={stage}
              value={data.funnel[stage] || 0}
              label={t(locale, FUNNEL_LABEL_KEYS[stage])}
              color={FUNNEL_COLORS[stage]}
              className="min-w-0 rounded-[14px] border-ink/12 bg-surface px-[18px] py-4"
              onClick={() => go({ tab: 'team', pipeline: stage })}
            />
          ))}
        </div>
        {funnelActive.length > 0 ? (
          <div className="mt-3">
            <div
              className="flex h-2.5 overflow-hidden rounded-full border border-ink/12 bg-ink/[0.04]"
              title={t(locale, 'panel.overview.funnelBarHint', { n: data.funnelTotal })}
            >
              {funnelActive.map((stage) => (
                <div
                  key={stage}
                  style={{
                    width: `${Math.max(2, ((data.funnel[stage] || 0) / funnelSum) * 100)}%`,
                    background: FUNNEL_COLORS[stage],
                  }}
                  title={`${t(locale, FUNNEL_LABEL_KEYS[stage])}: ${data.funnel[stage]}`}
                />
              ))}
            </div>
            <p className="mt-2 mb-0 font-mono text-2xs text-ink-faint">
              {t(locale, 'panel.overview.funnelBarHint', { n: data.funnelTotal })}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        <div className={S.card}>
          <div className="mb-3 flex items-center justify-between">
            <span className={cn(S.label, 'mb-0')}>
              {t(locale, 'panel.overview.vacanciesTitle')}
            </span>
            <AdminIconButton
              label={t(locale, 'panel.overview.openVacancies')}
              icon="vacancies"
              onClick={() => go({ tab: 'vacancies' })}
            />
          </div>
          <div className="mb-3.5 flex flex-wrap gap-4">
            <div>
              <div className="text-2xl text-ink">{data.vacancies?.openCount ?? 0}</div>
              <div className="font-mono text-2xs text-ink-muted">
                {t(locale, 'panel.overview.vacanciesOpen')}
              </div>
            </div>
            <div>
              <div className="text-2xl text-warning">{data.vacancies?.positionsOpen ?? 0}</div>
              <div className="font-mono text-2xs text-ink-muted">
                {t(locale, 'panel.overview.positionsLeft')}
              </div>
            </div>
            <div>
              <div className="text-2xl text-danger">{data.vacancies?.staleCount ?? 0}</div>
              <div className="font-mono text-2xs text-ink-muted">
                {t(locale, 'panel.overview.staleVacancies')}
              </div>
            </div>
          </div>
          {(data.vacancies?.items || []).length === 0 ? (
            <p className="m-0 text-prose italic text-ink-faint">
              {t(locale, 'panel.overview.vacanciesEmpty')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(data.vacancies.items || []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => go({ tab: 'vacancies', vacancyDetail: String(v.id) })}
                  className="cursor-pointer rounded-control border border-ink/12 bg-ink/[0.03] px-3 py-2.5 text-left"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-prose text-ink">{v.title}</span>
                    <span className="font-mono text-2xs text-ink-muted">
                      {v.hired}/{v.positionsCount} · {t(locale, 'panel.overview.inFunnel', { n: v.inFunnel })}
                      {(v.approvedGaps || 0) > 0
                        ? ` · ${t(locale, 'panel.overview.hireGapsChip', { n: v.approvedGaps })}`
                        : ''}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'mt-1 font-mono text-2xs',
                      v.stale ? 'text-danger' : 'text-ink-faint'
                    )}
                  >
                    {v.targetDate
                      ? t(locale, 'panel.overview.targetDate', { date: v.targetDate })
                      : t(locale, 'panel.overview.noTarget')}
                    {v.stale ? ` · ${t(locale, 'panel.overview.staleTag')}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={S.card}>
          <span className={S.label}>
            {t(locale, 'panel.overview.decisionsTitle')}
          </span>
          <div className="mb-4 flex flex-wrap gap-5">
            <div>
              <div className="text-2xl text-success">{data.hiredLast7d}</div>
              <div className="font-mono text-2xs text-ink-muted">
                {t(locale, 'panel.overview.hired7d')}
              </div>
            </div>
            <div>
              <div className="text-2xl text-danger">{data.rejectedLast7d}</div>
              <div className="font-mono text-2xs text-ink-muted">
                {t(locale, 'panel.overview.rejected7d')}
              </div>
            </div>
          </div>
          <span className="font-mono text-2xs uppercase tracking-wide text-ink-muted">
            {t(locale, 'panel.overview.topRejectReasons')}
          </span>
          {reasons.length === 0 ? (
            <p className="mt-2.5 mb-0 text-prose italic text-ink-faint">
              {t(locale, 'panel.overview.noRejectReasons')}
            </p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {reasons.map((r) => (
                <div key={r.reason} className="flex items-center gap-2.5">
                  <span className="w-[120px] shrink-0 text-xs text-ink-muted">
                    {rejectionReasonLabel(locale, r.reason)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div
                      className="h-full rounded-full bg-danger"
                      style={{
                        width: `${Math.round((r.n / maxReason) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-xs text-ink-faint">
                    {r.n}
                  </span>
                </div>
              ))}
            </div>
          )}
          {rejectPatterns.length > 0 ? (
            <div className="mt-3 border-t border-ink/10 pt-3">
              <span className="font-mono text-2xs uppercase tracking-wide text-ink-muted">
                {t(locale, 'panel.overview.rejectPatternsTitle')}
              </span>
              <ul className="mt-2 mb-0 flex list-none flex-col gap-1.5 p-0">
                {rejectPatterns.slice(0, 4).map((p) => (
                  <li
                    key={`${p.reason}-${p.topType}`}
                    className="text-xs leading-snug text-ink-muted"
                  >
                    {t(locale, 'panel.overview.rejectPatternRow', {
                      reason: rejectionReasonLabel(locale, p.reason),
                      type: `T${p.topType}`,
                      n: p.n,
                    })}
                  </li>
                ))}
              </ul>
              <p className="mb-0 mt-1.5 text-2xs leading-snug text-ink-faint">
                {t(locale, 'panel.overview.rejectPatternsHint')}
              </p>
            </div>
          ) : null}
        </div>
      </div>

          </div>
          </ContentEnter>
        )}
      </div>

      {data.peopleOps ? (() => {
        const pdi = data.peopleOps.pdi;
        const clima = data.peopleOps.climate;
        const enps = data.peopleOps.enps;
        const ret = data.peopleOps.retention;
        const onb = data.peopleOps.onboarding;
        const queue = pdi?.queue || {};
        const plans = pdi?.plans || [];
        const overdueN = Number(pdi?.overdueItemCount) || 0;
        const overduePlansN = Number(pdi?.overduePlanCount) || 0;
        const noPlanN = Number(pdi?.noPlanEmployeeCount) || 0;
        const unlinkedN = Number(pdi?.itemsWithoutOneOnOne) || 0;
        const noPlanRows = queue.noPlan || [];
        const noPlanShown = noPlanExpanded ? noPlanRows : noPlanRows.slice(0, NO_PLAN_PREVIEW);
        const hasPdiQueue =
          overdueN > 0 ||
          overduePlansN > 0 ||
          noPlanN > 0 ||
          unlinkedN > 0 ||
          (queue.overdue || []).length > 0 ||
          (queue.unlinked || []).length > 0 ||
          noPlanRows.length > 0;
        const hasPdiPlans = plans.length > 0;
        const hasPdi =
          pdi &&
          (pdi.activePlans > 0 || pdi.activeItems > 0 || hasPdiQueue || hasPdiPlans);
        const hasOnb =
          onb &&
          ((onb.overdueCount || 0) > 0 ||
            (onb.dueSoonCount || 0) > 0 ||
            (onb.overdue || []).length > 0 ||
            (onb.dueSoon || []).length > 0);
        const hasClima =
          clima &&
          (clima.openSurveys > 0 ||
            clima.draftSurveys > 0 ||
            clima.deltaVsPrevious != null ||
            clima.latestMean != null);
        const hasEnps =
          enps &&
          !enps.suppressed &&
          enps.score != null &&
          Number.isFinite(Number(enps.score));
        const hasRet = ret && ret.count > 0;
        const signalN =
          overdueN +
          overduePlansN +
          unlinkedN +
          noPlanN +
          (Number(onb?.overdueCount) || 0) +
          (Number(ret?.count) || 0);
        const summary = t(locale, 'panel.overview.peopleOpsSummary', {
          signals: signalN,
          plans: pdi?.activePlans || 0,
          climate: clima?.openSurveys || 0,
        });

        return (
          <div className={S.cardTight}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.overview.peopleOpsTitle')}</span>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <AdminIconButton
                  label={t(locale, 'panel.overview.openTeam')}
                  icon="team"
                  onClick={() => go({ tab: 'team' })}
                />
                <AdminIconButton
                  label={t(locale, 'panel.overview.openClimate')}
                  icon="climate"
                  onClick={() => go({ tab: 'climate' })}
                />
                <button
                  type="button"
                  onClick={togglePeopleOps}
                  className={disclosureToggleButtonClass}
                  aria-expanded={peopleOpsOpen}
                >
                  <DisclosureToggle locale={locale} open={peopleOpsOpen} />
                </button>
              </div>
            </div>
            <p className={cn(S.muted, 'm-0 mt-2 text-xs')}>{summary}</p>
            {!peopleOpsOpen ? (
              <p className={cn(S.faint, 'm-0 mt-1.5 text-2xs')}>
                {t(locale, 'panel.overview.peopleOpsCollapsedHint')}
              </p>
            ) : null}

            {peopleOpsOpen ? (
              <ContentEnter animKey="peopleOps">
              <div className="mt-3 border-t border-ink/10 pt-3">
                <p className={cn(S.muted, 'm-0 mb-3 text-xs')}>{t(locale, 'panel.overview.peopleOpsHint')}</p>
                {!hasPdi && !hasClima && !hasRet && !hasOnb && !hasEnps ? (
                  <p className="m-0 text-prose italic text-ink-muted">
                    {t(locale, 'panel.overview.peopleOpsEmpty')}
                  </p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {hasRet ? (
                      <li className="rounded-xl border border-warning/25 bg-warning/[0.06] px-3 py-2.5 text-prose text-ink">
                        {t(locale, 'panel.overview.peopleOpsRetention', {
                          n: ret.count,
                          days: ret.lookbackDays || 14,
                          min: ret.minScore ?? 55,
                        })}
                      </li>
                    ) : null}
                    {hasOnb ? (
                      <li className="rounded-xl border border-info/20 bg-info/[0.05] px-3 py-2.5 text-prose text-ink">
                        <div className={cn(S.label, 'mb-1.5 text-2xs')}>
                          {t(locale, 'panel.overview.peopleOpsOnboardingTitle')}
                        </div>
                        {(onb.overdueCount || 0) > 0 ? (
                          <div className="mb-1 font-mono text-2xs text-warning">
                            {t(locale, 'panel.overview.peopleOpsOnboardingOverdue', {
                              n: onb.overdueCount,
                            })}
                          </div>
                        ) : null}
                        {(onb.dueSoonCount || 0) > 0 ? (
                          <div className="mb-1.5 font-mono text-2xs text-ink-muted">
                            {t(locale, 'panel.overview.peopleOpsOnboardingSoon', {
                              n: onb.dueSoonCount,
                            })}
                          </div>
                        ) : null}
                        <ul className="m-0 flex list-none flex-col gap-1 p-0">
                          {[...(onb.overdue || []), ...(onb.dueSoon || [])]
                            .slice(0, 8)
                            .map((row) => (
                              <li key={`onb-${row.checkinId}`}>
                                <button
                                  type="button"
                                  className="w-full cursor-pointer rounded-control border border-transparent px-2 py-1.5 text-left hover:border-ink/12 hover:bg-ink/[0.03]"
                                  onClick={() => go(row.nav)}
                                >
                                  <span className="block text-xs text-ink">{row.candidateName}</span>
                                  <span className="block font-mono text-2xs text-ink-muted">
                                    {t(locale, 'panel.overview.peopleOpsOnboardingRow', {
                                      days: row.milestoneDays,
                                      date: row.dueDate || '—',
                                    })}
                                  </span>
                                </button>
                              </li>
                            ))}
                        </ul>
                      </li>
                    ) : null}
                    {hasPdi ? (
                      <li className="rounded-xl border border-ink/10 px-3 py-2.5 text-prose text-ink">
                        {pdi.donePct != null
                          ? t(locale, 'panel.overview.peopleOpsPdi', {
                              plans: pdi.activePlans,
                              pct: pdi.donePct,
                              people: pdi.peopleWithActive,
                            })
                          : t(locale, 'panel.overview.peopleOpsPdiNoPct', {
                              plans: pdi.activePlans,
                              people: pdi.peopleWithActive,
                            })}
                        {pdi.activeItems > 0 ? (
                          <MeterBar
                            percent={pdi.donePct || 0}
                            height={6}
                            className="mt-2 rounded-full"
                            trackClassName="bg-ink/10"
                            toneClass="rounded-full bg-success"
                          />
                        ) : null}
                        {hasPdiPlans ? (
                          <div className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className={cn(S.label, 'mb-0 text-2xs')}>
                                {t(locale, 'panel.overview.peopleOpsPdiPlansTitle')}
                              </div>
                              {Number(pdi.activePlans) > plans.length ? (
                                <span className="font-mono text-2xs text-ink-faint">
                                  {t(locale, 'panel.overview.peopleOpsPdiPlansMore', {
                                    shown: plans.length,
                                    total: pdi.activePlans,
                                  })}
                                </span>
                              ) : null}
                            </div>
                            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                              {plans.map((row) => {
                                const pct = row.donePct != null ? row.donePct : 0;
                                const flagged = row.periodOverdue || (row.overdueItemCount || 0) > 0;
                                return (
                                  <li key={`plan-${row.planId}`}>
                                    <button
                                      type="button"
                                      className={cn(
                                        'w-full cursor-pointer rounded-control border px-2.5 py-2 text-left',
                                        flagged
                                          ? 'border-warning/25 bg-warning/[0.04]'
                                          : 'border-ink/10 bg-ink/[0.02] hover:border-ink/16'
                                      )}
                                      onClick={() => go(row.nav)}
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <span className="block text-xs font-medium text-ink">
                                            {row.candidateName}
                                          </span>
                                          <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                                            {row.planTitle}
                                          </span>
                                        </div>
                                        <span className="shrink-0 font-mono text-2xs text-ink-faint">
                                          {t(locale, 'panel.overview.peopleOpsPdiPlanProgress', {
                                            done: row.doneCount,
                                            total: row.itemCount,
                                          })}
                                          {flagged ? (
                                            <span className="ml-1 text-warning">
                                              {t(locale, 'panel.overview.peopleOpsPdiPlanFlag')}
                                            </span>
                                          ) : null}
                                        </span>
                                      </div>
                                      <MeterBar
                                        percent={pct}
                                        height={4}
                                        className="mt-1.5 rounded-full"
                                        trackClassName="bg-ink/10"
                                        toneClass={cn(
                                          'rounded-full',
                                          flagged ? 'bg-warning' : 'bg-success'
                                        )}
                                      />
                                      {row.periodStart || row.periodEnd ? (
                                        <span className="mt-1 block font-mono text-2xs text-ink-faint">
                                          {[row.periodStart, row.periodEnd].filter(Boolean).join(' → ')}
                                        </span>
                                      ) : null}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                        {hasPdiQueue ? (
                          <div className="mt-3 flex flex-col gap-2.5 border-t border-ink/10 pt-2.5">
                            <div className={cn(S.label, 'mb-0 text-2xs')}>
                              {t(locale, 'panel.overview.peopleOpsPdiQueueTitle')}
                            </div>
                            {overdueN > 0 || overduePlansN > 0 || (queue.overdue || []).length > 0 ? (
                              <div>
                                <div className="mb-1 font-mono text-2xs text-warning">
                                  {overdueN > 0 || (queue.overdue || []).length > 0
                                    ? t(locale, 'panel.overview.peopleOpsPdiOverdue', {
                                        n: overdueN || (queue.overdue || []).length,
                                      })
                                    : null}
                                  {overduePlansN > 0 ? (
                                    <span
                                      className={
                                        overdueN > 0 || (queue.overdue || []).length > 0
                                          ? 'ml-1 text-ink-muted'
                                          : ''
                                      }
                                    >
                                      {overdueN > 0 || (queue.overdue || []).length > 0 ? ' · ' : null}
                                      {t(locale, 'panel.overview.peopleOpsPdiOverduePlans', {
                                        n: overduePlansN,
                                      })}
                                    </span>
                                  ) : null}
                                </div>
                                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                                  {(queue.overdue || []).map((row) => (
                                    <li key={`ov-${row.itemId}`}>
                                      <button
                                        type="button"
                                        className="w-full cursor-pointer rounded-control border border-transparent px-2 py-1.5 text-left hover:border-ink/12 hover:bg-ink/[0.03]"
                                        onClick={() => go(row.nav)}
                                      >
                                        <span className="block text-xs text-ink">
                                          {row.candidateName}
                                        </span>
                                        <span className="block font-mono text-2xs text-ink-muted">
                                          {row.itemTitle}
                                          {row.dueDate ? ` · ${row.dueDate}` : ''}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {unlinkedN > 0 || (queue.unlinked || []).length > 0 ? (
                              <div>
                                <div className="mb-1 font-mono text-2xs text-ink-muted">
                                  {t(locale, 'panel.overview.peopleOpsPdiUnlinked', {
                                    n: unlinkedN || (queue.unlinked || []).length,
                                  })}
                                </div>
                                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                                  {(queue.unlinked || []).map((row) => (
                                    <li key={`ul-${row.itemId}`}>
                                      <button
                                        type="button"
                                        className="w-full cursor-pointer rounded-control border border-transparent px-2 py-1.5 text-left hover:border-ink/12 hover:bg-ink/[0.03]"
                                        onClick={() => go(row.nav)}
                                      >
                                        <span className="block text-xs text-ink">
                                          {row.candidateName}
                                        </span>
                                        <span className="block font-mono text-2xs text-ink-muted">
                                          {row.itemTitle}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {noPlanN > 0 || noPlanRows.length > 0 ? (
                              <div>
                                <div className="mb-1 font-mono text-2xs text-ink-muted">
                                  {t(locale, 'panel.overview.peopleOpsPdiNoPlan', {
                                    n: noPlanN || noPlanRows.length,
                                  })}
                                </div>
                                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                                  {noPlanShown.map((row) => (
                                    <li key={`np-${row.candidateId}`}>
                                      <button
                                        type="button"
                                        className="w-full cursor-pointer rounded-control border border-transparent px-2 py-1.5 text-left hover:border-ink/12 hover:bg-ink/[0.03]"
                                        onClick={() => go(row.nav)}
                                      >
                                        <span className="block text-xs text-ink">
                                          {row.candidateName}
                                        </span>
                                        <span className="block font-mono text-2xs text-ink-faint">
                                          {t(locale, 'panel.overview.peopleOpsPdiNoPlanCta')}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                                {noPlanRows.length > NO_PLAN_PREVIEW ? (
                                  <button
                                    type="button"
                                    className={cn(S.btnGhost, 'mt-1.5 min-h-touch')}
                                    onClick={() => setNoPlanExpanded((v) => !v)}
                                  >
                                    {noPlanExpanded
                                      ? t(locale, 'panel.overview.peopleOpsShowLess')
                                      : t(locale, 'panel.overview.peopleOpsShowMore', {
                                          n: noPlanRows.length - NO_PLAN_PREVIEW,
                                        })}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                            <p className={cn(S.faint, 'm-0 text-2xs')}>
                              {t(locale, 'panel.overview.peopleOpsPdiQueueHint')}
                            </p>
                          </div>
                        ) : null}
                      </li>
                    ) : null}
                    {hasEnps ? (
                      <li>
                        <button
                          type="button"
                          className="w-full cursor-pointer rounded-xl border border-ink/10 bg-transparent px-3 py-2.5 text-left text-prose text-ink hover:border-ink/20 hover:bg-ink/[0.03]"
                          onClick={() => go({ tab: 'climate' })}
                          aria-label={t(locale, 'panel.overview.openClimate')}
                        >
                          {t(locale, 'panel.overview.enpsPulse', {
                            score: enps.score,
                            n: enps.responseCount,
                          })}
                          <span className="mt-1 block font-mono text-2xs text-ink-muted">
                            {t(locale, 'panel.overview.enpsHint')}
                          </span>
                          <span className="mt-1.5 block font-mono text-2xs text-brand-600">
                            {t(locale, 'panel.overview.enpsOpenClimate')}
                          </span>
                        </button>
                      </li>
                    ) : null}
                    {hasClima ? (
                      <li className="rounded-xl border border-ink/10 px-3 py-2.5 text-prose text-ink">
                        {clima.openSurveys > 0 || clima.draftSurveys > 0
                          ? t(locale, 'panel.overview.peopleOpsClimate', {
                              open: clima.openSurveys,
                              resp: clima.openResponses,
                              min: clima.minResponses,
                            })
                          : t(locale, 'panel.overview.peopleOpsClimateClosed')}
                        {clima.draftSurveys > 0 ? (
                          <span className="mt-1 block font-mono text-2xs text-ink-muted">
                            {t(locale, 'panel.overview.peopleOpsClimateDraft', {
                              n: clima.draftSurveys,
                            })}
                          </span>
                        ) : null}
                        {clima.latestMean != null || clima.deltaVsPrevious != null ? (
                          <span className="mt-1 block font-mono text-2xs text-ink-muted">
                            {t(locale, 'panel.overview.peopleOpsClimateDelta', {
                              mean:
                                clima.latestMean != null
                                  ? String(clima.latestMean)
                                  : '—',
                              delta:
                                clima.deltaVsPrevious == null
                                  ? '—'
                                  : clima.deltaVsPrevious > 0
                                    ? `+${clima.deltaVsPrevious}`
                                    : String(clima.deltaVsPrevious),
                            })}
                          </span>
                        ) : null}
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
              </ContentEnter>
            ) : null}
          </div>
        );
      })() : null}
    </div>
  );
}
