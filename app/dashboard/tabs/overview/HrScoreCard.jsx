'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { t } from '../../../../lib/i18n';
import { cn } from '../../../../lib/cn';
import { S } from '../../dashboard-shared';
import { Icon } from '../../../_components/Icon';

/**
 * Card de HR Score na Overview
 * Mostra média da empresa + rollup por área + top/bottom performers
 */
export default function HrScoreCard({ locale, companyId, isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const fetchScores = async () => {
      try {
        setLoading(true);
        setError(false);
        const params = new URLSearchParams({ companyId: String(companyId) });
        const res = await fetch(`/api/admin/hr-score/company?${params}`);
        if (!res.ok) throw new Error('fetch_failed');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('[HrScoreCard] Fetch error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [companyId]);

  if (loading) {
    return (
      <div className={S.card}>
        <div className="flex items-center gap-2 text-ink-muted">
          <Icon name="loader" className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t(locale, 'hrScore.calculating')}</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={S.card}>
        <div className="text-sm text-ink-faint">{t(locale, 'hrScore.notAvailable')}</div>
      </div>
    );
  }

  const { overall, byArea, topPerformers, bottomPerformers } = data;

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className={S.card}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-base font-medium text-ink">
            {t(locale, 'hrScore.title')}
          </h3>
          <p className="text-sm text-ink-muted">{t(locale, 'hrScore.companyOverview')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={async () => {
              if (!confirm(t(locale, 'hrScore.recalculate') + '?')) return;
              try {
                const res = await fetch('/api/admin/hr-score/recalculate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ companyId }),
                });
                if (!res.ok) throw new Error('recalc_failed');
                alert(t(locale, 'hrScore.recalculated'));
                window.location.reload();
              } catch (err) {
                alert(t(locale, 'hrScore.recalculateFailed'));
              }
            }}
            className="rounded-control border border-ink/12 bg-white px-3 py-1.5 text-xs text-ink hover:bg-ink/5"
          >
            <Icon name="refresh-cw" className="mr-1 inline h-3 w-3" />
            {t(locale, 'hrScore.recalculate')}
          </button>
        )}
      </div>

      {overall.total === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">
          {t(locale, 'hrScore.noScores')}
        </div>
      ) : (
        <>
          {/* Score médio geral */}
          <div className="mb-6 flex items-center justify-between rounded-card border border-ink/8 bg-ink/[0.02] p-4">
            <div>
              <div className="text-sm text-ink-muted">{t(locale, 'hrScore.avgScore')}</div>
              <div className="text-xs text-ink-faint">
                {overall.total} {overall.total === 1 ? 'pessoa' : 'pessoas'}
              </div>
            </div>
            <div className="text-center">
              <div className={cn('font-mono text-3xl font-bold', getScoreColor(overall.avgScore))}>
                {overall.avgScore}
              </div>
              <div className="text-xs text-ink-muted">
                {overall.minScore}–{overall.maxScore}
              </div>
            </div>
          </div>

          {/* Por área */}
          {byArea.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-medium text-ink">{t(locale, 'hrScore.byArea')}</h4>
              <div className="space-y-2 text-sm">
                {byArea.slice(0, 5).map((area) => (
                  <div key={area.area} className="flex items-center justify-between">
                    <span className="text-ink">
                      {area.area} <span className="text-xs text-ink-faint">({area.count})</span>
                    </span>
                    <span className={cn('font-mono text-sm font-medium', getScoreColor(area.avgScore))}>
                      {area.avgScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top/Bottom performers */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Top */}
            {topPerformers.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-ink">
                  {t(locale, 'hrScore.topPerformers')}
                </h4>
                <ul className="space-y-1 text-xs">
                  {topPerformers.slice(0, 3).map((person) => (
                    <li key={person.id} className="flex items-center justify-between">
                      <Link
                        href={`/dashboard?tab=team&candidateId=${person.id}`}
                        className="truncate text-ink hover:underline"
                      >
                        {person.fullName}
                      </Link>
                      <span className={cn('ml-2 font-mono', getScoreColor(person.score))}>
                        {person.score}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom */}
            {bottomPerformers.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-ink">
                  {t(locale, 'hrScore.bottomPerformers')}
                </h4>
                <ul className="space-y-1 text-xs">
                  {bottomPerformers.slice(0, 3).map((person) => (
                    <li key={person.id} className="flex items-center justify-between">
                      <Link
                        href={`/dashboard?tab=team&candidateId=${person.id}`}
                        className="truncate text-ink hover:underline"
                      >
                        {person.fullName}
                      </Link>
                      <div className="ml-2 flex items-center gap-1">
                        <span className={cn('font-mono', getScoreColor(person.score))}>
                          {person.score}
                        </span>
                        {person.turnoverRisk === 'high' && (
                          <Icon name="alert-triangle" className="h-3 w-3 text-danger" title="High turnover risk" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
