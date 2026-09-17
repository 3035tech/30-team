'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { ScaleRatingButtons } from '../../_components/ScaleRatingButtons';
import { FormField } from '../../_components/FormField';
import { FORMAL_LIKERT_MAX, FORMAL_LIKERT_MIN, FORMAL_RATER_ROLE } from '../../../lib/domain-status';
import { useLocale } from '../../../lib/useLocale';

/**
 * Public formal competency rater — /formal-review/[token]
 */
export default function FormalReviewPublicClient({ token }) {
  const [locale] = useLocale('pt-BR');
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/formal-review/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setError(data?.error || t(locale, 'performanceReviews.formal.publicUnavailable'));
          }
          return;
        }
        if (!cancelled) {
          setMeta(data);
          const init = {};
          for (const item of data.items || []) init[item.id] = '';
          setScores(init);
        }
      } catch {
        if (!cancelled) setError(t(locale, 'performanceReviews.formal.publicUnavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const allAnswered = useMemo(() => {
    if (!meta?.items?.length) return false;
    return meta.items.every((item) => {
      const n = Number(scores[item.id]);
      return (
        Number.isFinite(n) &&
        n >= (meta.scaleMin || FORMAL_LIKERT_MIN) &&
        n <= (meta.scaleMax || FORMAL_LIKERT_MAX)
      );
    });
  }, [meta, scores]);

  const roleBanner = useMemo(() => {
    if (!meta?.role) return null;
    if (meta.role === FORMAL_RATER_ROLE.SELF) {
      return t(locale, 'performanceReviews.formal.publicRoleSelf');
    }
    if (meta.role === FORMAL_RATER_ROLE.UPWARD) {
      return t(locale, 'performanceReviews.formal.publicRoleUpward');
    }
    if (meta.role === FORMAL_RATER_ROLE.EXTERNAL) {
      return t(locale, 'performanceReviews.formal.publicRoleExternal');
    }
    return null;
  }, [meta, locale]);

  const submit = async () => {
    if (!allAnswered || busy) return;
    setBusy(true);
    try {
      const payload = {
        scores: (meta.items || []).map((item) => ({
          itemId: item.id,
          score: Number(scores[item.id]),
        })),
        overallNotes: notes,
      };
      const res = await fetch(`/api/public/formal-review/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data?.error || t(locale, 'performanceReviews.formal.publicError'), 'error');
        return;
      }
      setDone(true);
    } catch {
      toast(t(locale, 'performanceReviews.formal.publicError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PublicNarrowShell variant="loading" locale={locale} />;
  }

  if (error) {
    return (
      <PublicNarrowShell
        variant="error"
        locale={locale}
        title={t(locale, 'performanceReviews.formal.publicTitle')}
        className="text-center"
      >
        <p className={cn(S.muted, 'm-0')}>{error}</p>
      </PublicNarrowShell>
    );
  }

  if (done) {
    return (
      <PublicNarrowShell
        variant="done"
        locale={locale}
        title={t(locale, 'performanceReviews.formal.publicDoneTitle')}
      >
        <p className={cn(S.muted, 'mt-2 m-0')}>{t(locale, 'performanceReviews.formal.publicThanks')}</p>
      </PublicNarrowShell>
    );
  }

  return (
    <PublicNarrowShell
      variant="form"
      locale={locale}
      title={meta?.cycleTitle || t(locale, 'performanceReviews.formal.publicTitle')}
    >
      <div className={S.stack}>
        {roleBanner ? <p className="m-0 text-sm font-medium text-ink">{roleBanner}</p> : null}
        {meta?.subjectName && meta.role !== FORMAL_RATER_ROLE.UPWARD ? (
          <p className={cn(S.muted, 'm-0')}>
            {t(locale, 'performanceReviews.formal.publicAbout', { name: meta.subjectName })}
          </p>
        ) : null}
        <p className={cn(S.faint, 'm-0 text-xs')}>{t(locale, 'performanceReviews.formal.publicHint')}</p>
        {(meta?.items || []).map((item) => (
          <div key={item.id} className={S.stack}>
            <div className="text-sm font-medium text-ink">{item.label}</div>
            <ScaleRatingButtons
              min={meta.scaleMin || FORMAL_LIKERT_MIN}
              max={meta.scaleMax || FORMAL_LIKERT_MAX}
              value={scores[item.id]}
              onChange={(n) => setScores((prev) => ({ ...prev, [item.id]: n }))}
              ariaLabel={item.label}
            />
          </div>
        ))}
        <FormField label={t(locale, 'performanceReviews.formal.overallNotes')}>
          <textarea
            className={S.input}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>
        <button
          type="button"
          className={cn(S.btnPrimary, 'min-h-touch w-full')}
          disabled={!allAnswered || busy}
          onClick={submit}
        >
          {busy
            ? t(locale, 'performanceReviews.formal.publicSending')
            : t(locale, 'performanceReviews.formal.publicSubmit')}
        </button>
      </div>
    </PublicNarrowShell>
  );
}
