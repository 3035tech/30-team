'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { S } from '../dashboard-shared';
import { FormField } from '../../_components/FormField';
import { useAppFeedback } from '../../_components/AppFeedback';

/**
 * Light interview scorecard (B-407) — ratings 1–5 vs briefing questions.
 */
export function InterviewScorecardBlock({ vacancyId, candidateId, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!vacancyId || !candidateId) return;
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateId)}/scorecard`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setItems(Array.isArray(data.scorecard?.items) ? data.scorecard.items : []);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  }, [vacancyId, candidateId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const setRating = (idx, rating) => {
    setItems((cur) =>
      cur.map((row, i) => (i === idx ? { ...row, rating: Number(rating) } : row))
    );
  };

  const setComment = (idx, comment) => {
    setItems((cur) => cur.map((row, i) => (i === idx ? { ...row, comment } : row)));
  };

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateId)}/scorecard`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setItems(Array.isArray(data.scorecard?.items) ? data.scorecard.items : items);
      toast(t(locale, 'recruiting.scorecardSaved'), 'ok');
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      toast(e?.message || t(locale, 'panel.common.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="m-0 text-xs text-ink-muted">{t(locale, 'panel.common.loading')}</p>;
  }

  if (!items.length) {
    return (
      <p className="m-0 text-xs text-ink-muted">{t(locale, 'recruiting.scorecardEmpty')}</p>
    );
  }

  return (
    <div className="mb-4 rounded-control border border-ink/12 bg-ink/[0.02] p-3">
      <span className={cn(S.label, 'mb-1 block')}>{t(locale, 'recruiting.scorecardTitle')}</span>
      <p className="mb-3 mt-0 text-2xs leading-snug text-ink-muted">
        {t(locale, 'recruiting.scorecardHint')}
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((row, idx) => (
          <li key={row.questionId || idx} className="border-t border-ink/10 pt-2.5 first:border-0 first:pt-0">
            <p className="mb-1.5 mt-0 text-prose leading-snug text-ink">{row.text}</p>
            <div className="mb-1.5 flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(idx, n)}
                  className={cn(
                    'min-h-touch min-w-[40px] rounded-control border px-2 font-mono text-xs',
                    row.rating === n
                      ? 'border-brand-500/40 bg-brand-500/[0.12] text-brand-500'
                      : 'border-ink/12 bg-surface text-ink-muted'
                  )}
                  aria-label={t(locale, 'recruiting.scorecardRatingAria', { n })}
                >
                  {n}
                </button>
              ))}
            </div>
            <FormField label={t(locale, 'recruiting.scorecardCommentPh')}>
              <input
                value={row.comment || ''}
                onChange={(e) => setComment(idx, e.target.value)}
                className={cn(S.input, 'w-full bg-surface/90')}
                maxLength={2000}
              />
            </FormField>
          </li>
        ))}
      </ul>
      {err ? <p className="mb-0 mt-2 text-xs text-danger">{err}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className={cn(S.btnBrandSoft, 'mt-3', busy && 'opacity-60')}
      >
        {busy ? t(locale, 'panel.common.loading') : t(locale, 'recruiting.scorecardSave')}
      </button>
    </div>
  );
}
