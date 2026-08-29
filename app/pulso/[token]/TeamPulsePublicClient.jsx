'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { useAppFeedback } from '../../_components/AppFeedback';

export default function TeamPulsePublicClient({ token, locale = 'pt-BR' }) {
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
        const res = await fetch(`/api/public/team-pulse/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data?.error || t(locale, 'panel.pulse.publicUnavailable'));
          return;
        }
        if (!cancelled) {
          setMeta(data);
          const init = {};
          for (const q of data.questions || []) init[q.id] = '';
          setAnswers(init);
        }
      } catch {
        if (!cancelled) setError(t(locale, 'panel.pulse.publicUnavailable'));
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
      return Number.isFinite(n) && n >= (q.scaleMin || 1) && n <= (q.scaleMax || 5);
    });
  }, [meta, answers]);

  const submit = async () => {
    if (!allAnswered || busy) return;
    setBusy(true);
    try {
      const payload = {};
      for (const [k, v] of Object.entries(answers)) payload[k] = Number(v);
      const res = await fetch(`/api/public/team-pulse/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'submit');
      setDone(true);
      toast(t(locale, 'panel.pulse.publicThanks'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.pulse.publicError'), 'error');
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
        <h1 className="m-0 font-display text-2xl text-ink">{t(locale, 'panel.pulse.publicThanks')}</h1>
        <p className={cn(S.muted, 'mt-2')}>{t(locale, 'panel.pulse.publicAnonymous')}</p>
      </div>
    );
  }

  return (
    <ContentEnter animKey="form">
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="m-0 font-display text-2xl text-ink">{meta?.title}</h1>
      <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'panel.pulse.publicAnonymous')}</p>
      <ul className="mt-6 flex list-none flex-col gap-4 p-0">
        {(meta?.questions || []).map((q) => (
          <li key={q.id} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
            <p className="m-0 mb-2 text-sm text-ink">{q.prompt}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from(
                { length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 },
                (_, i) => (q.scaleMin || 1) + i
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn(
                    S.btnGhost,
                    'min-h-touch min-w-touch',
                    Number(answers[q.id]) === n && 'border-brand-500 bg-brand-500/10 text-brand-700'
                  )}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!allAnswered || busy}
        onClick={submit}
        className={cn(S.btnPrimary, 'mt-6 min-h-touch')}
      >
        {busy ? t(locale, 'panel.pulse.publicSending') : t(locale, 'panel.pulse.publicSubmit')}
      </button>
    </div>
    </ContentEnter>
  );
}
