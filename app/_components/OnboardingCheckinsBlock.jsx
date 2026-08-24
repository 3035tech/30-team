'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading } from './AppLoading';
import { useAppFeedback } from './AppFeedback';

/**
 * Post-hire check-ins D30/D60/D90 — B-701 (light, not AVD).
 */
export function OnboardingCheckinsBlock({
  locale,
  candidateId,
  employmentStatus,
  onPdiChanged,
}) {
  const { toast, promptForm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId || employmentStatus !== 'employee') {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/onboarding-checkins`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.onboarding.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, employmentStatus, locale, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (employmentStatus !== 'employee') return null;

  const complete = async (row, status) => {
    const fields = [
      {
        key: 'outcome',
        type: 'select',
        label: t(locale, 'panel.onboarding.outcomeLabel'),
        required: status === 'done',
        options: [
          { value: 'continue', label: t(locale, 'panel.onboarding.outcome.continue') },
          { value: 'develop', label: t(locale, 'panel.onboarding.outcome.develop') },
          { value: 'concern', label: t(locale, 'panel.onboarding.outcome.concern') },
        ],
      },
      {
        key: 'notes',
        type: 'textarea',
        label: t(locale, 'panel.onboarding.notesLabel'),
        placeholder: t(locale, 'panel.onboarding.notesPh'),
      },
    ];
    const values = await promptForm({
      title: t(locale, 'panel.onboarding.completeTitle', { days: row.milestoneDays }),
      confirmLabel: t(locale, 'panel.onboarding.completeConfirm'),
      fields,
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/onboarding-checkins`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkinId: row.id,
            status,
            outcome: values.outcome || '',
            notes: values.notes || '',
            locale,
            seedPdi: values.outcome === 'develop' || values.outcome === 'concern',
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(
        data.pdiItem
          ? t(locale, 'panel.onboarding.savedWithPdi')
          : t(locale, 'panel.onboarding.saved'),
        'ok'
      );
      await load();
      if (data.pdiItem && typeof onPdiChanged === 'function') onPdiChanged();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.onboarding.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(S.cardTight, 'mt-3')} aria-label={t(locale, 'panel.onboarding.sectionAria')}>
      <h3 className={cn(S.label, 'mb-0')}>{t(locale, 'panel.onboarding.title')}</h3>
      <p className={cn(S.muted, 'm-0 mt-1 text-xs')}>{t(locale, 'panel.onboarding.hint')}</p>

      {loading ? (
        <div className="mt-3">
          <AppLoading variant="inline" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={t(locale, 'panel.onboarding.emptyTitle')}
            message={t(locale, 'panel.onboarding.emptyHint')}
          />
        </div>
      ) : (
        <ul className="mt-3 m-0 flex list-none flex-col gap-1.5 p-0">
          {items.map((row) => {
            const done = row.status === 'done' || row.status === 'skipped';
            return (
              <li
                key={row.id}
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2',
                  row.overdue
                    ? 'border-warning/30 bg-warning/[0.05]'
                    : 'border-ink/10 bg-white/60'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">
                    {t(locale, 'panel.onboarding.milestone', { days: row.milestoneDays })}
                    {row.overdue ? (
                      <span className="ml-1.5 font-mono text-[10px] text-warning">
                        {t(locale, 'panel.onboarding.overdue')}
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-[10px] text-ink-muted">
                    {t(locale, 'panel.onboarding.due', { date: row.dueDate || '—' })}
                    {done && row.outcome
                      ? ` · ${t(locale, `panel.onboarding.outcome.${row.outcome}`)}`
                      : ''}
                    {done ? ` · ${t(locale, `panel.onboarding.status.${row.status}`)}` : ''}
                  </div>
                </div>
                {!done ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      className={S.btnBrandSoft}
                      onClick={() => complete(row, 'done')}
                    >
                      {t(locale, 'panel.onboarding.markDone')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={S.btnGhost}
                      onClick={() => complete(row, 'skipped')}
                    >
                      {t(locale, 'panel.onboarding.skip')}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
