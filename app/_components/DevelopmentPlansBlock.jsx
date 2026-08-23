'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';

/**
 * PDI block — list + create plan (optional seed from synthesis ideas).
 */
export function DevelopmentPlansBlock({ locale, candidateId, seedIdeas = [] }) {
  const { toast, promptForm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);

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
  }, [load]);

  const openDetail = async (planId) => {
    if (expandedId === planId) {
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

  const createPlan = async () => {
    const ideas = Array.isArray(seedIdeas) ? seedIdeas.filter(Boolean).slice(0, 4) : [];
    const values = await promptForm({
      title: t(locale, 'panel.pdi.createTitle'),
      confirmLabel: t(locale, 'panel.pdi.createConfirm'),
      fields: [
        {
          name: 'title',
          label: t(locale, 'panel.pdi.titleLabel'),
          placeholder: t(locale, 'panel.pdi.titlePh'),
          required: true,
        },
        {
          name: 'objective',
          label: t(locale, 'panel.pdi.objectiveLabel'),
          placeholder: t(locale, 'panel.pdi.objectivePh'),
        },
        ...(ideas.length
          ? [
              {
                name: 'seed',
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
            status: 'draft',
            seedIdeas: values.seed ? ideas : undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'create');
      toast(t(locale, 'panel.pdi.created'), 'ok');
      await load();
      if (data.plan?.id) await openDetail(data.plan.id);
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
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/development-plans/${encodeURIComponent(expandedId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: { id: item.id, status } }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'patch');
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

  return (
    <section className={cn(S.cardTight, 'mt-3')} aria-label={t(locale, 'panel.pdi.sectionAria')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={cn(S.label, 'mb-0')}>{t(locale, 'panel.pdi.title')}</h3>
          <p className={cn(S.muted, 'm-0 mt-1 text-xs')}>{t(locale, 'panel.pdi.hint')}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={createPlan}
          className={cn(S.btnBrandSoft, 'min-h-touch')}
        >
          {t(locale, 'panel.pdi.createBtn')}
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.pdi.emptyTitle')}
          message={t(locale, 'panel.pdi.emptyHint')}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((p) => (
            <li key={p.id} className="rounded-control border border-ink/12 bg-canvas/40 px-3 py-2">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-2 border-none bg-transparent p-0 text-left"
                onClick={() => openDetail(p.id)}
                aria-expanded={expandedId === p.id}
              >
                <span className="font-ui text-sm text-ink">{p.title}</span>
                <span className={cn(S.faint, 'font-mono text-[11px]')}>
                  {t(locale, `panel.pdi.status.${p.status}`)} · {p.doneCount}/{p.itemCount}
                </span>
              </button>
              {expandedId === p.id && detail ? (
                <div className="mt-2 border-t border-ink/10 pt-2">
                  {detail.objective ? (
                    <p className={cn(S.muted, 'mb-2 text-xs')}>{detail.objective}</p>
                  ) : null}
                  {(detail.items || []).length === 0 ? (
                    <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'panel.pdi.noItems')}</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {detail.items.map((it) => (
                        <li
                          key={it.id}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-white/50 px-2 py-1.5"
                        >
                          <span className="min-w-0 flex-1 text-xs text-ink">{it.title}</span>
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
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
