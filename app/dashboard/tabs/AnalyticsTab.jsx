'use client';

/**
 * B-1101 — Analytics: aba de métricas de efetividade
 */

import { useState, useEffect } from 'react';
import { t } from '../../../lib/i18n.js';
import { useLocale } from '../../../lib/useLocale.js';
import { S } from '../dashboard-shared.jsx';
import { DateField } from '../../_components/DateField.jsx';
import { FormField, formFieldRowClass } from '../../_components/FormField';
import { useAppFeedback } from '../../_components/AppFeedback.jsx';
import { AppLoading, ContentEnter } from '../../_components/AppLoading.jsx';
import { EmptyState } from '../../_components/EmptyState';
import { cn } from '../../../lib/cn.js';
import { StatMetricTile } from '../../_components/StatMetricTile';
import { SegmentedControl } from '../../_components/SegmentedControl';

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

export function AnalyticsTab({ session: _session, navigateDashboard }) {
  const [locale] = useLocale();
  const { toast } = useAppFeedback();
  const [activeView, setActiveView] = useState('metrics'); // 'metrics' | 'trends' | 'compare'
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [comparison, setComparison] = useState(null);
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
  }, [activeView, filters.startDate, filters.endDate, trendMonths]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/analytics/report-prefs');
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
  }, []);

  async function saveReportPrefs() {
    setPrefsBusy(true);
    try {
      const res = await fetch('/api/admin/analytics/report-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrends() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('months', trendMonths);

      const res = await fetch(`/api/admin/analytics/trends?${params}`);
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load trends');
      }

      setTrends(data.trends);
    } catch (err) {
      console.error('Error loading trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadComparison() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('type', compareType);

      if (compareType === 'areas') {
        if (!compareParams.areaA || !compareParams.areaB) {
          throw new Error('Select both areas');
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <AppLoading locale={locale} variant="panel" />;
  }

  if (error) {
    return (
      <div className={S.card}>
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const viewTitle =
    activeView === 'metrics'
      ? t(locale, 'panel.analytics.titleMetrics')
      : activeView === 'trends'
        ? t(locale, 'panel.analytics.titleTrends')
        : t(locale, 'panel.analytics.titleCompare');

  const metricsEmpty = activeView === 'metrics' && isMetricsEmpty(metrics);
  const canNav = typeof navigateDashboard === 'function';

  return (
    <ContentEnter animKey={activeView}>
    <div className="space-y-6">
      <div className={S.card}>
        <div className="mb-6">
          <SegmentedControl
            aria-label={t(locale, 'panel.analytics.titleMetrics')}
            value={activeView}
            onChange={setActiveView}
            options={[
              { id: 'metrics', label: t(locale, 'panel.analytics.viewMetrics') },
              { id: 'trends', label: t(locale, 'panel.analytics.viewTrends') },
              { id: 'compare', label: t(locale, 'panel.analytics.viewCompare') },
            ]}
          />
        </div>

        <h2 className="font-display text-xl mb-4">{viewTitle}</h2>

        {/* Filtros */}
        {activeView === 'metrics' && (
        <div className={cn(formFieldRowClass, 'mb-6 gap-4')}>
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
        <div className={cn(formFieldRowClass, 'mb-6 gap-4')}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        {activeView === 'trends' && trends && (
        <div className="space-y-6">
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

          <div className={S.cardTight}>
            <div className="font-bold mb-3">
              {t(locale, 'panel.analytics.hiresVsExits')}
            </div>
            <div className="h-48 flex items-end gap-1">
              {trends.hiresVsExits.map((item, idx) => {
                const maxValue = Math.max(...trends.hiresVsExits.map(i => Math.max(i.hires, i.exits)));
                const hiresHeight = (item.hires / maxValue) * 100;
                const exitsHeight = (item.exits / maxValue) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col gap-1" title={item.month}>
                    <div
                      className="ui-analytics-bar bg-success/70"
                      style={{ height: `${hiresHeight}%` }}
                    />
                    <div
                      className="ui-analytics-bar bg-danger/70"
                      style={{ height: `${exitsHeight}%` }}
                    />
                    <div className="text-xs text-center text-ink-faint">
                      {item.month.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success/70" />
                <span>{t(locale, 'panel.analytics.hires')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-danger/70" />
                <span>{t(locale, 'panel.analytics.exits')}</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <div className={S.card}>
        <h3 className="font-display text-lg mb-2">
          {t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsTitle')}
        </h3>
        <p className={cn(S.muted, 'mb-4')}>
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
      </div>
    </div>
    </ContentEnter>
  );
}

function TrendChart({ title, data, dataKey, tone = 'brand' }) {
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
  const tones = TREND_TONE[tone] || TREND_TONE.brand;

  return (
    <div className={S.cardTight}>
      <div className="font-bold mb-3">{title}</div>
      <div className="h-32 flex items-end gap-1">
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
    <div className={S.cardTight}>
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
