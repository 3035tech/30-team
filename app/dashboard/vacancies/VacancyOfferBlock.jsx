'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { S } from '../dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { StatusToneChip, statusToneClass } from '../../_components/StatusToneChip';

function formatOfferDate(raw) {
  if (!raw) return '';
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function offerStatusTone(status) {
  if (status === 'proposed') return 'warning';
  if (status === 'accepted') return 'success';
  if (status === 'declined') return 'danger';
  return 'neutral';
}

/**
 * Minimal offer / acceptance (B-703) — salary, start date, status.
 */
export function VacancyOfferBlock({
  vacancyId,
  candidateId,
  assessmentId = null,
  locale = 'pt-BR',
  initialOffer = null,
  compact = false,
  onSaved,
}) {
  const { toast, promptForm } = useAppFeedback();
  const [offer, setOffer] = useState(() => ({
    offerSalary: initialOffer?.offerSalary || '',
    offerStartDate: formatOfferDate(initialOffer?.offerStartDate),
    offerStatus: initialOffer?.offerStatus || 'none',
    offerNotes: initialOffer?.offerNotes || '',
  }));
  const [busy, setBusy] = useState(false);

  const status = offer.offerStatus || 'none';

  const openForm = async () => {
    if (!vacancyId || !candidateId) return;
    const values = await promptForm({
      title: t(locale, 'recruiting.offerFormTitle'),
      message: t(locale, 'recruiting.offerFormHint'),
      confirmLabel: t(locale, 'recruiting.offerSave'),
      fields: [
        {
          key: 'offerStatus',
          type: 'select',
          label: t(locale, 'recruiting.offerStatusLabel'),
          defaultValue: status === 'none' ? 'proposed' : status,
          required: true,
          options: [
            { value: 'proposed', label: t(locale, 'recruiting.offerStatus.proposed') },
            { value: 'accepted', label: t(locale, 'recruiting.offerStatus.accepted') },
            { value: 'declined', label: t(locale, 'recruiting.offerStatus.declined') },
          ],
        },
        {
          key: 'offerSalary',
          label: t(locale, 'recruiting.offerSalaryLabel'),
          placeholder: t(locale, 'recruiting.offerSalaryPh'),
          defaultValue: offer.offerSalary || '',
          required: true,
        },
        {
          key: 'offerStartDate',
          type: 'date',
          label: t(locale, 'recruiting.offerStartDateLabel'),
          defaultValue: offer.offerStartDate || new Date().toISOString().slice(0, 10),
          required: true,
        },
        {
          key: 'offerNotes',
          label: t(locale, 'recruiting.offerNotesLabel'),
          placeholder: t(locale, 'recruiting.offerNotesPh'),
          defaultValue: offer.offerNotes || '',
        },
      ],
    });
    if (!values) return;

    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateId)}/offer`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerStatus: values.offerStatus,
            offerSalary: values.offerSalary,
            offerStartDate: values.offerStartDate,
            offerNotes: values.offerNotes,
            assessmentId: assessmentId || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      const next = {
        offerSalary: data.offer?.offerSalary || values.offerSalary,
        offerStartDate: formatOfferDate(data.offer?.offerStartDate || values.offerStartDate),
        offerStatus: data.offer?.offerStatus || values.offerStatus,
        offerNotes: data.offer?.offerNotes || values.offerNotes || '',
      };
      setOffer(next);
      toast(t(locale, 'recruiting.offerSaved'), 'ok');
      onSaved?.(next);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.common.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          openForm();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'mt-1.5 inline-flex max-w-full items-center gap-1 rounded-control border px-1.5 py-0.5 font-mono text-2xs',
          statusToneClass(offerStatusTone(status))
        )}
        title={t(locale, 'recruiting.offerEdit')}
      >
        {status === 'none'
          ? t(locale, 'recruiting.offerAddShort')
          : t(locale, `recruiting.offerStatus.${status}`)}
        {offer.offerSalary && status !== 'none' ? (
          <span className="truncate opacity-80">· {offer.offerSalary}</span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-control border border-ink/12 bg-canvas/40 px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={cn(S.label, 'mb-0')}>{t(locale, 'recruiting.offerTitle')}</span>
        <StatusToneChip tone={offerStatusTone(status)}>
          {t(locale, `recruiting.offerStatus.${status}`)}
        </StatusToneChip>
      </div>
      <p className={cn(S.faint, 'm-0 mb-2')}>{t(locale, 'recruiting.offerHint')}</p>
      {status !== 'none' ? (
        <div className="mb-2 space-y-0.5 font-mono text-xs text-ink-muted">
          {offer.offerSalary ? (
            <div>{t(locale, 'recruiting.offerSalaryLine', { n: offer.offerSalary })}</div>
          ) : null}
          {offer.offerStartDate ? (
            <div>{t(locale, 'recruiting.offerStartLine', { d: offer.offerStartDate })}</div>
          ) : null}
          {offer.offerNotes ? (
            <div className="text-ink-faint">{offer.offerNotes}</div>
          ) : null}
        </div>
      ) : null}
      <button type="button" disabled={busy} className={S.btnBrandSoft} onClick={openForm}>
        {status === 'none' ? t(locale, 'recruiting.offerAdd') : t(locale, 'recruiting.offerEdit')}
      </button>
    </div>
  );
}
