'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { S, AdminDeleteButton } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';
import { AppLoading, ContentEnter } from './AppLoading';
import { CopyableLink } from './CopyableLink';
import { CollapsibleBlock } from './CollapsibleBlock';

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(start) {
  const x = new Date(start);
  x.setDate(x.getDate() + 7);
  return x;
}

/**
 * B-2707 — Interview slots list + create for a vacancy week window.
 */
export function VacancyInterviewSlotsBlock({
  vacancyId,
  candidates = [],
  locale = 'pt-BR',
}) {
  const { promptForm, toast, notice } = useAppFeedback();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart]);

  const load = useCallback(async () => {
    if (!vacancyId) return;
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      });
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/interview-slots?${qs}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [vacancyId, weekStart, weekEnd, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const showError = async (message) => {
    await notice({
      title: t(locale, 'panel.common.errorTitle'),
      message: String(message || t(locale, 'panel.common.error')),
      tone: 'error',
    });
  };

  const shiftWeek = (delta) => {
    setWeekStart((prev) => {
      const n = new Date(prev);
      n.setDate(n.getDate() + delta * 7);
      return startOfWeek(n);
    });
  };

  const candidateOptions = useMemo(
    () =>
      (candidates || [])
        .filter((c) => c.candidateId)
        .map((c) => ({
          value: String(c.candidateId),
          label: c.fullName || c.name || c.email || `#${c.candidateId}`,
        })),
    [candidates]
  );

  const createSlot = async () => {
    if (!candidateOptions.length) {
      await showError(t(locale, 'recruiting.interviewSlotsNeedCandidate'));
      return;
    }
    const values = await promptForm({
      title: t(locale, 'recruiting.interviewSlotsCreateTitle'),
      fields: [
        {
          name: 'candidateId',
          type: 'select',
          label: t(locale, 'recruiting.interviewSlotsCandidate'),
          options: candidateOptions,
          required: true,
        },
        {
          name: 'startsAt',
          type: 'datetime-local',
          label: t(locale, 'recruiting.interviewSlotsStartsAt'),
          required: true,
        },
        {
          name: 'endsAt',
          type: 'datetime-local',
          label: t(locale, 'recruiting.interviewSlotsEndsAt'),
          required: false,
        },
        {
          name: 'meetUrl',
          type: 'text',
          label: t(locale, 'recruiting.interviewSlotsMeetUrl'),
          required: true,
          placeholder: 'https://meet.google.com/...',
        },
        {
          name: 'notes',
          type: 'text',
          label: t(locale, 'recruiting.interviewSlotsNotes'),
          required: false,
        },
      ],
      confirmLabel: t(locale, 'recruiting.interviewSlotsCreateConfirm'),
    });
    if (!values) return;

    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/interview-slots`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: Number(values.candidateId),
            startsAt: new Date(values.startsAt).toISOString(),
            endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
            meetUrl: values.meetUrl,
            notes: values.notes || '',
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.interviewSlotsCreateOk'));
      await load();
    } catch (e) {
      await showError(e?.message);
    }
  };

  const cancelSlot = async (slotId) => {
    setBusyId(slotId);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/interview-slots/${encodeURIComponent(slotId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.interviewSlotsCancelOk'));
      await load();
    } catch (e) {
      await showError(e?.message);
    } finally {
      setBusyId(null);
    }
  };

  const weekLabel = `${weekStart.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')}`;
  const scheduledCount = items.filter((s) => s.status === 'scheduled').length;

  return (
    <CollapsibleBlock
      key={loading ? 'slots-loading' : `slots-${scheduledCount}`}
      locale={locale}
      title={t(locale, 'recruiting.interviewSlotsTitle')}
      defaultOpen={loading || scheduledCount > 0}
      count={!loading ? scheduledCount : null}
      className="mb-3"
      bordered={false}
    >
    <div className={cn(S.cardTight, 'p-3.5')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={cn(S.label, 'mb-0')}>{t(locale, 'recruiting.interviewSlotsTitle')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => shiftWeek(-1)} className={cn(S.btnGhost, 'min-h-touch px-2')}>
            ←
          </button>
          <span className="font-mono text-2xs text-ink-muted">{weekLabel}</span>
          <button type="button" onClick={() => shiftWeek(1)} className={cn(S.btnGhost, 'min-h-touch px-2')}>
            →
          </button>
          <button type="button" onClick={createSlot} className={cn(S.btnPrimary, 'min-h-touch')}>
            {t(locale, 'recruiting.interviewSlotsCreate')}
          </button>
        </div>
      </div>
      <p className="mb-3 mt-0 text-xs leading-snug text-ink-muted">{t(locale, 'recruiting.interviewSlotsIntro')}</p>

      {loading ? <AppLoading locale={locale} variant="inline" /> : null}
      {err ? <p className="font-mono text-xs text-danger">{err}</p> : null}

      {!loading && !err ? (
        <ContentEnter>
          {items.length === 0 ? (
            <div className="space-y-2">
              <p className="m-0 text-xs italic text-ink-faint">{t(locale, 'recruiting.interviewSlotsEmpty')}</p>
              <p className="m-0 text-xs text-ink-muted">{t(locale, 'recruiting.interviewSlotsEmptyHint')}</p>
            </div>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {items.map((slot) => (
                <li
                  key={slot.id}
                  className={cn(
                    'rounded-control border border-ink/10 bg-surface/60 p-3',
                    slot.status === 'cancelled' && 'opacity-60'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 text-sm font-medium text-ink">
                        {slot.candidateName || `#${slot.candidateId}`}
                      </p>
                      <p className="m-0 font-mono text-2xs text-ink-muted">
                        {new Date(slot.startsAt).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR')}
                        {slot.endsAt
                          ? ` – ${new Date(slot.endsAt).toLocaleTimeString(locale === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </p>
                      {slot.meetUrl ? (
                        <div className="mt-1">
                          <CopyableLink url={slot.meetUrl} label={t(locale, 'recruiting.interviewSlotsMeetLink')} compact locale={locale} />
                        </div>
                      ) : null}
                      {slot.notes ? (
                        <p className="mb-0 mt-1 text-xs text-ink-faint">{slot.notes}</p>
                      ) : null}
                      <span className="mt-1 inline-block font-mono text-2xs uppercase tracking-wide text-ink-faint">
                        {t(locale, `recruiting.interviewSlotStatus.${slot.status}`)}
                      </span>
                    </div>
                    {slot.status === 'scheduled' ? (
                      <AdminDeleteButton
                        label={t(locale, 'recruiting.interviewSlotsCancel')}
                        onClick={() => cancelSlot(slot.id)}
                        disabled={busyId === slot.id}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ContentEnter>
      ) : null}
    </div>
    </CollapsibleBlock>
  );
}
