'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading } from '../../_components/AppLoading';
import { RichTextView } from '../../_components/RichTextView';

export default function EmployeePortalClient({ token, locale = 'pt-BR' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/public/employee-portal/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json?.error || t(locale, 'panel.employeePortal.unavailable'));
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(t(locale, 'panel.employeePortal.unavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  if (loading) return <AppLoading variant="panel" />;
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className={cn(S.faint, 'm-0 text-[11px] uppercase tracking-wide')}>
        {t(locale, 'panel.employeePortal.eyebrow')}
      </p>
      <h1 className="m-0 mt-1 font-display text-2xl text-ink">
        {t(locale, 'panel.employeePortal.hello', { name: data?.personName || '' })}
      </h1>
      <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'panel.employeePortal.hint')}</p>

      <section className="mt-8">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.pdiTitle')}</h2>
        {(data?.plans || []).length === 0 ? (
          <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'panel.employeePortal.pdiEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {data.plans.map((p) => (
              <li key={p.id} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                <div className="font-ui text-sm text-ink">{p.title}</div>
                {p.objective ? <p className={cn(S.muted, 'mt-1 text-xs')}>{p.objective}</p> : null}
                <ul className="mt-2 m-0 list-none space-y-1 p-0">
                  {(p.items || []).map((it) => (
                    <li key={it.id} className="text-xs text-ink-muted">
                      {it.status === 'done' ? '✓ ' : '○ '}
                      {it.title}
                      {it.dueDate ? ` · ${String(it.dueDate).slice(0, 10)}` : ''}
                      {it.ownerLabel ? ` · ${it.ownerLabel}` : ''}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.agreementsTitle')}</h2>
        {(data?.recentAgreements || []).length === 0 ? (
          <p className={cn(S.faint, 'm-0 text-xs italic')}>
            {t(locale, 'panel.employeePortal.agreementsEmpty')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {data.recentAgreements.map((a) => (
              <li key={a.id} className="rounded-control border border-ink/12 bg-white/40 px-3 py-2">
                <div className="font-mono text-[11px] text-ink-faint">
                  {a.meetingDate ? String(a.meetingDate).slice(0, 10) : '—'}
                </div>
                <RichTextView html={a.nextSteps} className="mt-1 text-xs text-ink-muted" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data?.oneOnOnePrompts || []).length > 0 ? (
        <section className="mt-8">
          <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.prepTitle')}</h2>
          <p className={cn(S.muted, 'mb-2 text-xs')}>{t(locale, 'panel.employeePortal.prepHint')}</p>
          <ol className="m-0 pl-[18px]">
            {data.oneOnOnePrompts.map((q) => (
              <li key={q} className="mb-1 text-[13px] leading-[1.55] text-ink">
                {q}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
