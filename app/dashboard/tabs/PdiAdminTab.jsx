'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { EmptyState } from '../../_components/EmptyState';
import { SelectField } from '../../_components/SelectField';
import { Icon } from '../../_components/Icon';
import { StatMetricTile } from '../../_components/StatMetricTile';
import {
  AdminListPager,
  AdminListSearch,
  AdminPageHeader,
  S,
} from '../dashboard-shared';

const COPY = {
  'pt-BR': {
    title: 'PDI da equipe',
    subtitle: 'Veja onde o desenvolvimento precisa de uma próxima ação.',
    activePlans: 'PDIs ativos',
    attention: 'Pontos de atenção',
    noPlan: 'Sem PDI ativo',
    completion: 'Conclusão dos itens',
    search: 'Buscar colaborador',
    searchPh: 'Nome do colaborador…',
    viewLabel: 'Mostrar',
    viewAttention: 'Atenção primeiro',
    viewActive: 'PDIs ativos',
    viewNoPlan: 'Sem plano',
    viewAll: 'Toda a equipe',
    people: 'pessoas',
    noPlanTitle: 'Comece pelo próximo plano',
    noPlanBody: 'Não há pessoas nesta visão. Quando alguém não tiver PDI ativo, aparecerá aqui.',
    noPlanRowDetail: 'Crie um plano de desenvolvimento para esta pessoa.',
    selectCompanyTitle: 'Selecione uma empresa',
    selectCompanyBody: 'Escolha uma empresa para acompanhar os PDIs da equipe.',
    unavailableTitle: 'PDI indisponível',
    noDataTitle: 'Nenhum PDI encontrado',
    noDataBody: 'Crie o primeiro plano na ficha da pessoa para começar o acompanhamento.',
    open: 'Abrir PDI',
    create: 'Criar PDI',
    noPlanStatus: 'Sem PDI ativo',
    overduePlan: 'Plano atrasado',
    overdueItems: 'itens atrasados',
    nextActions: 'Próximas ações',
    nextActionsBody: 'Comece por estes casos para manter o desenvolvimento em movimento.',
    overdueItem: 'Item atrasado',
    overdueSince: 'Atrasado desde',
    withoutOneOnOne: 'Sem 1:1 vinculado',
    seePerson: 'Ver pessoa',
    noItems: 'Sem itens ainda',
    done: 'concluídos',
    error: 'Não foi possível carregar o acompanhamento de PDI.',
  },
  en: {
    title: 'Team development plans',
    subtitle: 'See where development needs a next action.',
    activePlans: 'Active plans',
    attention: 'Need attention',
    noPlan: 'No active plan',
    completion: 'Item completion',
    search: 'Search employee',
    searchPh: 'Employee name…',
    viewLabel: 'Show',
    viewAttention: 'Attention first',
    viewActive: 'Active plans',
    viewNoPlan: 'No plan',
    viewAll: 'Entire team',
    people: 'people',
    noPlanTitle: 'Start with the next plan',
    noPlanBody: 'No people match this view. Employees without an active plan will appear here.',
    noPlanRowDetail: 'Create a development plan for this employee.',
    selectCompanyTitle: 'Select a company',
    selectCompanyBody: 'Choose a company to track team development plans.',
    unavailableTitle: 'Development plans unavailable',
    noDataTitle: 'No development plans found',
    noDataBody: 'Create the first plan from a person’s profile to start tracking it.',
    open: 'Open plan',
    create: 'Create plan',
    noPlanStatus: 'No active plan',
    overduePlan: 'Plan overdue',
    overdueItems: 'overdue items',
    nextActions: 'Next actions',
    nextActionsBody: 'Start with these cases to keep development moving.',
    overdueItem: 'Overdue item',
    overdueSince: 'Overdue since',
    withoutOneOnOne: 'No 1:1 linked',
    seePerson: 'View person',
    noItems: 'No items yet',
    done: 'complete',
    error: 'Could not load development-plan tracking.',
  },
};

