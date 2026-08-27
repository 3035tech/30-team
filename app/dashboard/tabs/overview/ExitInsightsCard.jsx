'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ExitInsightsCard({ locale = 'pt-BR', companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Análise Demissional',
        subtitle: 'Insights de saídas para melhorar seleção e gestão',
        totalExits: 'saídas registradas',
        noExits: 'Nenhuma saída registrada ainda',
        recruitment: 'Seleção (M1)',
        management: 'Gestão (M3/M4)',
        high: 'Alto',
        medium: 'Médio',
        viewAll: 'Ver detalhes →',
      },
      en: {
        title: 'Exit Analysis',
        subtitle: 'Exit insights to improve recruitment and management',
        totalExits: 'exits recorded',
        noExits: 'No exits recorded yet',
        recruitment: 'Recruitment (M1)',
        management: 'Management (M3/M4)',
        high: 'High',
        medium: 'Medium',
        viewAll: 'View details →',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  useEffect(() => {
    loadInsights();
  }, [companyId]);

  async function loadInsights() {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/exit-analysis/insights');
      const data = await res.json();
      if (data.ok) {
        setData(data);
      }
    } catch (err) {
      console.error('Failed to load exit insights:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"></div>
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
          <p className="text-xs text-ink-muted mt-0.5">{t('subtitle')}</p>
        </div>
        <p className="text-sm text-ink-muted">{t('noExits')}</p>
      </div>
    );
  }

  const recruitmentInsights = data.insights.filter((i) => i.category === 'recruitment');
  const managementInsights = data.insights.filter((i) => i.category === 'management');

  return (
    <div className="rounded-card border border-ink/10 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
          <p className="text-xs text-ink-muted mt-0.5">{t('subtitle')}</p>
        </div>
        <span className="rounded bg-canvas-alt px-2 py-1 text-xs font-medium text-ink-muted">
          {data.total} {t('totalExits')}
        </span>
      </div>

      {/* Insights */}
      <div className="space-y-4">
        {/* Recruitment (M1) */}
        {recruitmentInsights.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-label">
              {t('recruitment')}
            </h4>
            <div className="space-y-2">
              {recruitmentInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-ink/5 bg-canvas-alt/30 p-3"
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      insight.severity === 'high'
                        ? 'bg-danger/20 text-danger'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    !
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{insight.description}</p>
                    <p className="text-xs text-ink-muted mt-1">{insight.suggestion}</p>
                    <p className="text-xs text-ink-faint mt-1">
                      {insight.percentage}% das saídas ({insight.count})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Management (M3/M4) */}
        {managementInsights.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-label">
              {t('management')}
            </h4>
            <div className="space-y-2">
              {managementInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-ink/5 bg-canvas-alt/30 p-3"
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      insight.severity === 'high'
                        ? 'bg-danger/20 text-danger'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    !
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{insight.description}</p>
                    <p className="text-xs text-ink-muted mt-1">{insight.suggestion}</p>
                    <p className="text-xs text-ink-faint mt-1">
                      {insight.percentage}% das saídas ({insight.count})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="mt-4 pt-4 border-t border-ink/5">
        <Link
          href="#"
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          onClick={(e) => {
            e.preventDefault();
            // Navigate to admin tab (requires navigateDashboard, but simplified for now)
          }}
        >
          {t('viewAll')}
        </Link>
      </div>
    </div>
  );
}
