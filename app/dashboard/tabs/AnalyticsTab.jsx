'use client';

/**
 * B-1101 — Analytics: aba de métricas de efetividade
 */

import { useState, useEffect } from 'react';
import { t } from '../../../lib/i18n.js';
import { useLocale } from '../../../lib/useLocale.js';
import { PanelSubNav, S } from '../dashboard-shared.jsx';
import { DateField } from '../../_components/DateField.jsx';
import { FormField, formFieldRowClass } from '../../_components/FormField';
import { useAppFeedback } from '../../_components/AppFeedback.jsx';
import { AppLoading, ContentEnter } from '../../_components/AppLoading.jsx';
import { EmptyState } from '../../_components/EmptyState';
import { cn } from '../../../lib/cn.js';
import { StatMetricTile } from '../../_components/StatMetricTile';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import { Icon } from '../../_components/Icon';

const TREND_TONE = {
  brand: { bar: 'bg-brand-500', value: 'text-brand-600' },
  danger: { bar: 'bg-danger', value: 'text-danger' },
  success: { bar: 'bg-success', value: 'text-success' },
};

function isMetricsEmpty(metrics) {
  if (!metrics) return true;
  const hireCount = metrics.timeToHire?.count || 0;
  const prodCount = metrics.timeToProductivity?.count || 0;
  const ret6 = metrics.retention?.sixMonths?.hiredCount || 0;
  const ret12 = metrics.retention?.twelveMonths?.hiredCount || 0;
  const fitHired = metrics.fitComparison?.hiredCount || 0;
  const rubricCount = metrics.rubricAdherence?.count || 0;
  return hireCount + prodCount + ret6 + ret12 + fitHired + rubricCount === 0;
}

function isTrendsEmpty(trends) {
  if (!trends) return true;
  return ['hrScore', 'turnoverRisk', 'climate', 'hiresVsExits'].every(
    (key) => !Array.isArray(trends[key]) || trends[key].every((item) =>
      Object.entries(item).every(([field, value]) => field === 'month' || Number(value || 0) === 0)
    )
  );
}

