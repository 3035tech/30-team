'use client';

import { useCallback, useEffect, useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatSalaryBr, salaryToCentsDigits, stripSalary } from '../../lib/br-masks';
import { S, AdminCreateButton, AdminDeleteButton, AdminEditButton } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import {
  COMPENSATION_EVENT_TYPE,
  EMPLOYMENT_STATUS,
} from '../../lib/domain-status.js';

function formatDate(value, locale) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString(localeHtmlLang(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const EVENT_TYPE_OPTIONS = [
  COMPENSATION_EVENT_TYPE.HIRE,
  COMPENSATION_EVENT_TYPE.RAISE,
  COMPENSATION_EVENT_TYPE.ADJUSTMENT,
  COMPENSATION_EVENT_TYPE.BONUS,
  COMPENSATION_EVENT_TYPE.OTHER,
];

function eventTypeLabel(locale, type) {
  const key = `panel.compensation.type.${type}`;
  const label = t(locale, key);
  return label === key ? type : label;
}

/**
 * Internal RH compensation — current salary + timeline (not payroll).
 */
export function CompensationBlock({ locale, candidateId, employmentStatus }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(null);
  const [offerHint, setOfferHint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const readOnly = employmentStatus === EMPLOYMENT_STATUS.ALUMNI;
  const visible =
    employmentStatus === EMPLOYMENT_STATUS.EMPLOYEE ||
    employmentStatus === EMPLOYMENT_STATUS.ALUMNI;

  const load = useCallback(async () => {
    if (!candidateId || !visible) {
      setItems([]);
      setCurrent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/compensation`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrent(data.current || null);
      setOfferHint(data.offerHint || null);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.compensation.loadError'), 'error');
      setItems([]);
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId, visible, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!visible) {
    return (
      <p className="m-0 rounded-control border border-ink/12 bg-ink/[0.02] px-3.5 py-3 text-xs leading-normal text-ink-muted">
        {t(locale, 'panel.compensation.notInternal')}
      </p>
    );
  }

  const formFields = (defaults = {}) => [
    {
      key: 'eventType',
      type: 'select',
      label: t(locale, 'panel.compensation.typeLabel'),
      defaultValue: defaults.eventType || COMPENSATION_EVENT_TYPE.RAISE,
      required: true,
      options: EVENT_TYPE_OPTIONS.map((value) => ({
        value,
        label: eventTypeLabel(locale, value),
      })),
    },
    {
      key: 'amount',
      label: t(locale, 'panel.compensation.amountLabel'),
      placeholder: t(locale, 'panel.compensation.amountPh'),
      defaultValue: defaults.amount ? salaryToCentsDigits(defaults.amount) : '',
      required: true,
    },
    {
      key: 'effectiveDate',
      type: 'date',
      label: t(locale, 'panel.compensation.effectiveDateLabel'),
      defaultValue: defaults.effectiveDate || new Date().toISOString().slice(0, 10),
      required: true,
    },
    {
      key: 'notes',
      label: t(locale, 'panel.compensation.notesLabel'),
      placeholder: t(locale, 'panel.compensation.notesPh'),
      defaultValue: defaults.notes || '',
    },
  ];

  const addEvent = async () => {
    const values = await promptForm({
      title: t(locale, 'panel.compensation.addTitle'),
      confirmLabel: t(locale, 'panel.compensation.save'),
      fields: formFields({
        eventType: COMPENSATION_EVENT_TYPE.HIRE,
      }),
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/compensation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: values.eventType,
            amount: stripSalary(values.amount),
            effectiveDate: values.effectiveDate,
            notes: values.notes,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrent(data.current || data.event || null);
      toast(t(locale, 'panel.compensation.saved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.compensation.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const importOffer = async () => {
    const ok = await confirm({
      title: t(locale, 'panel.compensation.importOfferTitle'),
      message: t(locale, 'panel.compensation.importOfferHint', {
        amount: formatSalaryBr(offerHint?.offerSalary),
        date: formatDate(offerHint?.offerStartDate, locale),
      }),
      confirmLabel: t(locale, 'panel.compensation.importOfferConfirm'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/compensation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'importFromOffer' }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'import');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrent(data.current || data.event || null);
      setOfferHint(null);
      toast(t(locale, 'panel.compensation.importOfferOk'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.compensation.importOfferError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const editEvent = async (row) => {
    const values = await promptForm({
      title: t(locale, 'panel.compensation.editTitle'),
      confirmLabel: t(locale, 'panel.compensation.save'),
      fields: formFields({
        eventType: row.eventType,
        amount: row.amount,
        effectiveDate: row.effectiveDate,
        notes: row.notes,
      }),
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/compensation/${encodeURIComponent(row.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: values.eventType,
            amount: stripSalary(values.amount),
            effectiveDate: values.effectiveDate,
            notes: values.notes,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrent(data.current || null);
      toast(t(locale, 'panel.compensation.saved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.compensation.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (row) => {
    const ok = await confirm({
      title: t(locale, 'panel.compensation.deleteTitle'),
      message: t(locale, 'panel.compensation.deleteHint', {
        date: formatDate(row.effectiveDate, locale),
        amount: formatSalaryBr(row.amount),
      }),
      confirmLabel: t(locale, 'panel.compensation.deleteConfirm'),
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/compensation/${encodeURIComponent(row.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrent(data.current || null);
      toast(t(locale, 'panel.compensation.deleted'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.compensation.deleteError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="inline" />;

  return (
    <section
      className="rounded-control border border-ink/12 bg-canvas/40 p-3.5"
      aria-labelledby="compensation-block-title"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <span id="compensation-block-title" className={S.label}>
            {t(locale, 'panel.compensation.title')}
          </span>
          <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>{t(locale, 'panel.compensation.hint')}</p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap gap-1.5">
            {offerHint?.offerSalary && items.length === 0 ? (
              <button
                type="button"
                disabled={busy}
                className={cn(S.btnGhost, 'min-h-touch text-xs')}
                onClick={() => void importOffer()}
              >
                {t(locale, 'panel.compensation.importOfferBtn')}
              </button>
            ) : null}
            <AdminCreateButton
              label={t(locale, 'panel.compensation.addBtn')}
              onClick={() => void addEvent()}
              disabled={busy}
            />
          </div>
        ) : null}
      </div>

      <div className="mb-4 rounded-control border border-brand/20 bg-brand/[0.04] px-3 py-2.5">
        <div className={cn(S.faint, 'text-[10px] uppercase tracking-wide')}>
          {t(locale, 'panel.compensation.currentLabel')}
        </div>
        <div className="mt-0.5 font-display text-xl text-ink">
          {current?.amount ? formatSalaryBr(current.amount) : t(locale, 'panel.compensation.noCurrent')}
        </div>
        {current?.effectiveDate ? (
          <div className="mt-1 font-mono text-[11px] text-ink-muted">
            {t(locale, 'panel.compensation.since', { date: formatDate(current.effectiveDate, locale) })}
            {' · '}
            {eventTypeLabel(locale, current.eventType)}
          </div>
        ) : null}
      </div>

      {readOnly ? (
        <p className={cn(S.muted, 'mb-3 text-xs')}>{t(locale, 'panel.compensation.alumniReadOnly')}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.compensation.emptyTitle')}
          hint={t(locale, 'panel.compensation.emptyHint')}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 bg-surface px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-ui text-sm text-ink">{formatSalaryBr(row.amount)}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-ink-muted">
                  <span>{formatDate(row.effectiveDate, locale)}</span>
                  <span>{eventTypeLabel(locale, row.eventType)}</span>
                </div>
                {row.notes ? (
                  <p className={cn(S.muted, 'mb-0 mt-1 text-xs whitespace-pre-wrap')}>{row.notes}</p>
                ) : null}
              </div>
              {!readOnly ? (
                <div className="flex shrink-0 gap-1">
                  <AdminEditButton
                    ariaLabel={t(locale, 'panel.compensation.editBtn')}
                    onClick={() => void editEvent(row)}
                    disabled={busy}
                  />
                  <AdminDeleteButton
                    ariaLabel={t(locale, 'panel.compensation.deleteBtn')}
                    onClick={() => void removeEvent(row)}
                    disabled={busy}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
