'use client';

/**
 * B-1101 — Analytics: aba de métricas de efetividade
 */

import { useState, useEffect } from 'react';
import { t } from '../../../lib/i18n.js';
import { useLocale } from '../../../lib/useLocale.js';
import { C } from '../../../lib/theme.js';
import { S } from '../dashboard-shared.jsx';
import { DateField } from '../../_components/DateField.jsx';
import { useAppFeedback } from '../../_components/AppFeedback.jsx';
import { cn } from '../../../lib/cn.js';

export function AnalyticsTab({ session }) {
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
  }, [activeView]);

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

  function applyFilters() {
    if (activeView === 'metrics') {
      loadMetrics();
    } else if (activeView === 'trends') {
      loadTrends();
    } else if (activeView === 'compare') {
      loadComparison();
    }
  }

  if (loading) {
    return (
      <div className={S.card}>
        <p className={S.muted}>{t(locale, 'common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={S.card}>
        <p style={{ color: C.danger }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={S.card}>
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            className={activeView === 'metrics' ? S.btnPrimary : S.btnGhost}
            onClick={() => setActiveView('metrics')}
          >
            {locale === 'pt-BR' ? 'Métricas' : 'Metrics'}
          </button>
          <button
            className={activeView === 'trends' ? S.btnPrimary : S.btnGhost}
            onClick={() => setActiveView('trends')}
          >
            {locale === 'pt-BR' ? 'Tendências' : 'Trends'}
          </button>
          <button
            className={activeView === 'compare' ? S.btnPrimary : S.btnGhost}
            onClick={() => setActiveView('compare')}
          >
            {locale === 'pt-BR' ? 'Comparar' : 'Compare'}
          </button>
        </div>

        <h2 className="font-display text-xl mb-4">
          {activeView === 'metrics'
            ? (locale === 'pt-BR' ? 'Métricas de Efetividade' : 'Effectiveness Metrics')
            : activeView === 'trends'
            ? (locale === 'pt-BR' ? 'Tendências Temporais' : 'Trends Over Time')
            : (locale === 'pt-BR' ? 'Comparativos' : 'Comparisons')}
        </h2>

        {/* Filtros */}
        {activeView === 'metrics' && (
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className={S.label}>
              {locale === 'pt-BR' ? 'Data início' : 'Start date'}
            </label>
            <DateField
              className={S.input}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              aria-label={locale === 'pt-BR' ? 'Data início' : 'Start date'}
            />
          </div>
          <div>
            <label className={S.label}>
              {locale === 'pt-BR' ? 'Data fim' : 'End date'}
            </label>
            <DateField
              className={S.input}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              aria-label={locale === 'pt-BR' ? 'Data fim' : 'End date'}
            />
          </div>
          <div className="flex items-end">
            <button className={S.btnPrimary} onClick={applyFilters}>
              {locale === 'pt-BR' ? 'Aplicar' : 'Apply'}
            </button>
          </div>
        </div>
        )}

        {activeView === 'trends' && (
        <div className="flex gap-4 mb-6">
          <div>
            <label className={S.label}>
              {locale === 'pt-BR' ? 'Período (meses)' : 'Period (months)'}
            </label>
            <select
              className={S.select}
              value={trendMonths}
              onChange={(e) => setTrendMonths(parseInt(e.target.value))}
            >
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="24">24 meses</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className={S.btnPrimary} onClick={applyFilters}>
              {locale === 'pt-BR' ? 'Aplicar' : 'Apply'}
            </button>
          </div>
        </div>
        )}

        {/* Cards de métricas */}
        {activeView === 'metrics' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Time to Hire */}
          <MetricCard
            title={locale === 'pt-BR' ? 'Time-to-Hire' : 'Time-to-Hire'}
            value={`${metrics.timeToHire.avgDays} dias`}
            subtitle={`${metrics.timeToHire.count} contratações`}
            trend={metrics.timeToHire.trend}
            locale={locale}
          />

          {/* Time to Productivity */}
          <MetricCard
            title={locale === 'pt-BR' ? 'Time-to-Productivity' : 'Time-to-Productivity'}
            value={`${metrics.timeToProductivity.avgDays} dias`}
            subtitle={`${metrics.timeToProductivity.count} registros`}
            locale={locale}
          />

          {/* Retenção 6m */}
          <MetricCard
            title={locale === 'pt-BR' ? 'Retenção 6 meses' : '6-month Retention'}
            value={`${metrics.retention.sixMonths.rate}%`}
            subtitle={`${metrics.retention.sixMonths.retainedCount}/${metrics.retention.sixMonths.hiredCount}`}
            locale={locale}
          />

          {/* Retenção 12m */}
          <MetricCard
            title={locale === 'pt-BR' ? 'Retenção 12 meses' : '12-month Retention'}
            value={`${metrics.retention.twelveMonths.rate}%`}
            subtitle={`${metrics.retention.twelveMonths.retainedCount}/${metrics.retention.twelveMonths.hiredCount}`}
            locale={locale}
          />

          {/* Fit Contratados */}
          <MetricCard
            title={locale === 'pt-BR' ? 'Fit Médio Contratados' : 'Avg Hired Fit'}
            value={`${metrics.fitComparison.hiredAvgFit.toFixed(1)}/10`}
            subtitle={locale === 'pt-BR' 
              ? `Pool: ${metrics.fitComparison.poolAvgFit.toFixed(1)} | Δ ${metrics.fitComparison.delta > 0 ? '+' : ''}${metrics.fitComparison.delta.toFixed(1)}`
              : `Pool: ${metrics.fitComparison.poolAvgFit.toFixed(1)} | Δ ${metrics.fitComparison.delta > 0 ? '+' : ''}${metrics.fitComparison.delta.toFixed(1)}`
            }
            locale={locale}
          />

          {/* Aderência Rubrica */}
          <MetricCard
            title={locale === 'pt-BR' ? 'Aderência Rubrica' : 'Rubric Adherence'}
            value={`${metrics.rubricAdherence.avgAdherence.toFixed(1)}/10`}
            subtitle={`${metrics.rubricAdherence.count} contratações`}
            locale={locale}
          />
        </div>
        )}

        {/* Tendências */}
        {activeView === 'trends' && trends && (
        <div className="space-y-6">
          {/* HR Score Trend */}
          <TrendChart
            title={locale === 'pt-BR' ? 'HR Score Médio' : 'Average HR Score'}
            data={trends.hrScore}
            dataKey="avgScore"
            label={locale === 'pt-BR' ? 'Score' : 'Score'}
            color={C.brand}
            locale={locale}
          />

          {/* Turnover Risk Trend */}
          <TrendChart
            title={locale === 'pt-BR' ? 'Risco de Rotatividade (%)' : 'Turnover Risk (%)'}
            data={trends.turnoverRisk}
            dataKey="highRiskPct"
            label={locale === 'pt-BR' ? 'Alto Risco' : 'High Risk'}
            color={C.danger}
            locale={locale}
          />

          {/* Climate Trend */}
          <TrendChart
            title={locale === 'pt-BR' ? 'Clima Médio' : 'Average Climate'}
            data={trends.climate}
            dataKey="avgClimate"
            label={locale === 'pt-BR' ? 'Clima' : 'Climate'}
            color={C.success}
            locale={locale}
          />

          {/* Hires vs Exits */}
          <div className={S.cardTight}>
            <div className="font-bold mb-3">
              {locale === 'pt-BR' ? 'Contratações vs Desligamentos' : 'Hires vs Exits'}
            </div>
            <div className="h-48 flex items-end gap-1">
              {trends.hiresVsExits.map((item, idx) => {
                const maxValue = Math.max(...trends.hiresVsExits.map(i => Math.max(i.hires, i.exits)));
                const hiresHeight = (item.hires / maxValue) * 100;
                const exitsHeight = (item.exits / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col gap-1" title={item.month}>
                    <div
                      className="bg-success/70"
                      style={{ height: `${hiresHeight}%` }}
                    />
                    <div
                      className="bg-danger/70"
                      style={{ height: `${exitsHeight}%` }}
                    />
                    <div className="text-xs text-center" style={{ color: C.faint }}>
                      {item.month.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success/70" />
                <span>{locale === 'pt-BR' ? 'Contratações' : 'Hires'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-danger/70" />
                <span>{locale === 'pt-BR' ? 'Desligamentos' : 'Exits'}</span>
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
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.reportFreq')}</span>
            <select
              className={S.select}
              value={reportPrefs.frequency}
              onChange={(e) => setReportPrefs((p) => ({ ...p, frequency: e.target.value }))}
            >
              <option value="weekly">{t(locale, 'panel.motivatorsAdmin.analytics.reportFreqWeekly')}</option>
              <option value="monthly">{t(locale, 'panel.motivatorsAdmin.analytics.reportFreqMonthly')}</option>
              <option value="off">{t(locale, 'panel.motivatorsAdmin.analytics.reportFreqOff')}</option>
            </select>
          </label>
          <label className="flex min-h-touch cursor-pointer items-center gap-2 font-display text-sm text-ink">
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
            className={S.btnPrimary}
            disabled={prefsBusy}
            onClick={saveReportPrefs}
          >
            {t(locale, 'panel.motivatorsAdmin.analytics.reportPrefsSave')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ title, data, dataKey, label, color, locale }) {
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
  
  return (
    <div className={S.cardTight}>
      <div className="font-bold mb-3">{title}</div>
      <div className="h-32 flex items-end gap-1">
        {data.map((item, idx) => {
          const value = item[dataKey] || 0;
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs" style={{ color }}>{value > 0 ? value : ''}</div>
              <div
                className="w-full"
                style={{
                  height: `${height}%`,
                  backgroundColor: color,
                  opacity: 0.8,
                }}
                title={`${item.month}: ${value}`}
              />
              <div className="text-xs" style={{ color: C.faint }}>
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
  const trendColor = trend > 0 ? C.danger : trend < 0 ? C.success : C.ink;
  const trendText = trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : '';

  return (
    <div className={S.cardTight}>
      <div className={S.label}>{title}</div>
      <div className="text-2xl font-bold mt-2 mb-1" style={{ color: C.brand }}>
        {value}
      </div>
      <div className={S.faint}>{subtitle}</div>
      {trend !== undefined && trendText && (
        <div className="text-sm mt-2" style={{ color: trendColor }}>
          {trendText} {locale === 'pt-BR' ? 'vs período anterior' : 'vs previous period'}
        </div>
      )}
    </div>
  );
}