export function AnalyticsTab({ companyId, locale: initialLocale = 'pt-BR', navigateDashboard }) {
  const [locale] = useLocale(initialLocale);
  const { toast } = useAppFeedback();
  const [activeView, setActiveView] = useState('metrics'); // 'metrics' | 'trends' | 'compare'
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vacancyId: '',
  });
  const [trendMonths, setTrendMonths] = useState(12);
  const [compareType, setCompareType] = useState('areas'); // 'areas' | 'periods' | 'rubrics'
  const [compareParams, setCompareParams] = useState({
    areaA: '',
    areaB: '',
  });
  const [reportPrefs, setReportPrefs] = useState({
    frequency: 'weekly',
    attachPdf: false,
  });
  const [prefsBusy, setPrefsBusy] = useState(false);

  useEffect(() => {
    if (activeView === 'metrics') {
      loadMetrics();
    } else if (activeView === 'trends') {
      loadTrends();
    }
    // Compare loads on-demand via button
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload when filters change
  }, [activeView, filters.startDate, filters.endDate, trendMonths, companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!companyId) return;
        const params = new URLSearchParams({ companyId: String(companyId) });
        const res = await fetch(`/api/admin/analytics/report-prefs?${params}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.prefs) {
          setReportPrefs({
            frequency: data.prefs.frequency || 'weekly',
            attachPdf: data.prefs.attachPdf === true,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (activeView !== 'compare' || !companyId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ type: 'list-areas', companyId: String(companyId) });
        const res = await fetch(`/api/admin/analytics/compare?${params}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setAreaOptions(Array.isArray(data.areas) ? data.areas : []);
      } catch {
        if (!cancelled) setAreaOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeView, companyId]);

  async function saveReportPrefs() {
    setPrefsBusy(true);
    try {
      const res = await fetch('/api/admin/analytics/report-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: Number(companyId),
          frequency: reportPrefs.frequency,
          attachPdf: reportPrefs.attachPdf,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsSaved'), 'ok');
    } catch {
      toast(t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsError'), 'error');
    } finally {
      setPrefsBusy(false);
    }
  }

  async function loadMetrics() {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('companyId', String(companyId));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.vacancyId) params.append('vacancyId', filters.vacancyId);

      const res = await fetch(`/api/admin/analytics/metrics?${params}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load metrics');
      }

      setMetrics(data.metrics);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError(t(locale, 'panel.analytics.loadErrorBody'));
    } finally {
      setLoading(false);
    }
  }

  async function loadTrends() {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('companyId', String(companyId));
      params.append('months', trendMonths);

      const res = await fetch(`/api/admin/analytics/trends?${params}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load trends');
      }

      setTrends(data.trends);
    } catch (err) {
      console.error('Error loading trends:', err);
      setError(t(locale, 'panel.analytics.loadErrorBody'));
    } finally {
      setLoading(false);
    }
  }

  async function loadComparison() {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('companyId', String(companyId));
      params.append('type', compareType);

      if (compareType === 'areas') {
        if (!compareParams.areaA || !compareParams.areaB) {
          throw new Error(t(locale, 'panel.analytics.comparePickBoth'));
        }
        params.append('areaA', compareParams.areaA);
        params.append('areaB', compareParams.areaB);
      }
      // Add other types as needed

      const res = await fetch(`/api/admin/analytics/compare?${params}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load comparison');
      }

      setComparison(data.comparison);
    } catch (err) {
      console.error('Error loading comparison:', err);
      setError(err.message === t(locale, 'panel.analytics.comparePickBoth')
        ? err.message
        : t(locale, 'panel.analytics.loadErrorBody'));
    } finally {
      setLoading(false);
    }
  }

  if (!companyId) {
    return (
      <EmptyState
        title={t(locale, 'panel.analytics.companyRequiredTitle')}
        message={t(locale, 'panel.analytics.companyRequiredBody')}
      />
    );
  }

  if (loading) {
    return <AppLoading locale={locale} variant="panel" />;
  }

  if (error) {
    return (
      <EmptyState
        title={t(locale, 'panel.analytics.loadErrorTitle')}
        message={error}
        actionLabel={t(locale, 'panel.common.retry')}
        onAction={activeView === 'trends' ? loadTrends : activeView === 'compare' ? loadComparison : loadMetrics}
      />
    );
  }

  const viewTitle =
    activeView === 'metrics'
      ? t(locale, 'panel.analytics.titleMetrics')
      : activeView === 'trends'
        ? t(locale, 'panel.analytics.titleTrends')
        : t(locale, 'panel.analytics.titleCompare');
  const viewDescription = t(locale, `panel.analytics.${activeView}Description`);

  const metricsEmpty = activeView === 'metrics' && isMetricsEmpty(metrics);
  const trendsEmpty = activeView === 'trends' && isTrendsEmpty(trends);
  const canNav = typeof navigateDashboard === 'function';
  const exportParams = new URLSearchParams({
    companyId: String(companyId),
    format: activeView === 'metrics' ? 'csv' : 'json',
    type: activeView === 'trends' ? 'trends' : 'metrics',
  });
  if (filters.startDate) exportParams.set('startDate', filters.startDate);
  if (filters.endDate) exportParams.set('endDate', filters.endDate);
  if (activeView === 'trends') exportParams.set('months', String(trendMonths));

  return (
    <ContentEnter animKey={activeView}>
    <div className="space-y-6">
      <div className={cn(S.card, 'overflow-hidden p-0')}>
        <div className="border-b border-ink/10 px-5 pb-0 pt-6 sm:px-7 sm:pt-7">
          <p className="m-0 max-w-3xl font-ui text-sm leading-6 text-ink-muted">{t(locale, 'panel.analytics.intro')}</p>
          <PanelSubNav
            ariaLabel={t(locale, 'panel.analytics.viewsAria')}
            active={activeView}
            onChange={(nextView) => {
              setActiveView(nextView);
              setError(null);
            }}
            tabs={[
              { id: 'metrics', label: t(locale, 'panel.analytics.viewMetrics') },
              { id: 'trends', label: t(locale, 'panel.analytics.viewTrends') },
              { id: 'compare', label: t(locale, 'panel.analytics.viewCompare') },
            ]}
          />
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="m-0 font-display text-2xl font-normal text-ink">{viewTitle}</h2>
            <p className="mb-0 mt-1.5 font-ui text-sm leading-6 text-ink-muted">{viewDescription}</p>
          </div>
          {activeView !== 'compare' ? (
            <a className={cn(S.btnGhost, 'shrink-0')} href={`/api/admin/analytics/export?${exportParams}`} download>
              <Icon name="download" className="h-4 w-4" />
              {t(locale, 'panel.analytics.export')}
            </a>
          ) : null}
        </div>

        {/* Filtros */}
        {activeView === 'metrics' && (
        <div className={cn(formFieldRowClass, 'mb-6 gap-4 rounded-control border border-ink/10 bg-ink/[0.025] p-4')}>
          <FormField
            as="div"
            label={t(locale, 'panel.analytics.startDate')}
          >
            <DateField
              className={S.input}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              aria-label={t(locale, 'panel.analytics.startDate')}
            />
          </FormField>
          <FormField
            as="div"
            label={t(locale, 'panel.analytics.endDate')}
          >
            <DateField
              className={S.input}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              aria-label={t(locale, 'panel.analytics.endDate')}
            />
          </FormField>
        </div>
        )}

        {activeView === 'trends' && (
        <div className={cn(formFieldRowClass, 'mb-6 gap-4 rounded-control border border-ink/10 bg-ink/[0.025] p-4')}>
          <FormField label={t(locale, 'panel.analytics.periodMonths')}>
            <select
              className={S.select}
              value={trendMonths}
              onChange={(e) => setTrendMonths(parseInt(e.target.value, 10))}
            >
              <option value="6">{t(locale, 'panel.analytics.months6')}</option>
              <option value="12">{t(locale, 'panel.analytics.months12')}</option>
              <option value="24">{t(locale, 'panel.analytics.months24')}</option>
            </select>
          </FormField>
        </div>
        )}

        {activeView === 'compare' && (
          <div className="space-y-5">
            {areaOptions.length < 2 ? (
              <EmptyState
                title={t(locale, 'panel.analytics.compareEmptyTitle')}
                message={t(locale, 'panel.analytics.compareEmptyBody')}
              />
            ) : (
              <>
                <div className={cn(formFieldRowClass, 'gap-4 rounded-control border border-ink/10 bg-ink/[0.025] p-4')}>
                  <FormField label={t(locale, 'panel.analytics.compareAreaA')}>
                    <select className={S.select} value={compareParams.areaA} onChange={(event) => { setComparison(null); setCompareParams((current) => ({ ...current, areaA: event.target.value })); }}>
                      <option value="">{t(locale, 'panel.analytics.compareSelectArea')}</option>
                      {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </FormField>
                  <FormField label={t(locale, 'panel.analytics.compareAreaB')}>
                    <select className={S.select} value={compareParams.areaB} onChange={(event) => { setComparison(null); setCompareParams((current) => ({ ...current, areaB: event.target.value })); }}>
                      <option value="">{t(locale, 'panel.analytics.compareSelectArea')}</option>
                      {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </FormField>
                  <button type="button" className={cn(S.btnPrimary, 'self-end')} disabled={!compareParams.areaA || !compareParams.areaB || compareParams.areaA === compareParams.areaB} onClick={loadComparison}>
                    {t(locale, 'panel.analytics.compareAction')}
                  </button>
                </div>
                {comparison ? <AreaComparison comparison={comparison} locale={locale} /> : null}
              </>
            )}
          </div>
        )}

        {/* Cards de métricas */}
        {activeView === 'metrics' && metrics && metricsEmpty ? (
          <div className="space-y-3">
            <EmptyState
              title={t(locale, 'panel.analytics.emptyTitle')}
              message={t(locale, 'panel.analytics.emptyBody')}
              actionLabel={canNav ? t(locale, 'panel.analytics.emptyCtaVacancies') : undefined}
              onAction={canNav ? () => navigateDashboard({ tab: 'vacancies' }) : undefined}
            />
            {canNav ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  className={S.btnGhost}
                  onClick={() => navigateDashboard({ tab: 'team' })}
                >
                  {t(locale, 'panel.analytics.emptyCtaTeam')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeView === 'metrics' && metrics && !metricsEmpty ? (
        <div className="grid gap-px overflow-hidden rounded-card border border-ink/12 bg-ink/10 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title={t(locale, 'panel.analytics.timeToHire')}
            value={t(locale, 'panel.analytics.daysValue', { n: metrics.timeToHire.avgDays })}
            subtitle={t(locale, 'panel.analytics.hiresCount', { n: metrics.timeToHire.count })}
            trend={metrics.timeToHire.trend}
            locale={locale}
          />

          <MetricCard
            title={t(locale, 'panel.analytics.timeToProductivity')}
            value={t(locale, 'panel.analytics.daysValue', { n: metrics.timeToProductivity.avgDays })}
            subtitle={t(locale, 'panel.analytics.recordsCount', { n: metrics.timeToProductivity.count })}
            locale={locale}
          />

          <MetricCard
            title={t(locale, 'panel.analytics.retention6m')}
            value={`${metrics.retention.sixMonths.rate}%`}
            subtitle={`${metrics.retention.sixMonths.retainedCount}/${metrics.retention.sixMonths.hiredCount}`}
            locale={locale}
          />

          <MetricCard
            title={t(locale, 'panel.analytics.retention12m')}
            value={`${metrics.retention.twelveMonths.rate}%`}
            subtitle={`${metrics.retention.twelveMonths.retainedCount}/${metrics.retention.twelveMonths.hiredCount}`}
            locale={locale}
          />

          <MetricCard
            title={t(locale, 'panel.analytics.avgHiredFit')}
            value={`${metrics.fitComparison.hiredAvgFit.toFixed(1)}/10`}
            subtitle={t(locale, 'panel.analytics.fitPoolDelta', {
              pool: metrics.fitComparison.poolAvgFit.toFixed(1),
              delta: `${metrics.fitComparison.delta > 0 ? '+' : ''}${metrics.fitComparison.delta.toFixed(1)}`,
            })}
            locale={locale}
          />

          <MetricCard
            title={t(locale, 'panel.analytics.rubricAdherence')}
            value={`${metrics.rubricAdherence.avgAdherence.toFixed(1)}/10`}
            subtitle={t(locale, 'panel.analytics.hiresCount', { n: metrics.rubricAdherence.count })}
            locale={locale}
          />
        </div>
        ) : null}

        {/* Tendências */}
        {activeView === 'trends' && trends && trendsEmpty ? (
          <EmptyState
            title={t(locale, 'panel.analytics.trendsEmptyTitle')}
            message={t(locale, 'panel.analytics.trendsEmptyBody')}
          />
        ) : null}

        {activeView === 'trends' && trends && !trendsEmpty && (
        <div className="grid gap-4 xl:grid-cols-2">
          <TrendChart
            title={t(locale, 'panel.analytics.hrScoreAvg')}
            data={trends.hrScore}
            dataKey="avgScore"
            tone="brand"
          />

          <TrendChart
            title={t(locale, 'panel.analytics.turnoverRisk')}
            data={trends.turnoverRisk}
            dataKey="highRiskPct"
            tone="danger"
          />

          <TrendChart
            title={t(locale, 'panel.analytics.climateAvg')}
            data={trends.climate}
            dataKey="avgClimate"
            tone="success"
          />

          <HiringFlowChart data={trends.hiresVsExits} locale={locale} />
        </div>
        )}
        </div>
      </div>

      <div className={cn(S.card, 'py-4')}>
        <CollapsibleBlock
          locale={locale}
          title={t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsTitle')}
          collapsedHint={t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsHelp')}
          titleClassName="font-ui text-sm normal-case tracking-normal text-ink"
        >
        <p className={cn(S.muted, 'mb-4 mt-0')}>
          {t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsHelp')}
        </p>
        <div className={cn(formFieldRowClass, 'gap-4')}>
          <FormField label={t(locale, 'panel.motivatorsAdmin.analytics.reportFreq')}>
            <select
              className={S.select}
              value={reportPrefs.frequency}
              onChange={(e) => setReportPrefs((p) => ({ ...p, frequency: e.target.value }))}
            >
              <option value="weekly">{t(locale, 'panel.motivatorsAdmin.analytics.reportFreqWeekly')}</option>
              <option value="monthly">{t(locale, 'panel.motivatorsAdmin.analytics.reportFreqMonthly')}</option>
              <option value="off">{t(locale, 'panel.motivatorsAdmin.analytics.reportFreqOff')}</option>
            </select>
          </FormField>
          <label className="flex min-h-touch cursor-pointer items-center gap-2 self-end font-ui text-sm text-ink">
            <input
              type="checkbox"
              className={S.checkbox}
              checked={reportPrefs.attachPdf}
              onChange={(e) => setReportPrefs((p) => ({ ...p, attachPdf: e.target.checked }))}
            />
            {t(locale, 'panel.motivatorsAdmin.analytics.reportAttachPdf')}
          </label>
          <button
            type="button"
            className={cn(S.btnPrimary, 'self-end')}
            disabled={prefsBusy}
            onClick={saveReportPrefs}
          >
            {t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsSave')}
          </button>
        </div>
        </CollapsibleBlock>
      </div>
    </div>
    </ContentEnter>
  );
}

function AreaComparison({ comparison, locale }) {
  const rows = [comparison.areaA, comparison.areaB].filter(Boolean);
  return (
    <div className="overflow-x-auto rounded-card border border-ink/12">
      <div className="min-w-[34rem]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-ink/10 bg-ink/[0.03] px-4 py-3 font-mono text-2xs uppercase tracking-wide text-ink-muted">
        <span>{t(locale, 'panel.analytics.compareArea')}</span>
        <span>{t(locale, 'panel.analytics.hrScoreAvg')}</span>
        <span>{t(locale, 'panel.analytics.highRisk')}</span>
      </div>
      {rows.map((row) => (
        <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-ink/8 px-4 py-4 last:border-b-0">
          <div><p className="m-0 font-ui text-sm font-semibold text-ink">{row.name}</p><p className="mb-0 mt-1 font-ui text-xs text-ink-faint">{t(locale, 'panel.analytics.peopleCount', { n: row.count })}</p></div>
          <span className="font-mono text-sm font-semibold tabular-nums text-ink">{row.avgHrScore.toFixed(1)}</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-danger">{row.highRiskPct.toFixed(1)}%</span>
        </div>
      ))}
      </div>
      <p className="m-0 border-t border-ink/10 bg-info/5 px-4 py-3 font-ui text-xs leading-5 text-ink-muted">{t(locale, 'panel.analytics.compareGuardrail')}</p>
    </div>
  );
}

function TrendChart({ title, data, dataKey, tone = 'brand' }) {
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
  const tones = TREND_TONE[tone] || TREND_TONE.brand;

  return (
    <div className={cn(S.cardTight, 'min-w-0')}>
      <div className="mb-5 font-ui text-sm font-semibold text-ink">{title}</div>
      <div className="flex h-36 items-end gap-1 overflow-hidden border-b border-ink/10">
        {data.map((item, idx) => {
          const value = item[dataKey] || 0;
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn('text-xs font-mono', tones.value)}>{value > 0 ? value : ''}</div>
              <div
                className={cn('ui-analytics-bar w-full opacity-80', tones.bar)}
                style={{ height: `${height}%` }}
                title={`${item.month}: ${value}`}
              />
              <div className="text-xs text-ink-faint">
                {item.month.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, trend, locale }) {
  const trendClass =
    trend > 0 ? 'text-danger' : trend < 0 ? 'text-success' : 'text-ink';
  const trendText = trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : '';

  return (
    <div className="min-w-0 bg-surface p-5">
      <StatMetricTile
        value={value}
        label={title}
        hint={subtitle || null}
        className="border-0 bg-transparent p-0"
      />
      {trend !== undefined && trendText ? (
        <div className={cn('mt-2 text-sm', trendClass)}>
          {trendText} {t(locale, 'panel.analytics.vsPrevious')}
        </div>
      ) : null}
    </div>
  );
}

function HiringFlowChart({ data = [], locale }) {
  const maxValue = Math.max(0, ...data.map((item) => Math.max(item.hires || 0, item.exits || 0)));
  return (
    <div className={cn(S.cardTight, 'min-w-0')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="font-ui text-sm font-semibold text-ink">{t(locale, 'panel.analytics.hiresVsExits')}</div>
        <div className="flex gap-4 font-ui text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success/70" />{t(locale, 'panel.analytics.hires')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger/70" />{t(locale, 'panel.analytics.exits')}</span>
        </div>
      </div>
      <div className="flex h-36 items-end gap-1 overflow-hidden border-b border-ink/10 pt-5">
        {data.map((item) => {
          const hiresHeight = maxValue > 0 ? ((item.hires || 0) / maxValue) * 100 : 0;
          const exitsHeight = maxValue > 0 ? ((item.exits || 0) / maxValue) * 100 : 0;
          return (
            <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${item.month}: ${item.hires || 0} / ${item.exits || 0}`}>
              <div className="flex min-h-0 flex-1 items-end justify-center gap-0.5">
                <span className="ui-analytics-bar w-[38%] bg-success/70" style={{ height: `${hiresHeight}%` }} />
                <span className="ui-analytics-bar w-[38%] bg-danger/70" style={{ height: `${exitsHeight}%` }} />
              </div>
              <span className="mt-1.5 text-center font-mono text-2xs text-ink-faint">{item.month.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
