'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';

/**
 * Clima / pulso autenticados — B-2501.
 */
export function EmployeeSurveysSection({ locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/surveys?locale=${encodeURIComponent(locale)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'load');
      setInbox(json);
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.surveysLoadError'), 'error');
      setInbox(null);
    } finally {
      setLoading(false);
    }
  }, [locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!active?.token || !active?.kind) return;
    setBusy(true);
    try {
      const res = await fetch('/api/employee/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: active.kind,
          token: active.token,
          answers: answers[active.key] || {},
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.errorCode || json?.error || 'submit');
      toast(t(locale, 'employeeHome.surveysSubmitted'), 'ok');
      setActive(null);
      setAnswers({});
      await load();
    } catch (e) {
      toast(t(locale, 'employeeHome.surveysSubmitError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="inline" />;

  const open = [
    ...(inbox?.openClimate || []).map((s) => ({ ...s, kind: 'climate', key: `c-${s.surveyId}` })),
    ...(inbox?.openPulse || []).map((s) => ({ ...s, kind: 'pulse', key: `p-${s.pulseId}` })),
  ];
  const history = inbox?.history || [];

  if (!open.length && !history.length) {
    return (
      <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'employeeHome.surveysEmpty')}</p>
    );
  }

  return (
    <div className="space-y-4">
      {open.length > 0 ? (
        <div>
          <p className={cn(S.muted, 'm-0 mb-2 text-xs')}>{t(locale, 'employeeHome.surveysOpenHint')}</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {open.map((item) => (
              <li key={item.key} className="rounded-control border border-ink/12 bg-canvas/50 px-3 py-2.5">
                <div className="text-sm text-ink">{item.title}</div>
                <div className="mt-1 font-mono text-2xs uppercase text-ink-faint">
                  {item.kind === 'climate'
                    ? t(locale, 'employeeHome.surveyKindClimate')
                    : t(locale, 'employeeHome.surveyKindPulse')}
                </div>
                <button
                  type="button"
                  className={cn(S.btnBrandSoft, 'mt-2 min-h-touch text-2xs')}
                  onClick={() => setActive(item)}
                >
                  {t(locale, 'employeeHome.surveysAnswer')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {active ? (
        <div className="rounded-control border border-brand-500/25 bg-brand-500/[0.04] p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="font-ui text-sm text-ink">{active.title}</div>
              <p className={cn(S.muted, 'm-0 mt-1 text-xs')}>{t(locale, 'employeeHome.surveysAnonymousHint')}</p>
            </div>
            <button
              type="button"
              className={cn(S.btnGhost, 'min-h-touch shrink-0 text-2xs')}
              onClick={() => setActive(null)}
            >
              {t(locale, 'panel.common.cancel')}
            </button>
          </div>
          <div className="space-y-3">
            {(active.questions || []).map((q) => (
              <label key={q.id} className="block text-xs text-ink">
                <span className="text-ink-muted">{q.prompt}</span>
                {q.questionKind === 'text' ? (
                  <textarea
                    className={cn(S.input, 'mt-1 min-h-[72px] w-full text-xs')}
                    maxLength={1500}
                    value={answers[active.key]?.[q.id] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [active.key]: { ...(prev[active.key] || {}), [q.id]: e.target.value },
                      }))
                    }
                  />
                ) : (
                  <input
                    type="range"
                    min={q.scaleMin ?? 1}
                    max={q.scaleMax ?? 5}
                    className="mt-2 w-full"
                    value={answers[active.key]?.[q.id] ?? q.scaleMin ?? 1}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [active.key]: { ...(prev[active.key] || {}), [q.id]: Number(e.target.value) },
                      }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            className={cn(S.btnPrimary, 'mt-3 min-h-touch w-full sm:w-auto')}
            onClick={submit}
          >
            {t(locale, 'employeeHome.surveysSubmit')}
          </button>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div>
          <h3 className={cn(S.faint, 'mb-2 mt-0 text-2xs uppercase tracking-wide')}>
            {t(locale, 'employeeHome.surveysHistory')}
          </h3>
          <ul className="m-0 list-none space-y-1.5 p-0 text-xs text-ink-muted">
            {history.slice(0, 8).map((h, i) => (
              <li key={`${h.kind}-${h.title}-${i}`}>
                ✓ {h.title}
                {h.submittedAt ? (
                  <span className="ml-1 font-mono text-2xs text-ink-faint">
                    {String(h.submittedAt).slice(0, 10)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
