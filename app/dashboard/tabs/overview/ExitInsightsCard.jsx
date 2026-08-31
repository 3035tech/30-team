'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '../../../../lib/cn';
import { S } from '../../dashboard-shared';
import { InsightListItem } from '../../../_components/InsightListItem';
import { AppLoading, ContentEnter } from '../../../_components/AppLoading';
import { CategoryBars } from '../../../_components/CategoryBars';
import { ChartPanel } from '../../../_components/ChartPanel';
import { CHART_MIN_N, topCategoryCounts } from '../../../../lib/chart-aggregates';

const REASON_LABELS = {
  'pt-BR': {
    better_offer: 'Proposta melhor',
    career_growth: 'Crescimento de carreira',
    compensation: 'Compensação',
    benefits: 'Pacote de benefícios',
    work_life_balance: 'Equilíbrio vida-trabalho',
    burnout: 'Esgotamento / burnout',
    workload: 'Sobrecarga de trabalho',
    relocation: 'Mudança de cidade/país',
    commute: 'Deslocamento / commute',
    schedule: 'Escala / turnos',
    personal: 'Pessoal',
    family_care: 'Cuidado familiar',
    health: 'Saúde',
    study: 'Estudos',
    public_exam: 'Concurso / setor público',
    entrepreneurship: 'Empreendedorismo',
    performance: 'Desempenho',
    conduct: 'Conduta',
    harassment: 'Assédio / ambiente hostil',
    restructuring: 'Reestruturação',
    layoff: 'Demissão em massa / layoff',
    position_eliminated: 'Cargo eliminado',
    contract_end: 'Fim de contrato',
    seasonal_end: 'Fim de temporada / sazonal',
    retirement: 'Aposentadoria',
    culture_fit: 'Fit cultural',
    manager_relationship: 'Relação com gestor',
    recognition: 'Reconhecimento',
    lack_of_challenge: 'Falta de desafio',
    targets_pressure: 'Pressão por metas',
    client_pressure: 'Pressão de clientes',
    tools_process: 'Ferramentas / processos',
    other: 'Outro',
  },
  en: {
    better_offer: 'Better offer',
    career_growth: 'Career growth',
    compensation: 'Compensation',
    benefits: 'Benefits package',
    work_life_balance: 'Work-life balance',
    burnout: 'Burnout',
    workload: 'Workload',
    relocation: 'Relocation',
    commute: 'Commute',
    schedule: 'Schedule / shifts',
    personal: 'Personal',
    family_care: 'Family care',
    health: 'Health',
    study: 'Study',
    public_exam: 'Public exam / civil service',
    entrepreneurship: 'Entrepreneurship',
    performance: 'Performance',
    conduct: 'Conduct',
    harassment: 'Harassment / hostile environment',
    restructuring: 'Restructuring',
    layoff: 'Mass layoff',
    position_eliminated: 'Position eliminated',
    contract_end: 'Contract end',
    seasonal_end: 'Seasonal end',
    retirement: 'Retirement',
    culture_fit: 'Culture fit',
    manager_relationship: 'Manager relationship',
    recognition: 'Recognition',
    lack_of_challenge: 'Lack of challenge',
    targets_pressure: 'Targets pressure',
    client_pressure: 'Client pressure',
    tools_process: 'Tools / processes',
    other: 'Other',
  },
};

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
        reasonsTitle: 'Principais motivos',
        reasonsHint: 'Top motivos no total de saídas (visão agregada).',
        ofExits: 'das saídas',
        noPatternYet: 'Ainda sem padrão forte o bastante para insight hedged. Use os motivos e a lista completa.',
        lowVolume: 'Volume baixo para insight automático. Registre mais saídas ou abra a lista completa.',
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
        reasonsTitle: 'Top reasons',
        reasonsHint: 'Top reasons across recorded exits (aggregated view).',
        ofExits: 'of exits',
        noPatternYet: 'No strong pattern for a hedged insight yet. Use the reasons chart and the full list.',
        lowVolume: 'Too few exits for automatic insight. Record more or open the full list.',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  function reasonLabel(id) {
    return REASON_LABELS[locale]?.[id] || REASON_LABELS['pt-BR'][id] || id;
  }

  useEffect(() => {
    loadInsights();
  }, [companyId]);

  async function loadInsights() {
    if (!companyId) return;
    setLoading(true);
    try {
      const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const res = await fetch(`/api/admin/exit-analysis/insights${qs}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load exit insights:', err);
    } finally {
      setLoading(false);
    }
  }

  const reasonBars = useMemo(() => {
    if (!data?.reasonAgg?.length) return [];
    return topCategoryCounts(data.reasonAgg, { key: 'exitReason', limit: 5 }).map((r) => ({
      id: r.id,
      label: reasonLabel(r.id),
      value: r.value,
      toneClass: 'rounded-full bg-warning',
    }));
  }, [data, locale]);

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
  const showReasons = data.total >= CHART_MIN_N && reasonBars.length > 0;

  return (
    <ContentEnter animKey={`exit-insights|${companyId}|${data.total}`}>
    <div className={S.card}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={S.cardTitle}>{t('title')}</h3>
          <p className={cn(S.cardSubtitle, 'mt-0.5')}>{t('subtitle')}</p>
        </div>
        <span className="rounded bg-canvas-alt px-2 py-1 font-mono text-2xs font-medium tabular-nums text-ink-muted">
          {data.total} {t('totalExits')}
        </span>
      </div>

      {showReasons ? (
        <ChartPanel
          className="mb-4"
          title={t('reasonsTitle')}
          hint={t('reasonsHint')}
        >
          <CategoryBars items={reasonBars} height={8} total={data.total} />
        </ChartPanel>
      ) : null}

      {recruitmentInsights.length === 0 && managementInsights.length === 0 ? (
        showReasons ? (
          <p className={cn(S.cardMuted, 'mb-0 text-xs')}>{t('noPatternYet')}</p>
        ) : (
          <p className={cn(S.cardMuted, 'mb-0 text-xs')}>{t('lowVolume')}</p>
        )
      ) : (
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
                    {insight.percentage}% {t('ofExits')} ({insight.count})
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
                    {insight.percentage}% {t('ofExits')} ({insight.count})
                  </p>
                </InsightListItem>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

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
    </ContentEnter>
  );
}
