'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { AppLoading, ContentEnter } from './AppLoading';
import { CopyableLink } from './CopyableLink';

const OUTCOME_I18N = {
  met: 'outcomeMet',
  exceeded: 'outcomeExceeded',
  develop: 'outcomeDevelop',
  not_met: 'outcomeNotMet',
};

function outcomeLabel(locale, outcome) {
  if (!outcome) return '—';
  const key = OUTCOME_I18N[outcome];
  return key ? t(locale, `performanceReviews.${key}`) : outcome;
}

/**
 * Manager review + side review summaries for one candidate/cycle (B-2704).
 */
export function PerformanceReviewBlock({ locale, cycleId, candidateId, companyId }) {
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);
  const [goals, setGoals] = useState([]);
  const [sideReviews, setSideReviews] = useState([]);

  const load = useCallback(async () => {
    if (!cycleId || !candidateId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({
        cycleId: String(cycleId),
        candidateId: String(candidateId),
      });
      if (companyId) q.set('companyId', String(companyId));
      const res = await fetch(`/api/admin/performance-reviews?${q}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReview(data.review || null);
        setGoals(Array.isArray(data.goals) ? data.goals : []);
        setSideReviews(Array.isArray(data.sideReviews) ? data.sideReviews : []);
      }
    } finally {
      setLoading(false);
    }
  }, [cycleId, candidateId, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!cycleId || !candidateId) return null;
  if (loading) return <AppLoading variant="inline" />;

  const managerOutcomes = review?.outcomes && typeof review.outcomes === 'object' ? review.outcomes : {};

  return (
    <ContentEnter className="flex flex-col gap-3">
      <section className={cn(S.cardTight, 'bg-white/70')}>
        <h4 className={cn(S.label, 'mb-2')}>{t(locale, 'performanceReviews.sideReview.managerSection')}</h4>
        {review ? (
          <>
            <p className="m-0 text-xs text-ink-muted">
              {t(locale, 'performanceReviews.reviewTitle')} · {review.status}
            </p>
            {goals.length > 0 ? (
              <ul className="mt-2 m-0 flex list-none flex-col gap-1.5 p-0">
                {goals.map((g) => {
                  const o = managerOutcomes[String(g.id)];
                  return (
                    <li key={g.id} className="rounded-md border border-ink/10 px-2 py-1.5 text-xs">
                      <span className="font-medium text-ink">{g.title}</span>
                      {o?.outcome ? (
                        <span className="ml-1.5 text-ink-muted">· {outcomeLabel(locale, o.outcome)}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 mb-0 text-xs text-ink-faint">{t(locale, 'performanceReviews.sideReview.noGoals')}</p>
            )}
            {review.overallNotes ? (
              <p className="mt-2 mb-0 text-xs text-ink-muted">{review.overallNotes}</p>
            ) : null}
          </>
        ) : (
          <p className="m-0 text-xs text-ink-faint">{t(locale, 'panel.dossier.performanceEmpty')}</p>
        )}
      </section>

      <section className={cn(S.cardTight, 'bg-white/70')}>
        <h4 className={cn(S.label, 'mb-2')}>{t(locale, 'performanceReviews.sideReview.sectionTitle')}</h4>
        {sideReviews.length === 0 ? (
          <p className="m-0 text-xs text-ink-faint">{t(locale, 'performanceReviews.sideReview.empty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {sideReviews.map((sr) => {
              const roleLabel =
                sr.role === 'self'
                  ? t(locale, 'performanceReviews.sideReview.roleSelf')
                  : t(locale, 'performanceReviews.sideReview.rolePeer');
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const url = sr.publicPath ? `${origin}${sr.publicPath}` : '';
              return (
                <li key={sr.id} className="rounded-md border border-ink/10 px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-ink">
                      {roleLabel}
                      {sr.reviewerLabel ? ` · ${sr.reviewerLabel}` : ''}
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted">{sr.status}</span>
                    {sr.status === 'pending' && url ? (
                      <CopyableLink url={url} locale={locale} iconOnly compact label={roleLabel} />
                    ) : null}
                  </div>
                  {sr.status === 'submitted' && goals.length > 0 ? (
                    <ul className="mt-1.5 m-0 flex list-none flex-col gap-1 p-0">
                      {goals.map((g) => {
                        const o = sr.outcomes?.[String(g.id)];
                        if (!o?.outcome) return null;
                        return (
                          <li key={`${sr.id}-${g.id}`} className="text-[11px] text-ink-muted">
                            {g.title}: {outcomeLabel(locale, o.outcome)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </ContentEnter>
  );
}
