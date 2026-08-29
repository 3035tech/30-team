'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { ScaleRatingButtons } from '../../_components/ScaleRatingButtons';

function isTextQuestion(q) {
  return String(q?.questionKind || '').toLowerCase() === 'text';
}

function isEnpsQuestion(q) {
  return String(q?.questionKind || '').toLowerCase() === 'enps';
}

function isAnswerComplete(q, value) {
  if (isTextQuestion(q)) {
    const text = String(value ?? '').trim();
    return text.length >= 5;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= q.scaleMin && n <= q.scaleMax;
}

/**
 * Public anonymous climate survey — /clima/[token]
 */
export default function ClimatePublicClient({ token, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/climate/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data?.error || t(locale, 'panel.climate.publicUnavailable'));
          return;
        }
        if (!cancelled) {
          setMeta(data);
          const init = {};
          for (const q of data.questions || []) init[q.id] = '';
          setAnswers(init);
        }
      } catch {
        if (!cancelled) setError(t(locale, 'panel.climate.publicUnavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const allAnswered = useMemo(() => {
    if (!meta?.questions?.length) return false;
    return meta.questions.every((q) => isAnswerComplete(q, answers[q.id]));
  }, [meta, answers]);

  const submit = async () => {
    if (!allAnswered || busy) return;
    setBusy(true);
    try {
      const payload = {};
      for (const q of meta.questions || []) {
        if (isTextQuestion(q)) {
          payload[q.id] = String(answers[q.id] ?? '').trim();
        } else {
          payload[q.id] = Number(answers[q.id]);
        }
      }
      const res = await fetch(`/api/public/climate/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'submit');
      setDone(true);
      toast(t(locale, 'panel.climate.publicThanks'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.climate.publicError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PublicNarrowShell variant="loading" locale={locale} />;
  }
  if (error) {
    return (
      <PublicNarrowShell variant="error" locale={locale} className="text-center">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
      </PublicNarrowShell>
    );
  }
  if (done) {
    return (
      <PublicNarrowShell
        variant="done"
        locale={locale}
        title={t(locale, 'panel.climate.publicThanks')}
        className="text-center"
      >
        <p className={cn(S.muted, 'mt-2')}>{t(locale, 'panel.climate.publicAnonymous')}</p>
      </PublicNarrowShell>
    );
  }

  return (
    <PublicNarrowShell variant="form" locale={locale} title={meta?.title}>
      {meta?.description ? <p className={cn(S.muted, 'mt-2 text-sm')}>{meta.description}</p> : null}
      <p className={cn(S.faint, 'mt-2 text-xs')}>{t(locale, 'panel.climate.publicAnonymous')}</p>
      <ol className="mt-6 flex list-none flex-col gap-5 p-0">
        {(meta?.questions || []).map((q, idx) => {
          const textQ = isTextQuestion(q);
          return (
            <li key={q.id} className="rounded-card border border-ink/12 bg-canvas/60 p-4">
              <div className="mb-3 text-sm text-ink">
                <span className="font-mono text-2xs text-ink-faint">{idx + 1}. </span>
                {q.prompt}
                {textQ ? (
                  <span className="mt-1 block font-mono text-2xs text-ink-faint">
                    {t(locale, 'panel.climate.publicTextHint')}
                  </span>
                ) : isEnpsQuestion(q) ? (
                  <span className="mt-1 block font-mono text-2xs text-ink-faint">
                    {t(locale, 'panel.climate.publicEnpsHint')}
                  </span>
                ) : null}
              </div>
              {textQ ? (
                <textarea
                  className={cn(S.input, 'min-h-[96px] w-full resize-y')}
                  value={answers[q.id] ?? ''}
                  maxLength={1500}
                  rows={4}
                  aria-label={q.prompt}
                  placeholder={t(locale, 'panel.climate.publicTextPh')}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              ) : (
                <ScaleRatingButtons
                  min={q.scaleMin}
                  max={q.scaleMax}
                  value={answers[q.id]}
                  ariaLabel={q.prompt}
                  className="justify-center"
                  onChange={(n) => setAnswers((prev) => ({ ...prev, [q.id]: n }))}
                />
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={!allAnswered || busy}
        onClick={submit}
        className={cn(S.btnPrimary, 'mt-6 min-h-touch w-full')}
      >
        {busy ? t(locale, 'panel.climate.publicSending') : t(locale, 'panel.climate.publicSubmit')}
      </button>
    </PublicNarrowShell>
  );
}
