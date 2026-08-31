'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '../../../../lib/cn';
import { S } from '../../dashboard-shared';
import { InsightListItem } from '../../../_components/InsightListItem';
import { InlineCallout } from '../../../_components/InlineCallout';
import { StatusToneChip } from '../../../_components/StatusToneChip';
import { AppLoading } from '../../../_components/AppLoading';

export default function CultureInsightsCard({ locale = 'pt-BR', companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFull, setShowFull] = useState(false);

  function t(key, values = {}) {
    const messages = {
      'pt-BR': {
        title: 'Cultura Organizacional',
        subtitle: 'Leitura hedged: clima + mix T1–T9 + pulso',
        noData: 'Dados insuficientes para leitura cultural',
        noDataDesc: 'Execute pesquisas de clima, pulsos e tenha avaliações T1–T9',
        overallHealth: 'Saúde geral',
        dominantArchetype: 'Arquétipo dominante',
        dominantArchetypeValue: '{type}: {pct}% do time',
        positive: 'Positiva',
        neutral: 'Neutra',
        concern: 'Atenção',
        unknown: 'Desconhecido',
        viewFull: 'Ver insights completos',
        viewSummary: 'Ver resumo',
        insightsTitle: 'Insights',
        hedgingNote: 'Leitura baseada em indicadores; não substitui observação direta.',
        climate: 'Clima',
        typeMix: 'Mix T1–T9',
        pulse: 'Pulso',
        alignment: 'Alinhamento',
        declaredTitle: 'Sobre / valores declarados',
        declaredEmpty: 'Ainda sem texto em Sobre da empresa. Preencha no cadastro da empresa.',
        ctaClimate: 'Abrir Clima',
        ctaCompanies: 'Editar Sobre',
        ctaTeam: 'Ver mix na Equipe',
        viewLink: 'Ver →',
      },
      en: {
        title: 'Organizational Culture',
        subtitle: 'Hedged reading: climate + T1–T9 mix + pulse',
        noData: 'Insufficient data for culture reading',
        noDataDesc: 'Run climate surveys, pulses, and have T1–T9 assessments',
        overallHealth: 'Overall health',
        dominantArchetype: 'Dominant archetype',
        dominantArchetypeValue: '{type}: {pct}% of the team',
        positive: 'Positive',
        neutral: 'Neutral',
        concern: 'Concern',
        unknown: 'Unknown',
        viewFull: 'View full insights',
        viewSummary: 'View summary',
        insightsTitle: 'Insights',
        hedgingNote: 'Reading based on indicators; does not replace direct observation.',
        climate: 'Climate',
        typeMix: 'T1–T9 Mix',
        pulse: 'Pulse',
        alignment: 'Alignment',
        declaredTitle: 'About / declared values',
        declaredEmpty: 'No company About text yet. Fill it in the company profile.',
        ctaClimate: 'Open Climate',
        ctaCompanies: 'Edit About',
        ctaTeam: 'See mix on Team',
        viewLink: 'View →',
      },
    };
    let out = messages[locale]?.[key] || messages['pt-BR'][key] || key;
    for (const [k, v] of Object.entries(values || {})) {
      out = String(out).split(`{${k}}`).join(String(v));
    }
    return out;
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

  function healthTone(health) {
    switch (health) {
      case 'positive':
        return 'success';
      case 'neutral':
        return 'warning';
      case 'concern':
        return 'danger';
      default:
        return 'neutral';
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
      <div className={S.card}>
        <AppLoading locale={locale} variant="inline" />
      </div>
    );
  }

  if (!data || (!data.hasClimateData && !data.hasPulseData && !data.hasTypeMixData)) {
    return (
      <div className={S.card}>
        <div className="mb-4">
          <h3 className={cn(S.cardTitle, 'mb-1')}>{t('title')}</h3>
          <p className={S.cardSubtitle}>{t('subtitle')}</p>
        </div>
        <p className={S.cardBody}>{t('noData')}</p>
        <p className={cn(S.cardMuted, 'mt-1')}>{t('noDataDesc')}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/dashboard?tab=climate" className={S.cardLink}>
            {t('ctaClimate')} →
          </Link>
          <Link href="/dashboard?tab=companies" className={S.cardLink}>
            {t('ctaCompanies')} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={S.card}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className={cn(S.cardTitle, 'mb-1')}>{t('title')}</h3>
          <p className={S.cardSubtitle}>{t('subtitle')}</p>
        </div>
      </div>

      {!showFull && (
        <div className="space-y-4">
          <div>
            <p className={S.cardSection}>{t('overallHealth')}</p>
            <StatusToneChip
              tone={healthTone(data.overallHealth)}
              bordered={false}
              className="rounded px-3 py-1 font-ui text-sm font-medium"
            >
              {t(data.overallHealth)}
            </StatusToneChip>
          </div>

          {data.dominantArchetype && (
            <div>
              <p className={S.cardSection}>{t('dominantArchetype')}</p>
              <p className={S.cardBody}>
                {t('dominantArchetypeValue', {
                  type: data.dominantArchetype.type,
                  pct: data.dominantArchetype.percentage,
                })}
              </p>
            </div>
          )}

          <div>
            <p className={S.cardSection}>{t('declaredTitle')}</p>
            {data.declaredSnippet ? (
              <p className={cn(S.cardMuted, 'm-0')}>{data.declaredSnippet}</p>
            ) : (
              <p className={cn(S.cardMuted, 'm-0')}>{t('declaredEmpty')}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/dashboard?tab=climate" className={S.cardLink}>
                {t('ctaClimate')}
              </Link>
              <Link href="/dashboard?tab=companies" className={S.cardLink}>
                {t('ctaCompanies')}
              </Link>
              <Link href="/dashboard?tab=team" className={S.cardLink}>
                {t('ctaTeam')}
              </Link>
            </div>
          </div>

          <InlineCallout tone="info" className="text-prose">
            <p className={cn(S.cardMuted, 'm-0')}>{t('hedgingNote')}</p>
          </InlineCallout>

          <button type="button" onClick={loadFullInsights} className={S.cardLink}>
            {t('viewFull')} →
          </button>
        </div>
      )}

      {showFull && data.fullCulture && (
        <div className="space-y-4">
          <h4 className={cn(S.cardTitle, 'text-sm')}>{t('insightsTitle')}</h4>
          <div className="space-y-3">
            {data.fullCulture.insights.map((insight, idx) => {
              let actionLink = null;
              if (insight.category === 'climate') {
                actionLink = '/dashboard?tab=climate';
              } else if (insight.category === 'pulse') {
                actionLink = '/dashboard?tab=groups';
              } else if (insight.category === 'alignment') {
                actionLink = '/dashboard?tab=companies';
              } else if (insight.category === 'type_mix') {
                actionLink = '/dashboard?tab=team';
              }
              return (
                <InsightListItem
                  key={idx}
                  title={`${getCategoryIcon(insight.category)} ${insight.description}`}
                  body={insight.details}
                >
                  {insight.hedging ? (
                    <p className={cn(S.cardFaint, 'mt-1 italic')}>{insight.hedging}</p>
                  ) : null}
                  {actionLink ? (
                    <Link href={actionLink} className={cn(S.cardLink, 'mt-1 inline-block')}>
                      {t('viewLink')}
                    </Link>
                  ) : null}
                </InsightListItem>
              );
            })}
          </div>

          <button type="button" onClick={() => setShowFull(false)} className={S.cardLink}>
            ← {t('viewSummary')}
          </button>
        </div>
      )}
    </div>
  );
}
