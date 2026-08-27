'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';
import { isItemDueOverdue, isPlanPeriodOverdue } from '../../lib/people/pdi-action-lines';
import {
  DEVELOPMENT_PLAN_ITEM_STATUS,
  DEVELOPMENT_PLAN_STATUS,
} from '../../lib/domain-status.js';

/**
 * PDI — create/edit plan, archive, items + optional 1:1 link (B-501 / B-601).
 */
export function DevelopmentPlansBlock({
  locale,
  candidateId,
  seedIdeas = [],
  oneOnOnes = [],
  refreshKey = 0,
}) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/development-plans`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      toast(t(locale, 'panel.pdi.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, locale, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const openDetail = async (planId, force = false) => {
    if (!force && expandedId === planId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/development-plans/${encodeURIComponent(planId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setExpandedId(planId);
      setDetail(data.plan);
    } catch {
      toast(t(locale, 'panel.pdi.loadError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const patchPlan = async (planId, body) => {
    const res = await fetch(
      `/api/admin/candidates/${encodeURIComponent(candidateId)}/development-plans/${encodeURIComponent(planId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'patch');
    return data;
  };

  const createPlan = async () => {
    const ideas = Array.isArray(seedIdeas) ? seedIdeas.filter(Boolean).slice(0, 4) : [];
    const values = await promptForm({
      title: t(locale, 'panel.pdi.createTitle'),
      confirmLabel: t(locale, 'panel.pdi.createConfirm'),
      fields: [
        {
          key: 'title',
          label: t(locale, 'panel.pdi.titleLabel'),
          placeholder: t(locale, 'panel.pdi.titlePh'),
          required: true,
        },
        {
          key: 'objective',
          label: t(locale, 'panel.pdi.objectiveLabel'),
          placeholder: t(locale, 'panel.pdi.objectivePh'),
        },
        {
          key: 'periodStart',
          type: 'date',
          label: t(locale, 'panel.pdi.periodStart'),
        },
        {
          key: 'periodEnd',
          type: 'date',
          label: t(locale, 'panel.pdi.periodEnd'),
        },
        ...(ideas.length
          ? [
              {
                key: 'seed',
                type: 'boolean',
                label: t(locale, 'panel.pdi.seedFromSynthesis'),
                defaultValue: true,
              },
            ]
          : []),
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/development-plans`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: values.title,
            objective: values.objective,
            status: DEVELOPMENT_PLAN_STATUS.ACTIVE,
            periodStart: values.periodStart || null,
            periodEnd: values.periodEnd || null,
            seedIdeas: values.seed ? ideas : undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.errorCode || 'create');
      toast(t(locale, 'panel.pdi.created'), 'ok');
      await load();
      if (data.plan?.id) await openDetail(data.plan.id, true);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const editPlan = async () => {
    if (!detail) return;
    const values = await promptForm({
      title: t(locale, 'panel.pdi.editTitle'),
      confirmLabel: t(locale, 'panel.pdi.savePlan'),
      fields: [
        {
          key: 'title',
          label: t(locale, 'panel.pdi.titleLabel'),
          defaultValue: detail.title || '',
          required: true,
        },
        {
          key: 'objective',
          label: t(locale, 'panel.pdi.objectiveLabel'),
          defaultValue: detail.objective || '',
        },
        {
          key: 'periodStart',
          type: 'date',
          label: t(locale, 'panel.pdi.periodStart'),
          defaultValue: detail.periodStart ? String(detail.periodStart).slice(0, 10) : '',
        },
        {
          key: 'periodEnd',
          type: 'date',
          label: t(locale, 'panel.pdi.periodEnd'),
          defaultValue: detail.periodEnd ? String(detail.periodEnd).slice(0, 10) : '',
        },
        {
          key: 'status',
          type: 'select',
          label: t(locale, 'panel.pdi.statusLabel'),
          defaultValue: detail.status || DEVELOPMENT_PLAN_STATUS.DRAFT,
          options: Object.values(DEVELOPMENT_PLAN_STATUS).map((s) => ({
            value: s,
            label: t(locale, `panel.pdi.status.${s}`),
          })),
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const data = await patchPlan(detail.id, {
        title: values.title,
        objective: values.objective,
        status: values.status,
        periodStart: values.periodStart || null,
        periodEnd: values.periodEnd || null,
      });
      setDetail(data.plan);
      toast(t(locale, 'panel.pdi.planUpdated'), 'ok');
      await load();
    } catch {
      toast(t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const archivePlan = async () => {
    if (!detail) return;
    const ok = await confirm({
      message: t(locale, 'panel.pdi.archiveConfirm'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const data = await patchPlan(detail.id, { status: DEVELOPMENT_PLAN_STATUS.ARCHIVED });
      setDetail(data.plan);
      toast(t(locale, 'panel.pdi.archived'), 'ok');
      await load();
    } catch {
      toast(t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const setItemStatus = async (item, status) => {
    if (!expandedId) return;
    setBusy(true);
    try {
      const data = await patchPlan(expandedId, { item: { id: item.id, status } });
      setDetail(data.plan);
      toast(t(locale, 'panel.pdi.itemUpdated'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleItemDone = async (item) => {
    const next = item.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE
      ? DEVELOPMENT_PLAN_ITEM_STATUS.TODO
      : DEVELOPMENT_PLAN_ITEM_STATUS.DONE;
    await setItemStatus(item, next);
  };

  const editItem = async (item) => {
    if (!expandedId) return;
    const values = await promptForm({
      title: t(locale, 'panel.pdi.editItemTitle'),
      confirmLabel: t(locale, 'panel.pdi.saveItem'),
      fields: [
        {
          key: 'title',
          label: t(locale, 'panel.pdi.itemTitleLabel'),
          defaultValue: item.title || '',
          required: true,
        },
        {
          key: 'ownerLabel',
          label: t(locale, 'panel.pdi.ownerLabel'),
          placeholder: t(locale, 'panel.pdi.ownerPh'),
          defaultValue: item.ownerLabel || '',
        },
        {
          key: 'dueDate',
          type: 'date',
          label: t(locale, 'panel.pdi.itemDueLabel'),
          defaultValue: item.dueDate ? String(item.dueDate).slice(0, 10) : '',
        },
        {
          key: 'status',
          type: 'select',
          label: t(locale, 'panel.pdi.itemStatusAria'),
          defaultValue: item.status || DEVELOPMENT_PLAN_ITEM_STATUS.TODO,
          options: Object.values(DEVELOPMENT_PLAN_ITEM_STATUS).map((s) => ({
            value: s,
            label: t(locale, `panel.pdi.itemStatus.${s}`),
          })),
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const data = await patchPlan(expandedId, {
        item: {
          id: item.id,
          title: values.title,
          ownerLabel: values.ownerLabel || '',
          dueDate: values.dueDate || null,
          status: values.status,
        },
      });
      setDetail(data.plan);
      toast(t(locale, 'panel.pdi.itemUpdated'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const linkOneOnOne = async (item, oneOnOneId) => {
    if (!expandedId) return;
    setBusy(true);
    try {
      const data = await patchPlan(expandedId, {
        item: { id: item.id, oneOnOneId: oneOnOneId || null },
      });
      setDetail(data.plan);
      toast(t(locale, 'panel.pdi.itemUpdated'), 'ok');
    } catch {
      toast(t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    if (!expandedId) return;
    const values = await promptForm({
      title: t(locale, 'panel.pdi.addItemTitle'),
      confirmLabel: t(locale, 'panel.pdi.addItemConfirm'),
      fields: [
        {
          key: 'title',
          label: t(locale, 'panel.pdi.itemTitleLabel'),
          placeholder: t(locale, 'panel.pdi.itemTitlePh'),
          required: true,
        },
        {
          key: 'ownerLabel',
          label: t(locale, 'panel.pdi.ownerLabel'),
          placeholder: t(locale, 'panel.pdi.ownerPh'),
        },
        {
          key: 'dueDate',
          type: 'date',
          label: t(locale, 'panel.pdi.itemDueLabel'),
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const data = await patchPlan(expandedId, {
        addItem: {
          title: values.title,
          ownerLabel: values.ownerLabel || '',
          dueDate: values.dueDate || null,
        },
      });
      setDetail(data.plan);
      toast(t(locale, 'panel.pdi.itemUpdated'), 'ok');
      await load();
    } catch {
      toast(t(locale, 'panel.pdi.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="inline" />;

  const visible = showArchived ? items : items.filter((p) => p.status !== DEVELOPMENT_PLAN_STATUS.ARCHIVED);
  const ooOpts = Array.isArray(oneOnOnes) ? oneOnOnes : [];
  const activePlans = items.filter((p) => p.status === DEVELOPMENT_PLAN_STATUS.ACTIVE);
  const sumDone = activePlans.reduce((a, p) => a + (Number(p.doneCount) || 0), 0);
  const sumItems = activePlans.reduce((a, p) => a + (Number(p.itemCount) || 0), 0);
  const overallPct = sumItems > 0 ? Math.round((sumDone / sumItems) * 100) : null;

  return (
    <section className={cn(S.cardTight, 'mt-3')} aria-label={t(locale, 'panel.pdi.sectionAria')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={cn(S.label, 'mb-0')}>{t(locale, 'panel.pdi.title')}</h3>
          <p className={cn(S.muted, 'm-0 mt-1 text-xs')}>{t(locale, 'panel.pdi.hint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(S.btnGhost, 'min-h-touch text-[11px]')}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? t(locale, 'panel.pdi.hideArchived') : t(locale, 'panel.pdi.showArchived')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={createPlan}
            className={cn(S.btnBrandSoft, 'min-h-touch')}
          >
            {t(locale, 'panel.pdi.createBtn')}
          </button>
        </div>
      </div>

      {overallPct != null || activePlans.length > 0 ? (
        <div className="mb-3 rounded-control border border-ink/10 bg-canvas/60 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-ink-muted">
              {t(locale, 'panel.pdi.progressSummary', {
                done: sumDone,
                total: sumItems,
                plans: activePlans.length,
              })}
            </span>
            {overallPct != null ? (
              <span className="font-mono text-[11px] text-ink">{overallPct}%</span>
            ) : null}
          </div>
          {sumItems > 0 ? (
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10"
              role="progressbar"
              aria-valuenow={overallPct || 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-success" style={{ width: `${overallPct || 0}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.pdi.emptyTitle')}
          message={t(locale, 'panel.pdi.emptyHint')}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {visible.map((p) => {
            const pct =
              p.itemCount > 0 ? Math.round(((Number(p.doneCount) || 0) / p.itemCount) * 100) : 0;
            const overdue = isPlanPeriodOverdue(p);
            return (
              <li key={p.id} className="rounded-control border border-ink/12 bg-canvas/40 px-3 py-2">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-2 border-none bg-transparent p-0 text-left"
                  onClick={() => openDetail(p.id)}
                  aria-expanded={expandedId === p.id}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-ui text-sm text-ink">{p.title}</span>
                    {p.periodEnd ? (
                      <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                        {p.periodStart ? `${String(p.periodStart).slice(0, 10)} → ` : ''}
                        {String(p.periodEnd).slice(0, 10)}
                        {overdue ? ` · ${t(locale, 'panel.pdi.overdue')}` : ''}
                      </span>
                    ) : null}
                    {p.itemCount > 0 ? (
                      <span
                        className="mt-1 block h-1 max-w-[140px] overflow-hidden rounded-full bg-ink/10"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-success/80"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    ) : null}
                  </span>
                  <span className={cn(S.faint, 'shrink-0 font-mono text-[11px]')}>
                    {overdue ? (
                      <span className="mr-1 text-warning">{t(locale, 'panel.pdi.overdue')}</span>
                    ) : null}
                    {t(locale, `panel.pdi.status.${p.status}`)} · {p.doneCount}/{p.itemCount}
                  </span>
                </button>
                {expandedId === p.id && detail ? (
                  <div className="mt-2 border-t border-ink/10 pt-2">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button type="button" disabled={busy} className={S.btnGhost} onClick={editPlan}>
                        {t(locale, 'panel.pdi.editBtn')}
                      </button>
                      {detail.status !== DEVELOPMENT_PLAN_STATUS.ARCHIVED ? (
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(S.btnGhost, 'text-danger')}
                          onClick={archivePlan}
                        >
                          {t(locale, 'panel.pdi.archiveBtn')}
                        </button>
                      ) : null}
                      <button type="button" disabled={busy} className={S.btnBrandSoft} onClick={addItem}>
                        {t(locale, 'panel.pdi.addItemBtn')}
                      </button>
                    </div>
                    {detail.objective ? (
                      <p className={cn(S.muted, 'mb-2 text-xs')}>{detail.objective}</p>
                    ) : null}
                    {(detail.items || []).length === 0 ? (
                      <EmptyState
                        title={t(locale, 'panel.pdi.noItems')}
                        message={t(locale, 'panel.pdi.noItemsHint')}
                        actionLabel={t(locale, 'panel.pdi.addItemBtn')}
                        onAction={addItem}
                        actionDisabled={busy}
                      />
                    ) : (
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {detail.items.map((it) => {
                          const itemOver = isItemDueOverdue(it);
                          return (
                            <li
                              key={it.id}
                              className="flex flex-col gap-1.5 rounded-md bg-white/50 px-2.5 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-success"
                                    checked={it.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE}
                                    disabled={busy}
                                    aria-label={t(locale, 'panel.pdi.markDoneAria')}
                                    onChange={() => toggleItemDone(it)}
                                  />
                                </label>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={cn(
                                      'text-sm leading-snug text-ink',
                                      it.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE && 'text-ink-muted line-through'
                                    )}
                                  >
                                    {it.title}
                                  </div>
                                  {it.ownerLabel || it.dueDate || (it.source && it.source !== 'manual') ? (
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[10px] leading-tight text-ink-muted">
                                      {it.ownerLabel ? <span>{it.ownerLabel}</span> : null}
                                      {it.dueDate ? (
                                        <span className={itemOver ? 'text-warning' : 'text-ink-faint'}>
                                          {it.ownerLabel ? '· ' : ''}
                                          {String(it.dueDate).slice(0, 10)}
                                          {itemOver ? ` ${t(locale, 'panel.pdi.overdue')}` : ''}
                                        </span>
                                      ) : null}
                                      {it.source && it.source !== 'manual' ? (
                                        <span className="text-ink-faint">
                                          {(it.ownerLabel || it.dueDate) ? '· ' : ''}
                                          {t(locale, `panel.pdi.source.${it.source}`)}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className={cn(S.btnGhost, 'min-h-touch py-1 text-[11px]')}
                                    onClick={() => editItem(it)}
                                  >
                                    {t(locale, 'panel.pdi.editItemBtn')}
                                  </button>
                                  <select
                                    className={cn(S.select, 'min-h-touch w-auto py-1 text-[11px]')}
                                    value={it.status}
                                    disabled={busy}
                                    aria-label={t(locale, 'panel.pdi.itemStatusAria')}
                                    onChange={(e) => setItemStatus(it, e.target.value)}
                                  >
                                    <option value="todo">{t(locale, 'panel.pdi.itemStatus.todo')}</option>
                                    <option value="doing">{t(locale, 'panel.pdi.itemStatus.doing')}</option>
                                    <option value="done">{t(locale, 'panel.pdi.itemStatus.done')}</option>
                                  </select>
                                </div>
                              </div>
                              {ooOpts.length > 0 ? (
                                <label className="flex flex-wrap items-center gap-2 pl-10 text-[11px] text-ink-muted">
                                  <span>{t(locale, 'panel.pdi.linkOo')}</span>
                                  <select
                                    className={cn(S.select, 'min-h-touch max-w-[220px] py-1 text-[11px]')}
                                    value={it.oneOnOneId != null ? String(it.oneOnOneId) : ''}
                                    disabled={busy}
                                    onChange={(e) => linkOneOnOne(it, e.target.value)}
                                  >
                                    <option value="">{t(locale, 'panel.pdi.linkOoNone')}</option>
                                    {ooOpts.map((oo) => (
                                      <option key={oo.id} value={oo.id}>
                                        {String(oo.meetingDate || '').slice(0, 10)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
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
