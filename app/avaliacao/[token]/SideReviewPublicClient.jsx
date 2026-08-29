'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { useAppFeedback } from '../../_components/AppFeedback';

const OUTCOMES = ['met', 'exceeded', 'develop', 'not_met'];
const OUTCOME_I18N = {
  met: 'outcomeMet',
  exceeded: 'outcomeExceeded',
  develop: 'outcomeDevelop',
  not_met: 'outcomeNotMet',
};

/**
 * Public side review form — /avaliacao/[token] (B-2704).
 */
export default function SideReviewPublicClient({ token, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const [overallNotes, setOverallNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/performance-review/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data?.error || t(locale, 'performanceReviews.sideReview.publicUnavailable'));
          return;
        }
        if (!cancelled) {
          setMeta(data);
          const init = {};
          for (const g of data.goals || []) {
            init[String(g.id)] = { outcome: '', notes: '' };
          }
          setOutcomes(init);
        }
      } catch {
        if (!cancelled) setError(t(locale, 'performanceReviews.sideReview.publicUnavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const canSubmit = useMemo(() => {
    if (!meta?.goals?.length) return false;
    return meta.goals.every((g) => {
      const row = outcomes[String(g.id)];
      return row && OUTCOMES.includes(String(row.outcome));
    });
  }, [meta, outcomes]);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/public/performance-review/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomes, overallNotes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'submit');
      setDone(true);
      toast(t(locale, 'performanceReviews.sideReview.publicThanks'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'performanceReviews.sideReview.publicError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="panel" />;
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
      </div>
    );
  }
  if (done) {
    return (
      <ContentEnter className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-ink">{t(locale, 'performanceReviews.sideReview.publicDoneTitle')}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t(locale, 'performanceReviews.sideReview.publicThanks')}</p>
      </ContentEnter>
    );
  }

  const roleLabel =
    meta?.role === 'self'
      ? t(locale, 'performanceReviews.sideReview.roleSelf')
      : t(locale, 'performanceReviews.sideReview.rolePeer');

  return (
    <ContentEnter className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {roleLabel}
          {meta?.reviewerLabel ? ` · ${meta.reviewerLabel}` : ''}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{meta?.cycleTitle || '—'}</h1>
        {meta?.candidateName ? (
          <p className="mt-1 text-sm text-ink-muted">
            {t(locale, 'performanceReviews.sideReview.aboutCandidate', { name: meta.candidateName })}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-ink-muted">{t(locale, 'performanceReviews.sideReview.publicHint')}</p>
      </header>

      {!meta?.goals?.length ? (
        <p className="text-sm text-ink-muted">{t(locale, 'performanceReviews.sideReview.noGoals')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {meta.goals.map((goal) => {
            const gid = String(goal.id);
            const row = outcomes[gid] || { outcome: '', notes: '' };
            return (
              <li key={gid} className={cn(S.cardTight, 'flex flex-col gap-2')}>
                <div>
                  <p className="m-0 text-sm font-medium text-ink">{goal.title}</p>
                  {goal.description ? (
                    <p className="mt-1 mb-0 text-xs text-ink-muted">{goal.description}</p>
                  ) : null}
                </div>
                <label className="flex flex-col gap-1">
                  <span className={S.label}>{t(locale, 'performanceReviews.outcomeLabel')}</span>
                  <select
                    className={S.select}
                    value={row.outcome}
                    onChange={(e) =>
                      setOutcomes((prev) => ({
                        ...prev,
                        [gid]: { ...prev[gid], outcome: e.target.value },
                      }))
                    }
                  >
                    <option value="">{t(locale, 'performanceReviews.sideReview.pickOutcome')}</option>
                    {OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {t(locale, `performanceReviews.${OUTCOME_I18N[o]}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={S.label}>{t(locale, 'performanceReviews.sideReview.goalNotes')}</span>
                  <textarea
                    className={cn(S.input, 'min-h-[72px] resize-y')}
                    value={row.notes || ''}
                    placeholder={t(locale, 'performanceReviews.outcomeNotesPlaceholder')}
                    onChange={(e) =>
                      setOutcomes((prev) => ({
                        ...prev,
                        [gid]: { ...prev[gid], notes: e.target.value },
                      }))
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-6 flex flex-col gap-1">
        <span className={S.label}>{t(locale, 'performanceReviews.overallNotes')}</span>
        <textarea
          className={cn(S.input, 'min-h-[96px] resize-y')}
          value={overallNotes}
          placeholder={t(locale, 'performanceReviews.overallNotesPlaceholder')}
          onChange={(e) => setOverallNotes(e.target.value)}
        />
      </label>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className={S.btnPrimary}
          disabled={!canSubmit || busy}
          onClick={submit}
        >
          {t(locale, 'performanceReviews.sideReview.publicSubmit')}
        </button>
      </div>
    </ContentEnter>
  );
}
