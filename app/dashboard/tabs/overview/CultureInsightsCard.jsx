'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CultureInsightsCard({ locale = 'pt-BR', companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFull, setShowFull] = useState(false);

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Cultura Organizacional',
        subtitle: 'Leitura hedged: clima + mix T1–T9 + pulso',
        noData: 'Dados insuficientes para leitura cultural',
        noDataDesc: 'Execute pesquisas de clima, pulsos e tenha avaliações T1–T9',
        overallHealth: 'Saúde geral',
        dominantArchetype: 'Arquétipo dominante',
        positive: 'Positiva',
        neutral: 'Neutra',
        concern: 'Atenção',
        unknown: 'Desconhecido',
        viewFull: 'Ver insights completos',
        viewSummary: 'Ver resumo',
        insightsTitle: 'Insights',
        hedgingNote: '💡 Leitura baseada em indicadores; não substitui observação direta.',
        climate: 'Clima',
        typeMix: 'Mix T1–T9',
        pulse: 'Pulso',
        alignment: 'Alinhamento',
      },
      en: {
        title: 'Organizational Culture',
        subtitle: 'Hedged reading: climate + T1–T9 mix + pulse',
        noData: 'Insufficient data for culture reading',
        noDataDesc: 'Run climate surveys, pulses, and have T1–T9 assessments',
        overallHealth: 'Overall health',
        dominantArchetype: 'Dominant archetype',
        positive: 'Positive',
        neutral: 'Neutral',
        concern: 'Concern',
        unknown: 'Unknown',
        viewFull: 'View full insights',
        viewSummary: 'View summary',
        insightsTitle: 'Insights',
        hedgingNote: '💡 Reading based on indicators; does not replace direct observation.',
        climate: 'Climate',
        typeMix: 'T1–T9 Mix',
        pulse: 'Pulse',
        alignment: 'Alignment',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  useEffect(() => {
    loadData();
  }, [companyId]);

  async function loadData() {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organizational-culture?summary=true');
      const json = await res.json();
      if (json.ok) {
        setData(json.summary);
      }
    } catch (err) {
      console.error('Failed to load culture insights:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFullInsights() {
    if (!companyId) return;
    try {
      const res = await fetch('/api/admin/organizational-culture');
      const json = await res.json();
      if (json.ok) {
        setData({ ...data, fullCulture: json.culture });
        setShowFull(true);
      }
    } catch (err) {
      console.error('Failed to load full culture:', err);
    }
  }

  function getHealthColor(health) {
    switch (health) {
      case 'positive':
        return 'bg-success/10 text-success';
      case 'neutral':
        return 'bg-warning/10 text-warning';
      case 'concern':
        return 'bg-danger/10 text-danger';
      default:
        return 'bg-ink/10 text-ink-muted';
    }
  }

  function getCategoryIcon(category) {
    switch (category) {
      case 'climate':
        return '🌡️';
      case 'type_mix':
        return '🧩';
      case 'pulse':
        return '📊';
      case 'alignment':
        return '🎯';
      default:
        return '💡';
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

  if (!data || (!data.hasClimateData && !data.hasPulseData)) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
          <p className="text-xs text-ink-muted mt-0.5">{t('subtitle')}</p>
        </div>
        <p className="text-sm text-ink-muted">{t('noData')}</p>
        <p className="text-xs text-ink-faint mt-1">{t('noDataDesc')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-ink/10 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
          <p className="text-xs text-ink-muted mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {/* Summary */}
      {!showFull && (
        <div className="space-y-4">
          {/* Overall Health */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-label mb-2">
              {t('overallHealth')}
            </p>
            <span
              className={`inline-flex rounded px-3 py-1 text-sm font-medium ${getHealthColor(data.overallHealth)}`}
            >
              {t(data.overallHealth)}
            </span>
          </div>

          {/* Dominant Archetype */}
          {data.dominantArchetype && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-label mb-2">
                {t('dominantArchetype')}
              </p>
              <p className="text-sm text-ink">
                <span className="font-semibold">{data.dominantArchetype.type}</span> —{' '}
                {data.dominantArchetype.percentage}% do time
              </p>
            </div>
          )}

          {/* Hedging Note */}
          <div className="rounded-lg border border-ink/5 bg-canvas-alt/30 p-3">
            <p className="text-xs text-ink-muted">{t('hedgingNote')}</p>
          </div>

          {/* View Full Button */}
          <button
            onClick={loadFullInsights}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {t('viewFull')} →
          </button>
        </div>
      )}

      {/* Full Insights */}
      {showFull && data.fullCulture && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-ink">{t('insightsTitle')}</h4>
          <div className="space-y-3">
            {data.fullCulture.insights.map((insight, idx) => {
              let actionLink = null;
              if (insight.category === 'climate') {
                actionLink = '/dashboard?tab=climate';
              } else if (insight.category === 'pulse') {
                actionLink = '/dashboard?tab=groups';
              }
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-ink/5 bg-canvas-alt/30 p-3"
                >
                  <span className="text-xl shrink-0">{getCategoryIcon(insight.category)}</span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{insight.description}</p>
                      {actionLink && (
                        <Link
                          href={actionLink}
                          className="flex-shrink-0 text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          {locale === 'en' ? 'View' : 'Ver'} →
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{insight.details}</p>
                    {insight.hedging && (
                      <p className="text-xs text-ink-faint mt-1 italic">{insight.hedging}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Back to Summary Button */}
          <button
            onClick={() => setShowFull(false)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            ← {t('viewSummary')}
          </button>
        </div>
      )}
    </div>
  );
}
