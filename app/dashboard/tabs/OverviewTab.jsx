'use client';

import { useEffect, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { typeFullName, typeHintTooltip, typeShortLabel } from '../../../lib/type-en';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { C, PIPELINE_STAGE_COLORS } from '../../../lib/theme';
import { OVERVIEW_FUNNEL_STAGES } from '../../../lib/overview-constants';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';

const PEOPLE_OPS_OPEN_KEY = '30team_overview_people_ops_open';
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

function StatTile({ value, label, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'min-w-0 rounded-[14px] border border-ink/12 bg-white px-[18px] py-4 text-left',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
      style={color ? { borderColor: `${color}35` } : undefined}
    >
      <div
        className="font-ui text-[26px] font-semibold leading-tight text-ink"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </button>
  );
}

export function OverviewTab({
  overview = null,
  typeCount = {},
  distributionTotal = 0,
  locale = 'pt-BR',
  filters = {},
  navigateDashboard,
}) {
  const [peopleOpsOpen, setPeopleOpsOpen] = useState(false);
  const [noPlanExpanded, setNoPlanExpanded] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(PEOPLE_OPS_OPEN_KEY) === '1') {
        setPeopleOpsOpen(true);
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
  const funnelActive = OVERVIEW_FUNNEL_STAGES.filter((s) => (data.funnel[s] || 0) > 0);
  const funnelSum = Math.max(data.funnelTotal || 1, 1);
  const mixCount = data.typeMix?.typeCount || typeCount || {};
  const mixTotalRaw = Object.values(mixCount).reduce((a, b) => a + (Number(b) || 0), 0);
  const mixTotal = Math.max(data.typeMix?.total || 0, mixTotalRaw, 1);
  const mixEntries = Object.entries(mixCount)
    .map(([k, v]) => ({ type: parseInt(k, 10), n: Number(v) || 0 }))
    .filter((x) => x.n > 0 && x.type >= 1 && x.type <= 9)
    .sort((a, b) => b.n - a.n);
  const heatCells = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((type) => ({
    type,
    n: Number(mixCount[type] ?? mixCount[String(type)] ?? 0) || 0,
  }));
  const heatMax = Math.max(...heatCells.map((c) => c.n), 1);
  const dominant = data.typeMix?.dominantType || mixEntries[0]?.type || null;
  const advice = data.typeMix?.advice || null;
  const reasons = data.rejectionReasons || [];
  const maxReason = Math.max(...reasons.map((r) => r.n), 1);

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

  return (
    <div className="flex flex-col gap-4">
      {data.error ? (
        <p className="m-0 text-danger">{t(locale, 'panel.overview.loadError')}</p>
      ) : null}
      <div className={cn(S.card, 'p-5 sm:px-6')}>
        <span className={S.label}>
          {t(locale, 'dashboard.overview')}
        </span>
        <p className="mt-2.5 mb-0 max-w-[62ch] text-[13px] leading-relaxed text-ink-muted">
          {t(locale, 'panel.overview.intro')}
        </p>
        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-ink/12 bg-ink/[0.03] px-2.5 py-1 font-mono text-[11px] text-ink-muted"
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

      <div className={S.card}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={cn(S.label, 'mb-0')}>
            {t(locale, 'panel.overview.attentionTitle')}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {t(locale, 'panel.overview.attentionCount', { n: (data.attention || []).length })}
          </span>
        </div>
        {(data.attention || []).length === 0 ? (
          <p className="m-0 text-[13px] italic text-ink-muted">
            {t(locale, 'panel.overview.attentionEmpty')}
          </p>
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
                      'min-w-[52px] font-mono text-[10px] uppercase tracking-wide',
                      pr.label
                    )}
                  >
                    {t(locale, `panel.overview.priority.${item.priority}`)}
                  </span>
                  <span className="min-w-0 flex-[1_1_180px] text-[13px] text-ink">
                    {t(locale, item.titleKey)}
                  </span>
                  <span className="min-w-0 flex-[1_1_160px] text-xs text-ink-muted">{item.context}</span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    {t(locale, 'panel.overview.daysAgo', { n: item.days ?? 0 })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <span className={cn(S.label, 'mb-2.5')}>
          {t(locale, 'panel.overview.funnelTitle')}
        </span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {OVERVIEW_FUNNEL_STAGES.filter((s) => s !== 'archived' || (data.funnel.archived || 0) > 0).map((stage) => (
            <StatTile
              key={stage}
              value={data.funnel[stage] || 0}
              label={t(locale, FUNNEL_LABEL_KEYS[stage])}
              color={FUNNEL_COLORS[stage]}
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
            <p className="mt-2 mb-0 font-mono text-[11px] text-ink-faint">
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
            <button
              type="button"
              onClick={() => go({ tab: 'vacancies' })}
              className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-brand-500"
            >
              {t(locale, 'panel.overview.openVacancies')}
            </button>
          </div>
          <div className="mb-3.5 flex flex-wrap gap-4">
            <div>
              <div className="text-[22px] text-ink">{data.vacancies?.openCount ?? 0}</div>
              <div className="font-mono text-[11px] text-ink-muted">
                {t(locale, 'panel.overview.vacanciesOpen')}
              </div>
            </div>
            <div>
              <div className="text-[22px] text-warning">{data.vacancies?.positionsOpen ?? 0}</div>
              <div className="font-mono text-[11px] text-ink-muted">
                {t(locale, 'panel.overview.positionsLeft')}
              </div>
            </div>
            <div>
              <div className="text-[22px] text-danger">{data.vacancies?.staleCount ?? 0}</div>
              <div className="font-mono text-[11px] text-ink-muted">
                {t(locale, 'panel.overview.staleVacancies')}
              </div>
            </div>
          </div>
          {(data.vacancies?.items || []).length === 0 ? (
            <p className="m-0 text-[13px] italic text-ink-faint">
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
                    <span className="text-[13px] text-ink">{v.title}</span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {v.hired}/{v.positionsCount} · {t(locale, 'panel.overview.inFunnel', { n: v.inFunnel })}
                      {(v.approvedGaps || 0) > 0
                        ? ` · ${t(locale, 'panel.overview.hireGapsChip', { n: v.approvedGaps })}`
                        : ''}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'mt-1 font-mono text-[11px]',
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
              <div className="text-[22px] text-success">{data.hiredLast7d}</div>
              <div className="font-mono text-[11px] text-ink-muted">
                {t(locale, 'panel.overview.hired7d')}
              </div>
            </div>
            <div>
              <div className="text-[22px] text-danger">{data.rejectedLast7d}</div>
              <div className="font-mono text-[11px] text-ink-muted">
                {t(locale, 'panel.overview.rejected7d')}
              </div>
            </div>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
            {t(locale, 'panel.overview.topRejectReasons')}
          </span>
          {reasons.length === 0 ? (
            <p className="mt-2.5 mb-0 text-[13px] italic text-ink-faint">
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
        </div>
      </div>

      <div className={S.cardTight}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className={cn(S.label, 'mb-0')}>
            {t(locale, 'panel.overview.typeMixTitle')}
          </span>
          <button
            type="button"
            onClick={() => go({ tab: 'compatibility' })}
            className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-brand-500"
          >
            {t(locale, 'panel.overview.openCompat')}
          </button>
        </div>
        {mixTotalRaw === 0 ? (
          <p className="m-0 text-[13px] text-ink-faint">
            {t(locale, 'panel.overview.typeMixEmpty')}
          </p>
        ) : (
          <>
            <div
              className="mb-2 flex h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"
              role="img"
              aria-label={t(locale, 'panel.overview.typeHeatAria')}
            >
              {mixEntries.map((e) => (
                <div
                  key={e.type}
                  style={{
                    width: `${Math.max(2, (e.n / mixTotal) * 100)}%`,
                    background: TYPE_DATA[e.type]?.color || C.purple,
                  }}
                  title={`${typeHintTooltip(e.type, locale)} (${e.n})`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
              {heatCells.map((cell) => (
                <span
                  key={cell.type}
                  title={typeHintTooltip(cell.type, locale)}
                  className={cn(
                    'cursor-help tabular-nums',
                    cell.n > 0 ? 'text-ink' : 'text-ink-faint/70'
                  )}
                >
                  <span
                    style={
                      cell.n > 0
                        ? { color: TYPE_DATA[cell.type]?.color || undefined }
                        : undefined
                    }
                  >
                    T{cell.type}
                  </span>
                  <span className="text-ink-faint"> {cell.n}</span>
                </span>
              ))}
            </div>
            {dominant ? (
              <p className="mt-2 mb-0 text-[11px] leading-snug text-ink-muted">
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
              <p className="mt-1 mb-0 text-[11px] leading-snug text-ink-faint">{compositionLine}</p>
            ) : null}
            {data.typeMix?.windowDelta?.available ? (
              <p className="mt-1.5 mb-0 text-[11px] leading-snug text-ink-muted">
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
          </>
        )}
      </div>

      {data.peopleOps ? (() => {
        const pdi = data.peopleOps.pdi;
        const clima = data.peopleOps.climate;
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                type="button"
                className="flex min-h-touch min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 border-none bg-transparent p-0 text-left"
                onClick={togglePeopleOps}
                aria-expanded={peopleOpsOpen}
              >
                <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.overview.peopleOpsTitle')}</span>
                <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                  {peopleOpsOpen
                    ? t(locale, 'panel.overview.peopleOpsCollapse')
                    : t(locale, 'panel.overview.peopleOpsExpand')}
                </span>
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-brand-600"
                  onClick={() => go({ tab: 'team' })}
                >
                  {t(locale, 'panel.overview.openTeam')}
                </button>
                <button
                  type="button"
                  className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-brand-600"
                  onClick={() => go({ tab: 'climate' })}
                >
                  {t(locale, 'panel.overview.openClimate')}
                </button>
              </div>
            </div>
            <p className={cn(S.muted, 'm-0 mt-2 text-xs')}>{summary}</p>
            {!peopleOpsOpen ? (
              <p className={cn(S.faint, 'm-0 mt-1.5 text-[11px]')}>
                {t(locale, 'panel.overview.peopleOpsCollapsedHint')}
              </p>
            ) : null}

            {peopleOpsOpen ? (
              <div className="mt-3 border-t border-ink/10 pt-3">
                <p className={cn(S.muted, 'm-0 mb-3 text-xs')}>{t(locale, 'panel.overview.peopleOpsHint')}</p>
                {!hasPdi && !hasClima && !hasRet && !hasOnb ? (
                  <p className="m-0 text-[13px] italic text-ink-muted">
                    {t(locale, 'panel.overview.peopleOpsEmpty')}
                  </p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {hasRet ? (
                      <li className="rounded-xl border border-warning/25 bg-warning/[0.06] px-3 py-2.5 text-[13px] text-ink">
                        {t(locale, 'panel.overview.peopleOpsRetention', {
                          n: ret.count,
                          days: ret.lookbackDays || 14,
                          min: ret.minScore ?? 55,
                        })}
                      </li>
                    ) : null}
                    {hasOnb ? (
                      <li className="rounded-xl border border-info/20 bg-info/[0.05] px-3 py-2.5 text-[13px] text-ink">
                        <div className={cn(S.label, 'mb-1.5 text-[10px]')}>
                          {t(locale, 'panel.overview.peopleOpsOnboardingTitle')}
                        </div>
                        {(onb.overdueCount || 0) > 0 ? (
                          <div className="mb-1 font-mono text-[11px] text-warning">
                            {t(locale, 'panel.overview.peopleOpsOnboardingOverdue', {
                              n: onb.overdueCount,
                            })}
                          </div>
                        ) : null}
                        {(onb.dueSoonCount || 0) > 0 ? (
                          <div className="mb-1.5 font-mono text-[11px] text-ink-muted">
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
                                  <span className="block text-[12px] text-ink">{row.candidateName}</span>
                                  <span className="block font-mono text-[10px] text-ink-muted">
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
                      <li className="rounded-xl border border-ink/10 px-3 py-2.5 text-[13px] text-ink">
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
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${pdi.donePct || 0}%` }}
                            />
                          </div>
                        ) : null}
                        {hasPdiPlans ? (
                          <div className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className={cn(S.label, 'mb-0 text-[10px]')}>
                                {t(locale, 'panel.overview.peopleOpsPdiPlansTitle')}
                              </div>
                              {Number(pdi.activePlans) > plans.length ? (
                                <span className="font-mono text-[10px] text-ink-faint">
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
                                          <span className="block text-[12px] font-medium text-ink">
                                            {row.candidateName}
                                          </span>
                                          <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                                            {row.planTitle}
                                          </span>
                                        </div>
                                        <span className="shrink-0 font-mono text-[10px] text-ink-faint">
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
                                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/10">
                                        <div
                                          className={cn(
                                            'h-full rounded-full',
                                            flagged ? 'bg-warning' : 'bg-success'
                                          )}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      {row.periodStart || row.periodEnd ? (
                                        <span className="mt-1 block font-mono text-[10px] text-ink-faint">
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
                            <div className={cn(S.label, 'mb-0 text-[10px]')}>
                              {t(locale, 'panel.overview.peopleOpsPdiQueueTitle')}
                            </div>
                            {overdueN > 0 || overduePlansN > 0 || (queue.overdue || []).length > 0 ? (
                              <div>
                                <div className="mb-1 font-mono text-[11px] text-warning">
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
                                        <span className="block text-[12px] text-ink">
                                          {row.candidateName}
                                        </span>
                                        <span className="block font-mono text-[10px] text-ink-muted">
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
                                <div className="mb-1 font-mono text-[11px] text-ink-muted">
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
                                        <span className="block text-[12px] text-ink">
                                          {row.candidateName}
                                        </span>
                                        <span className="block font-mono text-[10px] text-ink-muted">
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
                                <div className="mb-1 font-mono text-[11px] text-ink-muted">
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
                                        <span className="block text-[12px] text-ink">
                                          {row.candidateName}
                                        </span>
                                        <span className="block font-mono text-[10px] text-ink-faint">
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
                            <p className={cn(S.faint, 'm-0 text-[10px]')}>
                              {t(locale, 'panel.overview.peopleOpsPdiQueueHint')}
                            </p>
                          </div>
                        ) : null}
                      </li>
                    ) : null}
                    {hasClima ? (
                      <li className="rounded-xl border border-ink/10 px-3 py-2.5 text-[13px] text-ink">
                        {clima.openSurveys > 0 || clima.draftSurveys > 0
                          ? t(locale, 'panel.overview.peopleOpsClimate', {
                              open: clima.openSurveys,
                              resp: clima.openResponses,
                              min: clima.minResponses,
                            })
                          : t(locale, 'panel.overview.peopleOpsClimateClosed')}
                        {clima.draftSurveys > 0 ? (
                          <span className="mt-1 block font-mono text-[11px] text-ink-muted">
                            {t(locale, 'panel.overview.peopleOpsClimateDraft', {
                              n: clima.draftSurveys,
                            })}
                          </span>
                        ) : null}
                        {clima.latestMean != null || clima.deltaVsPrevious != null ? (
                          <span className="mt-1 block font-mono text-[11px] text-ink-muted">
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
            ) : null}
          </div>
        );
      })() : null}
    </div>
  );
}
