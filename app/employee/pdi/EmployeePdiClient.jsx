'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { formatDisplayDate } from '../../../lib/format-display-date';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { EmptyState } from '../../_components/EmptyState';
import { EmployeeDedicatedShell } from '../../_components/EmployeeDedicatedShell';
import { MeterBar } from '../../_components/MeterBar';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { useAppFeedback } from '../../_components/AppFeedback';
import { DEVELOPMENT_PLAN_ITEM_STATUS } from '../../../lib/domain-status';
import { redirectEmployeeIfUnauthorized } from '../../../lib/employee-client-session';

function itemStatusLabel(locale, status) {
  if (status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE) return t(locale, 'employeeHome.pdiDone');
  if (status === DEVELOPMENT_PLAN_ITEM_STATUS.DOING) return t(locale, 'employeeHome.pdiDoing');
  return t(locale, 'employeeHome.pdiTodo');
}

export function EmployeePdiClient({ locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/employee/home?locale=${encodeURIComponent(locale)}`);
      if (redirectEmployeeIfUnauthorized(null, res.status)) return;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'pdi');
      setData(json);
    } catch (error) {
      setFailed(true);
      toast(error?.message || t(locale, 'employeeHome.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [locale, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const previous = document.title;
    document.title = t(locale, 'employeeHome.pdiDocumentTitle');
    return () => { document.title = previous; };
  }, [locale]);

  const updateItem = async (itemId, status) => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePdiItem', itemId, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'pdi');
      toast(t(locale, 'employeeHome.pdiStatusSaved'), 'ok');
      await load();
    } catch (error) {
      toast(error?.message || t(locale, 'employeeHome.pdiStatusError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="panel" />;
  if (failed || !data) {
    return <EmptyState message={t(locale, 'employeeHome.loadError')} actionLabel={t(locale, 'employeeHome.loadRetry')} onAction={() => void load()} />;
  }

  const plans = data.plans || [];
  const allItems = plans.flatMap((plan) => plan.items || []);
  const doneItems = allItems.filter((item) => item.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE).length;
  const nextItem = allItems.find((item) => item.status !== DEVELOPMENT_PLAN_ITEM_STATUS.DONE);
  return (
    <ContentEnter animKey="employee-pdi">
      <EmployeeDedicatedShell
        locale={locale}
        title={t(locale, 'employeeHome.pdiPageTitle')}
        hint={t(locale, 'employeeHome.pdiPageHint')}
        maxWidthClass="max-w-4xl"
      >
        {plans.length === 0 ? (
          <EmptyState title={t(locale, 'employeeHome.pdiTitleEmpty')} message={t(locale, 'employeeHome.pdiEmptyHint')} />
        ) : (
          <div className="flex flex-col gap-4">
            {allItems.length > 0 ? (
              <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" aria-label={t(locale, 'employeeHome.pdiSummary')}>
                <div className="rounded-control border border-ink/12 bg-surface px-3.5 py-3">
                  <div className="font-display text-2xl text-ink">{allItems.length}</div>
                  <div className={cn(S.label, 'mt-1')}>{t(locale, 'employeeHome.pdiSummaryItems')}</div>
                </div>
                <div className="rounded-control border border-success/20 bg-success/[0.04] px-3.5 py-3">
                  <div className="font-display text-2xl text-ink">{doneItems}</div>
                  <div className={cn(S.label, 'mt-1')}>{t(locale, 'employeeHome.pdiSummaryDone')}</div>
                </div>
                <div className="rounded-control border border-brand-500/20 bg-brand-500/[0.045] px-3.5 py-3">
                  <div className="truncate text-sm font-medium text-ink">{nextItem?.title || t(locale, 'employeeHome.pdiSummaryAllDone')}</div>
                  <div className={cn(S.label, 'mt-1')}>{t(locale, 'employeeHome.pdiSummaryNext')}</div>
                </div>
              </section>
            ) : null}
            {plans.map((plan) => {
              const items = plan.items || [];
              const done = items.filter((item) => item.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE).length;
              const pct = items.length ? Math.round((done / items.length) * 100) : 0;
              return (
                <section key={plan.id} className={cn(S.card, 'p-4 sm:p-5')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className={cn(S.cardSection, 'm-0')}>{plan.title}</h2>
                      {plan.objective ? <p className={cn(S.muted, 'mb-0 mt-1')}>{plan.objective}</p> : null}
                    </div>
                    {items.length > 0 ? (
                      <StatusToneChip tone={pct >= 100 ? 'success' : 'brand'}>{pct}%</StatusToneChip>
                    ) : null}
                  </div>
                  {items.length > 0 ? (
                    <>
                      <MeterBar percent={pct} height={8} className="mt-4" toneClass={pct >= 100 ? 'bg-success' : 'bg-brand-500'} aria-label={`${plan.title}: ${pct}%`} />
                      <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
                        {items.map((item) => (
                          <li key={item.id} className="flex flex-col gap-2 rounded-control border border-ink/12 bg-canvas/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className={cn('m-0 break-words text-sm', item.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? 'text-ink-muted line-through' : 'text-ink')}>{item.title}</p>
                              <p className="m-0 mt-1 font-mono text-2xs text-ink-faint">
                                {itemStatusLabel(locale, item.status)}
                                {item.dueDate ? ` · ${formatDisplayDate(item.dueDate, locale)}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:shrink-0">
                              {item.status !== DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? (
                                <button type="button" disabled={busy} onClick={() => updateItem(item.id, DEVELOPMENT_PLAN_ITEM_STATUS.DONE)} className={cn(S.btnBrandSoft, 'min-h-touch text-2xs')}>{t(locale, 'employeeHome.pdiMarkDone')}</button>
                              ) : (
                                <button type="button" disabled={busy} onClick={() => updateItem(item.id, DEVELOPMENT_PLAN_ITEM_STATUS.TODO)} className={cn(S.btnGhost, 'min-h-touch text-2xs')}>{t(locale, 'employeeHome.pdiMarkTodo')}</button>
                              )}
                              {item.status === DEVELOPMENT_PLAN_ITEM_STATUS.TODO ? (
                                <button type="button" disabled={busy} onClick={() => updateItem(item.id, DEVELOPMENT_PLAN_ITEM_STATUS.DOING)} className={cn(S.btnGhost, 'min-h-touch text-2xs')}>{t(locale, 'employeeHome.pdiMarkDoing')}</button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className={cn(S.muted, 'mb-0 mt-3')}>{t(locale, 'employeeHome.pdiNoItems')}</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </EmployeeDedicatedShell>
    </ContentEnter>
  );
}
