'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading } from '../../_components/AppLoading';
import { useAppFeedback } from '../../_components/AppFeedback';

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
    return meta.questions.every((q) => {
      const n = Number(answers[q.id]);
      return Number.isFinite(n) && n >= q.scaleMin && n <= q.scaleMax;
    });
  }, [meta, answers]);

  const submit = async () => {
    if (!allAnswered || busy) return;
    setBusy(true);
    try {
      const payload = {};
      for (const [k, v] of Object.entries(answers)) payload[k] = Number(v);
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
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="m-0 font-display text-2xl text-ink">{t(locale, 'panel.climate.publicThanks')}</h1>
        <p className={cn(S.muted, 'mt-2')}>{t(locale, 'panel.climate.publicAnonymous')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="m-0 font-display text-2xl text-ink">{meta?.title}</h1>
      {meta?.description ? <p className={cn(S.muted, 'mt-2 text-sm')}>{meta.description}</p> : null}
      <p className={cn(S.faint, 'mt-2 text-xs')}>{t(locale, 'panel.climate.publicAnonymous')}</p>
      <ol className="mt-6 flex list-none flex-col gap-5 p-0">
        {(meta?.questions || []).map((q, idx) => (
          <li key={q.id} className="rounded-card border border-ink/12 bg-canvas/60 p-4">
            <div className="mb-3 text-sm text-ink">
              <span className="font-mono text-[11px] text-ink-faint">{idx + 1}. </span>
              {q.prompt}
            </div>
            <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label={q.prompt}>
              {Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, i) => q.scaleMin + i).map((n) => {
                const on = Number(answers[q.id]) === n;
                return (
                  <button
                    key={n}
                    type="button"
                    className={cn(
                      'min-h-touch min-w-[40px] rounded-control border px-3 font-mono text-sm',
                      on
                        ? 'border-brand-500/40 bg-brand-500/10 text-brand-700'
                        : 'border-ink/12 bg-transparent text-ink-muted'
                    )}
                    aria-pressed={on}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: n }))}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={!allAnswered || busy}
        onClick={submit}
        className={cn(S.btnPrimary, 'mt-6 min-h-touch w-full')}
      >
        {busy ? t(locale, 'panel.climate.publicSending') : t(locale, 'panel.climate.publicSubmit')}
      </button>
    </div>
  );
}