function dateLabel(value, locale) {
  if (!value) return null;
  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function PdiAdminTab({ locale = 'pt-BR', companyId, navigateDashboard, initialSearch = '' }) {
  const copy = COPY[locale === 'en' ? 'en' : 'pt-BR'];
  const [view, setView] = useState('attention');
  const [qDraft, setQDraft] = useState(initialSearch);
  const [q, setQ] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [error, setError] = useState('');

  useEffect(() => {
    const nextSearch = String(initialSearch || '').trim();
    setQDraft(nextSearch);
    setQ(nextSearch);
    setPage(1);
  }, [initialSearch]);

  const load = useCallback(async () => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        companyId: String(companyId),
        view,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/pdi?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'pdi_load');
      setData(json);
    } catch {
      setData(null);
      setError(copy.error);
    } finally {
      setLoading(false);
    }
  }, [companyId, copy.error, page, pageSize, q, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary || {};
  const attentionCount =
    (Number(summary.overdueItemCount) || 0) +
    (Number(summary.overduePlanCount) || 0) +
    (Number(summary.itemsWithoutOneOnOne) || 0);
  const rows = data?.rows || [];
  const priorityItems = [
    ...(summary.queue?.overdue || []).map((item) => ({ ...item, priorityKind: 'overdue' })),
    ...(summary.queue?.unlinked || []).map((item) => ({ ...item, priorityKind: 'unlinked' })),
    ...(summary.queue?.noPlan || []).map((item) => ({ ...item, priorityKind: 'no-plan' })),
  ].filter((item, index, list) => (
    list.findIndex((candidate) => `${candidate.priorityKind}:${candidate.candidateId}` === `${item.priorityKind}:${item.candidateId}`) === index
  )).slice(0, 4);
  const openPerson = (row) => {
    if (typeof navigateDashboard !== 'function') return;
    navigateDashboard({
      tab: 'team',
      candidate: String(row.candidateId),
      search: row.candidateName || null,
      section: 'dp',
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title={copy.title} subtitle={copy.subtitle} />

      {!companyId ? (
        <EmptyState title={copy.selectCompanyTitle} message={copy.selectCompanyBody} />
      ) : loading && !data ? (
        <AppLoading variant="panel" />
      ) : error ? (
        <EmptyState title={copy.unavailableTitle} message={error} />
      ) : (
        <ContentEnter animKey={`pdi-${companyId}-${view}-${q}-${page}`}>
          <section className={S.cardTight} aria-label={copy.title}>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                [summary.activePlans || 0, copy.activePlans],
                [attentionCount, copy.attention],
                [summary.noPlanEmployeeCount || 0, copy.noPlan],
                [`${summary.donePct ?? 0}%`, copy.completion],
              ].map(([value, label]) => (
                <StatMetricTile key={label} value={value} label={label} />
              ))}
            </div>

            {priorityItems.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-warning/20 bg-warning/[0.045]">
                <div className="flex flex-col gap-1 border-b border-warning/15 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="m-0 text-sm font-semibold text-ink">{copy.nextActions}</h2>
                    <p className="m-0 mt-0.5 text-xs text-ink-muted">{copy.nextActionsBody}</p>
                  </div>
                  <span className="font-mono text-2xs text-warning">
                    {attentionCount} {copy.attention.toLowerCase()}
                  </span>
                </div>
                <div className="divide-y divide-warning/15">
                  {priorityItems.map((item) => {
                    const isNoPlan = item.priorityKind === 'no-plan';
                    const isUnlinked = item.priorityKind === 'unlinked';
                    const title = isNoPlan ? copy.noPlanStatus : item.itemTitle || item.planTitle || copy.overdueItem;
                    const dueLabel = dateLabel(item.dueDate, locale);
                    const detail = isNoPlan
                      ? copy.noPlanRowDetail
                      : isUnlinked
                        ? copy.withoutOneOnOne
                        : dueLabel
                          ? `${copy.overdueSince} ${dueLabel}`
                          : copy.overdueItem;
                    return (
                      <div key={`${item.priorityKind}-${item.candidateId}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium text-ink">{item.candidateName}</p>
                          <p className="m-0 mt-0.5 truncate text-xs text-ink-muted">{title} · {detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPerson(item)}
                          className={cn(S.btnBrandSoft, 'min-h-touch shrink-0 whitespace-nowrap text-xs')}
                        >
                          {copy.seePerson}
                          <Icon name="chevronRight" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row sm:items-end">
              <AdminListSearch
                locale={locale}
                value={qDraft}
                onChange={setQDraft}
                onSubmit={(value) => { setQ(value.trim()); setPage(1); }}
                label={copy.search}
                placeholder={copy.searchPh}
              />
              <label className="block min-w-[12rem] sm:max-w-[16rem]">
                <span className={cn(S.label, 'mb-1.5 block')}>{copy.viewLabel}</span>
                <SelectField
                  value={view}
                  onChange={(event) => { setView(event.target.value); setPage(1); }}
                  className="w-full"
                  aria-label={copy.viewLabel}
                >
                  <option value="attention">{copy.viewAttention}</option>
                  <option value="active">{copy.viewActive}</option>
                  <option value="no-plan">{copy.viewNoPlan}</option>
                  <option value="all">{copy.viewAll}</option>
                </SelectField>
              </label>
            </div>
          </section>

          <section className={cn(S.cardTight, 'mt-4')}>
            {rows.length === 0 ? (
              <EmptyState
                title={view === 'no-plan' ? copy.noPlanTitle : copy.noDataTitle}
                message={view === 'no-plan' ? copy.noPlanBody : copy.noDataBody}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((row) => {
                  const hasPlan = Boolean(row.planId);
                  const flagged = !hasPlan || row.periodOverdue || row.overdueItemCount > 0;
                  const periodEndLabel = dateLabel(row.periodEnd, locale);
                  return (
                    <article key={row.candidateId} className={cn('rounded-control border px-3.5 py-3', flagged ? 'border-warning/25 bg-warning/[0.035]' : 'border-ink/10 bg-ink/[0.015]')}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="m-0 text-sm font-medium text-ink">{row.candidateName}</h2>
                            {!hasPlan ? <span className="rounded-full bg-warning/10 px-2 py-1 font-mono text-2xs text-warning">{copy.noPlanStatus}</span> : null}
                            {row.periodOverdue ? <span className="rounded-full bg-danger/10 px-2 py-1 font-mono text-2xs text-danger">{copy.overduePlan}</span> : null}
                          </div>
                          {hasPlan ? (
                          <p className="m-0 mt-1 text-xs text-ink-muted">
                            {row.planTitle}
                              {periodEndLabel ? ` · ${periodEndLabel}` : ''}
                              {row.overdueItemCount > 0 ? ` · ${row.overdueItemCount} ${copy.overdueItems}` : ''}
                          </p>
                          ) : (
                            <p className="m-0 mt-1 text-xs text-ink-muted">{copy.noPlanRowDetail}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {hasPlan ? (
                            <div className="min-w-[120px]">
                              <div className="mb-1 flex justify-between font-mono text-2xs text-ink-faint">
                                <span>{row.doneCount}/{row.itemCount || 0} {copy.done}</span>
                                <span>{row.donePct ?? 0}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                                <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, row.donePct || 0)}%` }} />
                              </div>
                            </div>
                          ) : null}
                          <button type="button" onClick={() => openPerson(row)} className={cn(S.btnBrandSoft, 'min-h-touch whitespace-nowrap text-xs')}>
                            <Icon name={hasPlan ? 'externalLink' : 'plus'} className="h-3.5 w-3.5" />
                            {hasPlan ? copy.open : copy.create}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <AdminListPager
              locale={locale}
              page={page}
              pageSize={pageSize}
              total={Number(data?.total) || 0}
              loading={loading}
              onPageChange={setPage}
              onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
            />
          </section>
        </ContentEnter>
      )}
    </div>
  );
}
