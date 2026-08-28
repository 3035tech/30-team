'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { EMPLOYMENT_STATUS } from '../../lib/domain-status.js';
import { S } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading } from './AppLoading';
import { useAppFeedback } from './AppFeedback';

const CALL_KEYS = new Set(['rh_onboarding_call', 'manager_onboarding']);

/**
 * Pre-onboarding checklist (accesses / D1) — B-702.
 */
export function PreOnboardingChecklistBlock({ locale, candidateId, employmentStatus }) {
  const { toast, promptForm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId || employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/pre-onboarding`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.preOnboarding.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, employmentStatus, locale, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) return null;

  const completeFields = (row, status) => {
    const fields = [
      {
        key: 'notes',
        type: 'textarea',
        label: t(locale, 'panel.preOnboarding.notesLabel'),
        placeholder: t(locale, 'panel.preOnboarding.notesPh'),
      },
    ];
    if (CALL_KEYS.has(row.itemKey)) {
      fields.unshift({
        key: 'meetUrl',
        type: 'text',
        label: t(locale, 'panel.preOnboarding.meetUrlLabel'),
        placeholder: t(locale, 'panel.preOnboarding.meetUrlPh'),
        initialValue: row.meetUrl || '',
      });
    }
    return fields;
  };

  const complete = async (row, status) => {
    const values = await promptForm({
      title: t(locale, `panel.preOnboarding.item.${row.itemKey}`),
      confirmLabel: t(locale, 'panel.preOnboarding.completeConfirm'),
      fields: completeFields(row, status),
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/pre-onboarding`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: row.id,
            status,
            notes: values.notes || '',
            meetUrl: values.meetUrl,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'panel.preOnboarding.saved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.preOnboarding.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const setMeetUrl = async (row) => {
    const values = await promptForm({
      title: t(locale, 'panel.preOnboarding.meetUrlTitle'),
      confirmLabel: t(locale, 'panel.preOnboarding.completeConfirm'),
      fields: [
        {
          key: 'meetUrl',
          type: 'text',
          label: t(locale, 'panel.preOnboarding.meetUrlLabel'),
          placeholder: t(locale, 'panel.preOnboarding.meetUrlPh'),
          initialValue: row.meetUrl || '',
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/pre-onboarding`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'setMeetUrl',
            itemId: row.id,
            meetUrl: values.meetUrl,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'panel.preOnboarding.saved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.preOnboarding.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doneCount = items.filter((i) => i.status === 'done' || i.status === 'skipped').length;

  return (
    <section className={cn(S.cardTight, 'mt-3')} aria-label={t(locale, 'panel.preOnboarding.sectionAria')}>
      <h3 className={cn(S.label, 'mb-0')}>{t(locale, 'panel.preOnboarding.title')}</h3>
      <p className={cn(S.muted, 'm-0 mt-1 text-xs')}>{t(locale, 'panel.preOnboarding.hint')}</p>
      {items.length > 0 ? (
        <p className={cn(S.faint, 'm-0 mt-1 font-mono text-[10px]')}>
          {t(locale, 'panel.preOnboarding.progress', { done: doneCount, total: items.length })}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-3">
          <AppLoading variant="inline" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={t(locale, 'panel.preOnboarding.emptyTitle')}
            message={t(locale, 'panel.preOnboarding.emptyHint')}
          />
        </div>
      ) : (
        <ul className="mt-3 m-0 flex list-none flex-col gap-1.5 p-0">
          {items.map((row) => {
            const done = row.status === 'done' || row.status === 'skipped';
            const isCall = CALL_KEYS.has(row.itemKey);
            return (
              <li
                key={row.id}
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2',
                  row.overdue ? 'border-warning/30 bg-warning/[0.05]' : 'border-ink/10 bg-white/60'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">
                    {t(locale, `panel.preOnboarding.item.${row.itemKey}`)}
                    {row.overdue ? (
                      <span className="ml-1.5 font-mono text-[10px] text-warning">
                        {t(locale, 'panel.preOnboarding.overdue')}
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-[10px] text-ink-muted">
                    {t(locale, 'panel.preOnboarding.due', { date: row.dueDate || '—' })}
                    {done ? ` · ${t(locale, `panel.preOnboarding.status.${row.status}`)}` : ''}
                    {row.employeeAckAt ? (
                      <span className="ml-1 text-success">
                        · {t(locale, 'panel.preOnboarding.employeeAcked')}
                      </span>
                    ) : null}
                  </div>
                  {row.meetUrl ? (
                    <a
                      href={row.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex font-mono text-[10px] text-brand-600"
                    >
                      {t(locale, 'panel.preOnboarding.openMeet')}
                    </a>
                  ) : null}
                </div>
                {!done ? (
                  <div className="flex flex-wrap gap-1.5">
                    {isCall ? (
                      <button
                        type="button"
                        disabled={busy}
                        className={S.btnGhost}
                        onClick={() => setMeetUrl(row)}
                      >
                        {t(locale, 'panel.preOnboarding.meetUrlBtn')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      className={S.btnBrandSoft}
                      onClick={() => complete(row, 'done')}
                    >
                      {t(locale, 'panel.preOnboarding.markDone')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={S.btnGhost}
                      onClick={() => complete(row, 'skipped')}
                    >
                      {t(locale, 'panel.preOnboarding.skip')}
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
