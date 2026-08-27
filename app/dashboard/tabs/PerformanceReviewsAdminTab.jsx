'use client';

/**
 * Performance Reviews Admin Tab — manage cycles, goals, and reviews → PDI (B-1004).
 */

import { useEffect, useMemo, useState } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { PERFORMANCE_CYCLE_STATUS } from '../../../lib/domain-status.js';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { toDateOnlyIso } from '../../../lib/format-display-date.js';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminEditButton,
  AdminListPager,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';

export function PerformanceReviewsAdminTab({ locale = 'pt-BR', companyId }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('periodStart');
  const [sortDir, setSortDir] = useState('desc');
  const { promptForm, toast } = useAppFeedback();

  const t = (key) => {
    const messages = {
      'pt-BR': {
        title: 'Avaliações de Desempenho',
        subtitle: 'Ciclos, metas e avaliação → PDI',
        listEmpty: 'Nenhum ciclo cadastrado',
        listEmptyDesc:
          'Crie um ciclo com metas; outcomes “Desenvolver” geram itens no PDI e pedem 1:1 na Equipe.',
        createCycleButton: 'Novo Ciclo',
        editCycleTitle: 'Editar ciclo',
        cycleTitle: 'Título do ciclo',
        cycleTitlePlaceholder: 'Ex: Avaliação 2026 S1',
        cycleDescription: 'Descrição',
        periodStart: 'Início',
        periodEnd: 'Fim',
        status: 'Status',
        statusDraft: 'Rascunho',
        statusActive: 'Ativo',
        statusClosed: 'Fechado',
        reviewsCount: 'Avaliações',
        submittedCount: 'submetidas',
        createCycleSuccess: 'Ciclo criado com sucesso',
        updateCycleSuccess: 'Ciclo atualizado',
        errorCycleTitleRequired: 'Título do ciclo é obrigatório',
        loadError: 'Erro ao carregar ciclos',
        saveError: 'Erro ao salvar',
        autoPdiNote: 'Outcome "Desenvolver" gera item PDI automaticamente para o colaborador',
        continuousFeedbackNote:
          'Entre ciclos, use 1:1 na Equipe para feedback contínuo — metas “Desenvolver” também pedem conversa.',
        continuousFeedbackCta: 'Abrir Equipe',
        edit: 'Editar',
        actions: 'Ações',
        titleCol: 'Título',
      },
      en: {
        title: 'Performance Reviews',
        subtitle: 'Cycles, goals, and review → PDI',
        listEmpty: 'No cycles registered',
        listEmptyDesc:
          'Create a cycle with goals; “Develop” outcomes seed PDI items and call for a 1:1 in Team.',
        createCycleButton: 'New Cycle',
        editCycleTitle: 'Edit cycle',
        cycleTitle: 'Cycle title',
        cycleTitlePlaceholder: 'E.g.: 2026 H1 Review',
        cycleDescription: 'Description',
        periodStart: 'Start',
        periodEnd: 'End',
        status: 'Status',
        statusDraft: 'Draft',
        statusActive: 'Active',
        statusClosed: 'Closed',
        reviewsCount: 'Reviews',
        submittedCount: 'submitted',
        createCycleSuccess: 'Cycle created successfully',
        updateCycleSuccess: 'Cycle updated',
        errorCycleTitleRequired: 'Cycle title is required',
        loadError: 'Failed to load cycles',
        saveError: 'Failed to save',
        autoPdiNote: 'Outcome "Develop" automatically generates a PDI item for the employee',
        continuousFeedbackNote:
          'Between cycles, use Team 1:1s for continuous feedback — “Develop” goals also need a conversation.',
        continuousFeedbackCta: 'Open Team',
        edit: 'Edit',
        actions: 'Actions',
        titleCol: 'Title',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  };

  useEffect(() => {
    loadCycles();
  }, [companyId]);

  async function loadCycles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/performance-cycles?limit=40`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCycles(data.cycles || []);
    } catch (err) {
      console.error('Load cycles error:', err);
      toast(t('loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function cycleFormFields(cycle) {
    return [
      {
        name: 'title',
        label: t('cycleTitle'),
        placeholder: t('cycleTitlePlaceholder'),
        required: true,
        value: cycle?.title || '',
      },
      {
        name: 'description',
        label: t('cycleDescription'),
        type: 'textarea',
        rows: 3,
        value: cycle?.description || '',
      },
      {
        name: 'periodStart',
        label: t('periodStart'),
        type: 'date',
        row: 'period',
        value: toDateOnlyIso(cycle?.periodStart) || '',
      },
      {
        name: 'periodEnd',
        label: t('periodEnd'),
        type: 'date',
        row: 'period',
        value: toDateOnlyIso(cycle?.periodEnd) || '',
      },
      ...(cycle
        ? [
            {
              name: 'status',
              label: t('status'),
              type: 'select',
              value: cycle.status || PERFORMANCE_CYCLE_STATUS.DRAFT,
              options: [
                { value: PERFORMANCE_CYCLE_STATUS.DRAFT, label: t('statusDraft') },
                { value: PERFORMANCE_CYCLE_STATUS.ACTIVE, label: t('statusActive') },
                { value: PERFORMANCE_CYCLE_STATUS.CLOSED, label: t('statusClosed') },
              ],
            },
          ]
        : []),
    ];
  }

  async function handleCreateCycle() {
    const result = await promptForm({
      title: t('createCycleButton'),
      fields: cycleFormFields(null),
    });
    if (!result) return;

    if (!result.title || String(result.title).trim().length === 0) {
      toast(t('errorCycleTitleRequired'), 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/performance-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('createCycleSuccess'), 'success');
      loadCycles();
    } catch (err) {
      console.error('Create cycle error:', err);
      toast(t('saveError'), 'error');
    }
  }

  async function handleEditCycle(cycle) {
    const result = await promptForm({
      title: t('editCycleTitle'),
      fields: cycleFormFields(cycle),
    });
    if (!result) return;

    if (!result.title || String(result.title).trim().length === 0) {
      toast(t('errorCycleTitleRequired'), 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/performance-cycles/${cycle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          description: result.description,
          periodStart: result.periodStart || null,
          periodEnd: result.periodEnd || null,
          status: result.status,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('updateCycleSuccess'), 'success');
      loadCycles();
    } catch (err) {
      console.error('Edit cycle error:', err);
      toast(t('saveError'), 'error');
    }
  }

  function getStatusColor(status) {
    if (status === PERFORMANCE_CYCLE_STATUS.ACTIVE) return 'text-success';
    if (status === PERFORMANCE_CYCLE_STATUS.CLOSED) return 'text-ink-muted';
    return 'text-warning';
  }

  function getStatusLabel(status) {
    if (status === PERFORMANCE_CYCLE_STATUS.ACTIVE) return t('statusActive');
    if (status === PERFORMANCE_CYCLE_STATUS.CLOSED) return t('statusClosed');
    return t('statusDraft');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale);
  }

  const sortedCycles = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const collator = locale === 'en' ? 'en' : 'pt-BR';
    const rows = [...cycles];
    rows.sort((a, b) => {
      if (sort === 'reviewCount') {
        return ((Number(a.reviewCount) || 0) - (Number(b.reviewCount) || 0)) * dirMul;
      }
      if (sort === 'periodStart') {
        const as = toDateOnlyIso(a.periodStart) || '';
        const bs = toDateOnlyIso(b.periodStart) || '';
        return as.localeCompare(bs) * dirMul;
      }
      if (sort === 'status') {
        return String(a.status || '').localeCompare(String(b.status || ''), collator) * dirMul;
      }
      return String(a.title || '').localeCompare(String(b.title || ''), collator) * dirMul;
    });
    return rows;
  }, [cycles, sort, sortDir, locale]);

  const total = sortedCycles.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedCycles.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (columnKey) => {
    const nextDir = clientSortNextDir(columnKey, sort, sortDir);
    setSort(columnKey);
    setSortDir(nextDir);
    setPage(1);
  };

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="text-sm text-ink-muted">{t('subtitle')}</p>
        <div className="rounded-lg border border-info/20 bg-info/5 px-3 py-2 text-xs text-ink-muted">
          {t('autoPdiNote')}
        </div>
        <div className="rounded-lg border border-brand-500/20 bg-brand-500/[0.06] px-3 py-2 text-xs text-ink-muted">
          {t('continuousFeedbackNote')}{' '}
          <a href="/dashboard?tab=team" className="font-medium text-brand-600 hover:underline">
            {t('continuousFeedbackCta')}
          </a>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <AdminCreateButton label={t('createCycleButton')} onClick={handleCreateCycle} />
      </div>

      {cycles.length === 0 ? (
        <EmptyState
          title={t('listEmpty')}
          message={t('listEmptyDesc')}
          actionLabel={t('createCycleButton')}
          onAction={handleCreateCycle}
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink/10 bg-surface">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <SortableTh columnKey="title" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('titleCol')}
                </SortableTh>
                <SortableTh columnKey="status" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('status')}
                </SortableTh>
                <SortableTh columnKey="periodStart" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('periodStart')}
                </SortableTh>
                <SortableTh columnKey="reviewCount" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('reviewsCount')}
                </SortableTh>
                <AdminActionsTh>{t('actions')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {pageRows.map((cycle) => (
                <tr key={cycle.id} className="hover:bg-canvas-alt/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-ink">{cycle.title}</p>
                    {cycle.description ? (
                      <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{cycle.description}</p>
                    ) : null}
                    {cycle.periodEnd ? (
                      <p className="mt-1 text-xs text-ink-faint">
                        {t('periodEnd')}: {formatDate(cycle.periodEnd)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${getStatusColor(cycle.status)}`}>
                      {getStatusLabel(cycle.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{formatDate(cycle.periodStart)}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted">
                    {cycle.reviewCount || 0}
                    {cycle.submittedCount != null
                      ? ` (${cycle.submittedCount} ${t('submittedCount')})`
                      : ''}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminActionsCell>
                      <AdminEditButton label={t('edit')} onClick={() => handleEditCycle(cycle)} />
                    </AdminActionsCell>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <AdminListPager
              locale={locale}
              page={safePage}
              pageSize={pageSize}
              total={total}
              loading={loading}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={(ps) => {
                setPageSize(ps);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
