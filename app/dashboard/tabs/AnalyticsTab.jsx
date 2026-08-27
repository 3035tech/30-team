'use client';

/**
 * B-1101 — Analytics: aba de métricas de efetividade
 */

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/useLocale.js';
import { C } from '@/lib/theme.js';
import { S } from '../dashboard-shared.jsx';

export function AnalyticsTab({ session }) {
  const { t, locale } = useLocale();
  const [activeView, setActiveView] = useState('metrics'); // 'metrics' | 'trends'
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vacancyId: '',
  });
  const [trendMonths, setTrendMonths] = useState(12);

  useEffect(() => {
    loadMetrics();
  }, []);

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

  function applyFilters() {
    loadMetrics();
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
        <h2 className="font-display text-xl mb-4">
          {locale === 'pt-BR' ? 'Métricas de Efetividade' : 'Effectiveness Metrics'}
        </h2>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className={S.label}>
              {locale === 'pt-BR' ? 'Data início' : 'Start date'}
            </label>
            <input
              type="date"
              className={S.input}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className={S.label}>
              {locale === 'pt-BR' ? 'Data fim' : 'End date'}
            </label>
            <input
              type="date"
              className={S.input}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button className={S.btnPrimary} onClick={applyFilters}>
              {locale === 'pt-BR' ? 'Aplicar' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Cards de métricas */}
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
