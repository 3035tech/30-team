'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { RichTextView } from './RichTextView';
import { isRichTextEmpty } from '../../lib/sanitize-html';
import { EMPLOYMENT_STATUS } from '../../lib/domain-status.js';

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
    if (!candidateId || employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) {
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

  if (employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) return null;

  const complete = async (row, status) => {
    const fields = [
      {
        key: 'meetUrl',
        type: 'text',
        label: t(locale, 'panel.onboarding.meetUrlLabel'),
        placeholder: t(locale, 'panel.onboarding.meetUrlPh'),
        initialValue: row.meetUrl || '',
      },
      {
        key: 'outcome',
        type: 'select',
        label: t(locale, 'panel.onboarding.outcomeLabel'),
        required: status === 'done',
        help: t(locale, 'panel.onboarding.outcomeHelp'),
        options: [
          { value: 'continue', label: t(locale, 'panel.onboarding.outcome.continue') },
          { value: 'develop', label: t(locale, 'panel.onboarding.outcome.develop') },
          { value: 'concern', label: t(locale, 'panel.onboarding.outcome.concern') },
          { value: 'pass', label: t(locale, 'panel.onboarding.outcome.pass') },
          { value: 'fail', label: t(locale, 'panel.onboarding.outcome.fail') },
          { value: 'extend', label: t(locale, 'panel.onboarding.outcome.extend') },
        ],
      },
      {
        key: 'notes',
        type: 'richText',
        label: t(locale, 'panel.onboarding.notesLabel'),
        placeholder: t(locale, 'panel.onboarding.notesPh'),
        minHeight: 110,
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
            meetUrl: values.meetUrl,
            locale,
            seedPdi:
              values.outcome === 'develop' ||
              values.outcome === 'concern' ||
              values.outcome === 'fail' ||
              values.outcome === 'extend',
            seedRetention:
              values.outcome === 'concern' ||
              values.outcome === 'fail' ||
              values.outcome === 'extend',
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(
        data.pdiItem || data.retentionFollowUp
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

  const setMeetUrl = async (row) => {
    const values = await promptForm({
      title: t(locale, 'panel.onboarding.meetUrlTitle'),
      confirmLabel: t(locale, 'panel.onboarding.completeConfirm'),
      fields: [
        {
          key: 'meetUrl',
          type: 'text',
          label: t(locale, 'panel.onboarding.meetUrlLabel'),
          placeholder: t(locale, 'panel.onboarding.meetUrlPh'),
          initialValue: row.meetUrl || '',
        },
      ],
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
            action: 'setMeetUrl',
            checkinId: row.id,
            meetUrl: values.meetUrl,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'panel.onboarding.saved'), 'ok');
      await load();
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
        <ContentEnter className="mt-3">
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
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
                      <span className="ml-1.5 font-mono text-2xs text-warning">
                        {t(locale, 'panel.onboarding.overdue')}
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-2xs text-ink-muted">
                    {t(locale, 'panel.onboarding.due', { date: row.dueDate || '—' })}
                    {done && row.outcome
                      ? ` · ${t(locale, `panel.onboarding.outcome.${row.outcome}`)}`
                      : ''}
                    {done ? ` · ${t(locale, `panel.onboarding.status.${row.status}`)}` : ''}
                    {row.employeeAckAt ? (
                      <span className="ml-1 text-success">
                        · {t(locale, 'panel.onboarding.employeeAcked')}
                      </span>
                    ) : null}
                  </div>
                  {row.meetUrl ? (
                    <a
                      href={row.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex font-mono text-2xs text-brand-600"
                    >
                      {t(locale, 'panel.onboarding.openMeet')}
                    </a>
                  ) : null}
                  {done && !isRichTextEmpty(row.notes) ? (
                    <div className="mt-1.5 text-xs text-ink-muted">
                      <RichTextView html={row.notes} className="text-xs leading-snug text-ink-muted" />
                    </div>
                  ) : null}
                </div>
                {!done ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      className={S.btnGhost}
                      onClick={() => setMeetUrl(row)}
                    >
                      {t(locale, 'panel.onboarding.meetUrlBtn')}
                    </button>
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
        </ContentEnter>
      )}
    </section>
  );
}
