'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '../../../../lib/cn';
import { S } from '../../dashboard-shared';
import { InsightListItem } from '../../../_components/InsightListItem';
import { AppLoading } from '../../../_components/AppLoading';

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
        linkBenefits: 'Revisar benefícios →',
        linkTeam: 'Equipe / retenção →',
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
        linkBenefits: 'Review benefits →',
        linkTeam: 'Team / retention →',
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
      <div className={S.card}>
        <AppLoading locale={locale} variant="inline" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className={S.card}>
        <div className="mb-4">
          <h3 className={S.cardTitle}>{t('title')}</h3>
          <p className={cn(S.cardSubtitle, 'mt-0.5')}>{t('subtitle')}</p>
        </div>
        <p className={S.cardMuted}>{t('noExits')}</p>
      </div>
    );
  }

  const recruitmentInsights = data.insights.filter((i) => i.category === 'recruitment');
  const managementInsights = data.insights.filter((i) => i.category === 'management');

  return (
    <div className={S.card}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={S.cardTitle}>{t('title')}</h3>
          <p className={cn(S.cardSubtitle, 'mt-0.5')}>{t('subtitle')}</p>
        </div>
        <span className="rounded bg-canvas-alt px-2 py-1 text-xs font-medium text-ink-muted">
          {data.total} {t('totalExits')}
        </span>
      </div>

      <div className="space-y-4">
        {recruitmentInsights.length > 0 && (
          <div>
            <h4 className={S.cardSection}>{t('recruitment')}</h4>
            <div className="space-y-2">
              {recruitmentInsights.map((insight, idx) => (
                <InsightListItem
                  key={idx}
                  title={insight.description}
                  body={insight.suggestion}
                  tone={insight.severity === 'high' ? 'danger' : 'warning'}
                  toneLabel={insight.severity === 'high' ? t('high') : t('medium')}
                >
                  <p className={cn(S.cardFaint, 'mt-1')}>
                    {insight.percentage}% das saídas ({insight.count})
                  </p>
                </InsightListItem>
              ))}
            </div>
          </div>
        )}

        {managementInsights.length > 0 && (
          <div>
            <h4 className={S.cardSection}>{t('management')}</h4>
            <div className="space-y-2">
              {managementInsights.map((insight, idx) => (
                <InsightListItem
                  key={idx}
                  title={insight.description}
                  body={insight.suggestion}
                  tone={insight.severity === 'high' ? 'danger' : 'warning'}
                  toneLabel={insight.severity === 'high' ? t('high') : t('medium')}
                >
                  <p className={cn(S.cardFaint, 'mt-1')}>
                    {insight.percentage}% das saídas ({insight.count})
                  </p>
                </InsightListItem>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink/5 pt-4">
        <Link href="/dashboard?tab=exit-analysis" className={S.cardLink}>
          {t('viewAll')}
        </Link>
        <Link href="/dashboard?tab=company-benefits" className={S.cardLink}>
          {t('linkBenefits')}
        </Link>
        <Link href="/dashboard?tab=team" className={S.cardLink}>
          {t('linkTeam')}
        </Link>
      </div>
    </div>
  );
}
