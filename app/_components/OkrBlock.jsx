'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import {
  S,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminIconButton,
} from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';
import { MeterBar } from './MeterBar';
import { CollapsibleBlock } from './CollapsibleBlock';
import { OKR_CYCLE_STATUS } from '../../lib/domain-status.js';
import { formatDisplayDate } from '../../lib/format-display-date';
import { Icon } from './Icon';

function pctTone(pct) {
  const n = pct == null ? 0 : Number(pct);
  if (n >= 75) return 'bg-success';
  if (n >= 40) return 'bg-info';
  return 'bg-warning';
}

function urgencyTone(urgency) {
  if (urgency === 'overdue' || urgency === 'critical') return 'danger';
  if (urgency === 'warn') return 'warning';
  if (urgency === 'done') return 'success';
  return 'neutral';
}

function meterToneForActivity(act) {
  if (act.urgency === 'overdue' || act.urgency === 'critical') return 'bg-danger';
  if (act.urgency === 'warn') return 'bg-warning';
  return pctTone(act.progressPct);
}

/**
 * OKR phase 1: cycles → areas → activities (% + deadline urgency).
 */
export function OkrBlock({ locale = 'pt-BR', companyId }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [cycles, setCycles] = useState([]);
  const [activeCycleId, setActiveCycleId] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [busy, setBusy] = useState(false);
  const [historyForId, setHistoryForId] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const companyQs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const companyBody = companyId ? { companyId: Number(companyId) } : {};

  const load = useCallback(async () => {
    if (!companyId) {
      setCycles([]);
      setActiveCycleId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/okr/cycles${companyQs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      const list = Array.isArray(data.cycles) ? data.cycles : [];
      setCycles(list);
      setActiveCycleId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        const active = list.find((c) => c.status === OKR_CYCLE_STATUS.ACTIVE);
        return active?.id || list[0]?.id || null;
      });
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.loadError'), 'error');
      setCycles([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyQs, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycle = useMemo(
    () => cycles.find((c) => c.id === activeCycleId) || null,
    [cycles, activeCycleId]
  );

  const createCycle = async () => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.createCycleTitle'),
      confirmLabel: t(locale, 'panel.okr.createCycleConfirm'),
      fields: [
        { key: 'title', label: t(locale, 'panel.okr.cycleTitleLabel'), required: true, maxLength: 200 },
        { key: 'startsOn', type: 'date', label: t(locale, 'panel.okr.periodStart'), required: true },
        { key: 'endsOn', type: 'date', label: t(locale, 'panel.okr.periodEnd'), required: true },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/okr/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...companyBody, ...values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'create');
      toast(t(locale, 'panel.okr.cycleCreated'), 'ok');
      await load();
      if (data.cycle?.id) setActiveCycleId(data.cycle.id);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleCycleStatus = async () => {
    if (!cycle) return;
    const next =
      cycle.status === OKR_CYCLE_STATUS.CLOSED
        ? OKR_CYCLE_STATUS.ACTIVE
        : OKR_CYCLE_STATUS.CLOSED;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/cycles/${cycle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...companyBody, status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'patch');
      toast(t(locale, 'panel.okr.cycleStatusSaved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteCycle = async () => {
    if (!cycle) return;
    const ok = await confirm({
      title: t(locale, 'panel.okr.deleteCycleTitle'),
      message: t(locale, 'panel.okr.deleteCycleConfirm', { title: cycle.title }),
      confirmLabel: t(locale, 'panel.okr.deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/okr/cycles/${cycle.id}${companyQs}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      toast(t(locale, 'panel.okr.cycleDeleted'), 'ok');
      setActiveCycleId(null);
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createArea = async () => {
    if (!cycle) return;
    const values = await promptForm({
      title: t(locale, 'panel.okr.createAreaTitle'),
      confirmLabel: t(locale, 'panel.okr.createAreaConfirm'),
      fields: [
        { key: 'title', label: t(locale, 'panel.okr.areaTitleLabel'), required: true, maxLength: 200 },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/okr/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...companyBody, cycleId: cycle.id, title: values.title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'create');
      toast(t(locale, 'panel.okr.areaCreated'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteArea = async (area) => {
    const ok = await confirm({
      title: t(locale, 'panel.okr.deleteAreaTitle'),
      message: t(locale, 'panel.okr.deleteAreaConfirm', { title: area.title }),
      confirmLabel: t(locale, 'panel.okr.deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/areas/${area.id}${companyQs}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      toast(t(locale, 'panel.okr.areaDeleted'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createActivity = async (area) => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.createActivityTitle'),
      confirmLabel: t(locale, 'panel.okr.createActivityConfirm'),
      fields: [
        { key: 'title', label: t(locale, 'panel.okr.activityTitleLabel'), required: true, maxLength: 300 },
        {
          key: 'progressPct',
          type: 'number',
          label: t(locale, 'panel.okr.progressPctLabel'),
          defaultValue: '0',
          min: 0,
          max: 100,
        },
        {
          key: 'weight',
          type: 'number',
          label: t(locale, 'panel.okr.weightLabel'),
          defaultValue: '1',
          min: 1,
          max: 100,
          help: t(locale, 'panel.okr.weightHelp'),
        },
        { key: 'deadline', type: 'date', label: t(locale, 'panel.okr.deadlineLabel') },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/okr/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyBody,
          areaId: area.id,
          title: values.title,
          progressPct: Number(values.progressPct) || 0,
          weight: Number(values.weight) || 1,
          deadline: values.deadline || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'create');
      toast(t(locale, 'panel.okr.activityCreated'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const editActivityProgress = async (act) => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.progressTitle'),
      confirmLabel: t(locale, 'panel.okr.progressConfirm'),
      fields: [
        {
          key: 'progressPct',
          type: 'number',
          label: t(locale, 'panel.okr.progressPctLabel'),
          defaultValue: String(act.progressPct ?? 0),
          min: 0,
          max: 100,
          required: true,
        },
        {
          key: 'weight',
          type: 'number',
          label: t(locale, 'panel.okr.weightLabel'),
          defaultValue: String(act.weight ?? 1),
          min: 1,
          max: 100,
          required: true,
          help: t(locale, 'panel.okr.weightHelp'),
        },
        {
          key: 'deadline',
          type: 'date',
          label: t(locale, 'panel.okr.deadlineLabel'),
          defaultValue: act.deadline || '',
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/activities/${act.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyBody,
          progressPct: Number(values.progressPct) || 0,
          weight: Number(values.weight) || 1,
          deadline: values.deadline || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'patch');
      toast(t(locale, 'panel.okr.progressSaved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addCheckin = async (act) => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.checkinTitle'),
      confirmLabel: t(locale, 'panel.okr.checkinConfirm'),
      fields: [
        {
          key: 'progressPct',
          type: 'number',
          label: t(locale, 'panel.okr.progressPctLabel'),
          defaultValue: String(act.progressPct ?? 0),
          min: 0,
          max: 100,
          required: true,
        },
        {
          key: 'note',
          type: 'textarea',
          label: t(locale, 'panel.okr.checkinNoteLabel'),
          defaultValue: '',
          maxLength: 500,
          rows: 3,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/activities/${act.id}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyBody,
          progressPct: Number(values.progressPct) || 0,
          note: values.note || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'checkin');
      toast(t(locale, 'panel.okr.checkinSaved'), 'ok');
      setHistoryForId(null);
      setHistoryItems([]);
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleCheckinHistory = async (act) => {
    if (historyForId === act.id) {
      setHistoryForId(null);
      setHistoryItems([]);
      return;
    }
    setHistoryForId(act.id);
    setHistoryLoading(true);
    setHistoryItems([]);
    try {
      const qs = companyId
        ? `?companyId=${encodeURIComponent(companyId)}&limit=12`
        : '?limit=12';
      const res = await fetch(`/api/admin/okr/activities/${act.id}/checkins${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'list');
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.loadError'), 'error');
      setHistoryForId(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteActivity = async (act) => {
    const ok = await confirm({
      title: t(locale, 'panel.okr.deleteActivityTitle'),
      message: t(locale, 'panel.okr.deleteActivityConfirm', { title: act.title }),
      confirmLabel: t(locale, 'panel.okr.deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/activities/${act.id}${companyQs}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      toast(t(locale, 'panel.okr.activityDeleted'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addAssignee = async (act) => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.assignTitle'),
      confirmLabel: t(locale, 'panel.okr.assignConfirm'),
      fields: [
        {
          key: 'candidateId',
          label: t(locale, 'panel.okr.assignPersonLabel'),
          type: 'entitySearch',
          searchUrl: `/api/admin/employees/search?companyId=${encodeURIComponent(companyId)}`,
          required: true,
        },
      ],
    });
    if (!values?.candidateId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/activities/${act.id}/assignees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...companyBody,
          candidateId: Number(values.candidateId),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'assign');
      toast(
        data.inserted
          ? t(locale, 'panel.okr.assigneeAdded')
          : t(locale, 'panel.okr.assigneeAlready'),
        'ok'
      );
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeAssignee = async (act, person) => {
    const ok = await confirm({
      title: t(locale, 'panel.okr.unassignTitle'),
      message: t(locale, 'panel.okr.unassignConfirm', {
        name: person.fullName || person.email || String(person.candidateId),
        title: act.title,
      }),
      confirmLabel: t(locale, 'panel.okr.unassignBtn'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      if (companyId) qs.set('companyId', String(companyId));
      qs.set('candidateId', String(person.candidateId));
      const res = await fetch(`/api/admin/okr/activities/${act.id}/assignees?${qs}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'unassign');
      toast(t(locale, 'panel.okr.assigneeRemoved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!companyId) {
    return (
      <InlineCallout tone="info" className="mt-4">
        {t(locale, 'panel.okr.needCompany')}
      </InlineCallout>
    );
  }

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.okr.title')}
      open
      variant="card"
      className="mt-6"
    >
      <p className={cn(S.muted, 'mb-3 mt-0 text-prose')}>{t(locale, 'panel.okr.hint')}</p>
      <InlineCallout tone="info" className="mb-4">
        {t(locale, 'panel.okr.hedgedNote')}
      </InlineCallout>

      {loading ? (
        <AppLoading variant="panel" />
      ) : (
        <ContentEnter animKey={`okr|${cycles.length}|${activeCycleId || 0}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <AdminCreateButton
              locale={locale}
              label={t(locale, 'panel.okr.createCycleBtn')}
              onClick={() => void createCycle()}
              disabled={busy}
            />
            {cycles.length > 0 ? (
              <select
                className={cn(S.select, 'min-h-touch max-w-xs')}
                value={activeCycleId || ''}
                onChange={(e) => setActiveCycleId(Number(e.target.value) || null)}
                aria-label={t(locale, 'panel.okr.cycleSelectAria')}
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.progressPct != null ? ` · ${c.progressPct}%` : ''}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {!cycle ? (
            <EmptyState
              title={t(locale, 'panel.okr.emptyTitle')}
              message={t(locale, 'panel.okr.emptyHint')}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className={cn(S.cardTight, 'p-4')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className={cn(S.cardSection, 'm-0')}>{cycle.title}</h3>
                    <p className={cn(S.faint, 'mb-0 mt-1 font-mono text-2xs')}>
                      {formatDisplayDate(cycle.startsOn, locale)}
                      {' – '}
                      {formatDisplayDate(cycle.endsOn, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusToneChip
                      tone={cycle.status === OKR_CYCLE_STATUS.ACTIVE ? 'success' : 'neutral'}
                    >
                      {t(locale, `panel.okr.status.${cycle.status}`)}
                    </StatusToneChip>
                    <button
                      type="button"
                      className={cn(S.btnGhost, 'min-h-touch text-2xs')}
                      disabled={busy}
                      onClick={() => void toggleCycleStatus()}
                    >
                      {cycle.status === OKR_CYCLE_STATUS.CLOSED
                        ? t(locale, 'panel.okr.reopenCycle')
                        : t(locale, 'panel.okr.closeCycle')}
                    </button>
                    <AdminDeleteButton
                      locale={locale}
                      onClick={() => void deleteCycle()}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className={S.label}>{t(locale, 'panel.okr.totalProgress')}</span>
                    <span className="font-mono text-2xs text-ink-muted">
                      {cycle.progressPct != null
                        ? `${cycle.progressPct}%`
                        : t(locale, 'panel.common.notApplicable')}
                    </span>
                  </div>
                  <MeterBar
                    percent={cycle.progressPct ?? 0}
                    height={8}
                    toneClass={pctTone(cycle.progressPct)}
                    aria-label={t(locale, 'panel.okr.totalProgress')}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={S.label}>{t(locale, 'panel.okr.areasTitle')}</span>
                <button
                  type="button"
                  className={cn(S.btnGhost, 'min-h-touch gap-1.5 text-2xs')}
                  disabled={busy}
                  onClick={() => void createArea()}
                >
                  <Icon name="plus" className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t(locale, 'panel.okr.createAreaBtn')}
                </button>
              </div>

              {(cycle.areas || []).length === 0 ? (
                <EmptyState message={t(locale, 'panel.okr.areasEmpty')} />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {(cycle.areas || []).map((area) => (
                    <li key={area.id} className={cn(S.cardTight, 'bg-canvas/40 p-3 sm:p-4')}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className={cn(S.cardBody, 'm-0')}>{area.title}</h4>
                          <div className="mt-2">
                            <div className="mb-1 flex items-baseline justify-between gap-2">
                              <span className="font-mono text-2xs text-ink-faint">
                                {t(locale, 'panel.okr.areaProgress')}
                              </span>
                              <span className="font-mono text-2xs text-ink-muted">
                                {area.progressPct != null
                                  ? `${area.progressPct}%`
                                  : t(locale, 'panel.common.notApplicable')}
                              </span>
                            </div>
                            <MeterBar
                              percent={area.progressPct ?? 0}
                              height={6}
                              toneClass={pctTone(area.progressPct)}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <AdminIconButton
                            icon="plus"
                            label={t(locale, 'panel.okr.createActivityBtn')}
                            onClick={() => void createActivity(area)}
                            disabled={busy}
                          />
                          <AdminDeleteButton
                            locale={locale}
                            onClick={() => void deleteArea(area)}
                            disabled={busy}
                          />
                        </div>
                      </div>

                      {(area.activities || []).length === 0 ? (
                        <div className="mt-3">
                          <EmptyState message={t(locale, 'panel.okr.activitiesEmpty')} />
                        </div>
                      ) : (
                        <ul className="mt-3 m-0 flex list-none flex-col gap-2 p-0">
                          {(area.activities || []).map((act) => (
                            <li
                              key={act.id}
                              className={cn(
                                'rounded-control border bg-surface px-3 py-2.5',
                                act.urgency === 'overdue' || act.urgency === 'critical'
                                  ? 'border-danger/30'
                                  : act.urgency === 'warn'
                                    ? 'border-warning/30'
                                    : 'border-ink/10'
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={S.cardMuted}>{act.title}</span>
                                    {act.urgency && act.urgency !== 'none' ? (
                                      <StatusToneChip tone={urgencyTone(act.urgency)}>
                                        {t(locale, `panel.okr.urgency.${act.urgency}`)}
                                      </StatusToneChip>
                                    ) : null}
                                  </div>
                                  {act.deadline ? (
                                    <p className="mb-0 mt-1 font-mono text-2xs text-ink-faint">
                                      {t(locale, 'panel.okr.deadlineDue', {
                                        date: formatDisplayDate(act.deadline, locale),
                                      })}
                                      {(act.assignees || []).length > 0
                                        ? ` · ${t(locale, 'panel.okr.assigneeCount', {
                                            n: act.assignees.length,
                                          })}`
                                        : ''}
                                      {act.checkinCount > 0
                                        ? ` · ${t(locale, 'panel.okr.checkinCount', {
                                            n: act.checkinCount,
                                          })}`
                                        : ''}
                                    </p>
                                  ) : (act.assignees || []).length > 0 || act.checkinCount > 0 ? (
                                    <p className="mb-0 mt-1 font-mono text-2xs text-ink-faint">
                                      {(act.assignees || []).length > 0
                                        ? t(locale, 'panel.okr.assigneeCount', {
                                            n: act.assignees.length,
                                          })
                                        : ''}
                                      {(act.assignees || []).length > 0 && act.checkinCount > 0
                                        ? ' · '
                                        : ''}
                                      {act.checkinCount > 0
                                        ? t(locale, 'panel.okr.checkinCount', {
                                            n: act.checkinCount,
                                          })
                                        : ''}
                                    </p>
                                  ) : null}
                                  <div className="mt-2">
                                    <div className="mb-1 flex items-baseline justify-between gap-2">
                                      <span className="font-mono text-2xs text-ink-faint">
                                        {t(locale, 'panel.okr.activityProgress')}
                                        {act.weight != null && Number(act.weight) !== 1
                                          ? ` · ${t(locale, 'panel.okr.weightChip', {
                                              n: act.weight,
                                            })}`
                                          : ''}
                                      </span>
                                      <span className="font-mono text-2xs text-ink-muted">
                                        {act.progressPct}%
                                      </span>
                                    </div>
                                    <MeterBar
                                      percent={act.progressPct}
                                      height={6}
                                      toneClass={meterToneForActivity(act)}
                                    />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {(act.assignees || []).map((person) => (
                                      <span
                                        key={person.candidateId}
                                        className="inline-flex min-h-touch max-w-full items-center gap-0.5 rounded-control border border-ink/12 bg-canvas/70 pl-2.5 pr-1"
                                      >
                                        <span
                                          className="max-w-[9rem] truncate font-ui text-prose text-ink"
                                          title={person.email || person.fullName || undefined}
                                        >
                                          {person.fullName || person.email}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={busy || cycle.status === OKR_CYCLE_STATUS.CLOSED}
                                          className={cn(
                                            S.btnGhost,
                                            'min-h-touch min-w-touch shrink-0 px-1.5 text-ink-faint hover:text-danger'
                                          )}
                                          onClick={() => void removeAssignee(act, person)}
                                          aria-label={`${t(locale, 'panel.okr.unassignBtn')}: ${
                                            person.fullName || person.email || ''
                                          }`}
                                          title={t(locale, 'panel.okr.unassignBtn')}
                                        >
                                          <Icon name="close" className="h-3.5 w-3.5" aria-hidden />
                                        </button>
                                      </span>
                                    ))}
                                    {cycle.status !== OKR_CYCLE_STATUS.CLOSED ? (
                                      <AdminIconButton
                                        icon="team"
                                        label={t(locale, 'panel.okr.assignBtn')}
                                        onClick={() => void addAssignee(act)}
                                        disabled={busy}
                                      />
                                    ) : null}
                                  </div>
                                  {historyForId === act.id ? (
                                    <div className="mt-3 rounded-control border border-ink/10 bg-canvas-alt/50 px-2.5 py-2">
                                      <div className={cn(S.label, 'mb-1.5')}>
                                        {t(locale, 'panel.okr.checkinHistoryTitle')}
                                      </div>
                                      {historyLoading ? (
                                        <AppLoading locale={locale} variant="inline" />
                                      ) : historyItems.length === 0 ? (
                                        <p className={cn(S.faint, 'mb-0 text-2xs')}>
                                          {t(locale, 'panel.okr.checkinHistoryEmpty')}
                                        </p>
                                      ) : (
                                        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                                          {historyItems.map((c) => (
                                            <li
                                              key={c.id}
                                              className="font-mono text-2xs leading-snug text-ink-muted"
                                            >
                                              <span className="text-ink">
                                                {c.createdAt
                                                  ? formatDisplayDate(
                                                      String(c.createdAt).slice(0, 10),
                                                      locale
                                                    )
                                                  : '—'}
                                              </span>
                                              {` · ${c.progressPct}%`}
                                              {c.createdByName ? ` · ${c.createdByName}` : ''}
                                              {c.note ? (
                                                <span className="mt-0.5 block text-ink-faint">
                                                  {c.note}
                                                </span>
                                              ) : null}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <AdminEditButton
                                    locale={locale}
                                    onClick={() => void editActivityProgress(act)}
                                    disabled={busy || cycle.status === OKR_CYCLE_STATUS.CLOSED}
                                    label={t(locale, 'panel.okr.progressBtn')}
                                  />
                                  {cycle.status !== OKR_CYCLE_STATUS.CLOSED ? (
                                    <AdminIconButton
                                      icon="check"
                                      label={t(locale, 'panel.okr.checkinBtn')}
                                      onClick={() => void addCheckin(act)}
                                      disabled={busy}
                                    />
                                  ) : null}
                                  <AdminIconButton
                                    icon="list"
                                    label={
                                      historyForId === act.id
                                        ? t(locale, 'panel.common.collapse')
                                        : t(locale, 'panel.okr.checkinHistoryBtn')
                                    }
                                    onClick={() => void toggleCheckinHistory(act)}
                                    disabled={busy || historyLoading}
                                  />
                                  <AdminDeleteButton
                                    locale={locale}
                                    onClick={() => void deleteActivity(act)}
                                    disabled={busy || cycle.status === OKR_CYCLE_STATUS.CLOSED}
                                  />
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}
