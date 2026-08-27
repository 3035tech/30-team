'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { t } from '../../../../lib/i18n';
import { cn } from '../../../../lib/cn';
import { S } from '../../dashboard-shared';
import { Icon } from '../../../_components/Icon';

/**
 * Card de Turnover Radar na Overview (B-1002)
 * Lista colaboradores em risco médio/alto
 */
export default function TurnoverRadarCard({ locale, companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const fetchRisks = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/turnover-radar/company?companyId=${companyId}`);
        if (!res.ok) throw new Error('fetch_failed');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('[TurnoverRadarCard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
  }, [companyId]);

  const getRiskColor = (risk) => {
    if (risk === 'high') return 'text-danger bg-danger/10 border-danger/30';
    if (risk === 'medium') return 'text-warning bg-warning/10 border-warning/30';
    return 'text-success bg-success/10 border-success/30';
  };

  const getRiskIcon = (risk) => {
    if (risk === 'high') return 'alert-triangle';
    if (risk === 'medium') return 'alert-circle';
    return 'check-circle';
  };

  if (loading) {
    return (
      <div className={S.card}>
        <div className="flex items-center gap-2">
          <Icon name="loader" className="h-4 w-4 animate-spin text-ink-muted" />
          <span className="text-sm text-ink-muted">{t(locale, 'common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!data || data.risks.length === 0) {
    return (
      <div className={S.card}>
        <h3 className="mb-2 text-base font-medium text-ink">
          {t(locale, 'turnoverRadar.title')}
        </h3>
        <div className="py-6 text-center text-sm text-ink-muted">
          {t(locale, 'turnoverRadar.noRisks')}
        </div>
      </div>
    );
  }

  return (
    <div className={S.card}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-base font-medium text-ink">
            {t(locale, 'turnoverRadar.title')}
          </h3>
          <p className="text-sm text-ink-muted">
            {data.risks.length} {data.risks.length === 1 ? 'pessoa' : 'pessoas'} em risco
          </p>
        </div>
      </div>

      {/* Lista de riscos */}
      <div className="space-y-3">
        {data.risks.slice(0, 8).map((person) => (
          <div
            key={person.candidateId}
            className="flex items-start gap-3 rounded-card border border-ink/8 bg-ink/[0.02] p-3"
          >
            {/* Indicador de risco */}
            <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border', getRiskColor(person.risk))}>
              <Icon name={getRiskIcon(person.risk)} className="h-4 w-4" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard?tab=team&candidateId=${person.candidateId}`}
                    className="truncate font-medium text-ink hover:underline"
                  >
                    {person.candidateName}
                  </Link>
                  <Link
                    href={`/dashboard?tab=team&candidateId=${person.candidateId}&section=journey`}
                    title={locale === 'en' ? 'View PDI' : 'Ver PDI'}
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-brand-600 hover:bg-brand-500/[0.12]"
                  >
                    <Icon name="target" className="h-3 w-3" />
                    PDI
                  </Link>
                </div>
                <span className={cn('text-xs font-medium', getRiskColor(person.risk).split(' ')[0])}>
                  {person.riskScore}
                </span>
              </div>

              {person.area && (
                <div className="mb-2 text-xs text-ink-muted">{person.area}</div>
              )}

              {/* Sinais principais */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(person.signals).map(([key, signal]) => {
                  if (signal.score < 40) return null; // Só mostrar sinais relevantes
                  return (
                    <span
                      key={key}
                      className="rounded px-1.5 py-0.5 text-xs text-ink-muted"
                      style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}
                      title={`${key}: ${signal.score}`}
                    >
                      {key === 'climate' && '🌡️'}
                      {key === 'motivators' && '💪'}
                      {key === 'pdi' && '📈'}
                      {key === 'checkins' && '✅'}
                      {' '}{signal.score}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ver mais */}
      {data.risks.length > 8 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard?tab=team&filter=turnover_risk"
            className="text-sm text-brand-600 hover:underline"
          >
            Ver todos ({data.risks.length})
          </Link>
        </div>
      )}
    </div>
  );
}
