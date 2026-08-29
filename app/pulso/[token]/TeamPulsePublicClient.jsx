'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { ScaleRatingButtons } from '../../_components/ScaleRatingButtons';

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
        title={t(locale, 'panel.pulse.publicThanks')}
        className="text-center"
      >
        <p className={cn(S.muted, 'mt-2')}>{t(locale, 'panel.pulse.publicAnonymous')}</p>
      </PublicNarrowShell>
    );
  }

  return (
    <PublicNarrowShell variant="form" locale={locale} title={meta?.title}>
      <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'panel.pulse.publicAnonymous')}</p>
      <ul className="mt-6 flex list-none flex-col gap-4 p-0">
        {(meta?.questions || []).map((q) => (
          <li key={q.id} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
            <p className="m-0 mb-2 text-sm text-ink">{q.prompt}</p>
            <ScaleRatingButtons
              min={q.scaleMin || 1}
              max={q.scaleMax || 5}
              value={answers[q.id]}
              ariaLabel={q.prompt}
              className="justify-center"
              onChange={(n) => setAnswers((prev) => ({ ...prev, [q.id]: n }))}
            />
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
    </PublicNarrowShell>
  );
}
