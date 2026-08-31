'use client';

/**
 * Performance Reviews Admin Tab — manage cycles, goals, and reviews → PDI (B-1004).
 */

import { useEffect, useMemo, useState } from 'react';
import { t as i18nT } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { PERFORMANCE_CYCLE_STATUS } from '../../../lib/domain-status.js';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { toDateOnlyIso } from '../../../lib/format-display-date.js';
import { AdminListFilters, AdminListFilterSelect } from '../../_components/AdminListFilters';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminListPager,
  AdminListSearch,
  AdminPageHeader,
  AdminTableShell,
  AdminViewButton,
  AdminIconButton,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';
import { NineBoxBlock } from './NineBoxBlock';
import { InlineCallout } from '../../_components/InlineCallout';
import { CalibrationBlock } from '../../_components/CalibrationBlock';
import { OkrBlock } from '../../_components/OkrBlock';

export function PerformanceReviewsAdminTab({ locale = 'pt-BR', companyId }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('periodStart');
  const [sortDir, setSortDir] = useState('desc');
  const [nameQ, setNameQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(null);
  const { confirm, notice, promptForm, toast } = useAppFeedback();

  function companyQs(prefix = '?') {
    if (!companyId) return '';
    return `${prefix}companyId=${companyId}`;
  }

  function withCompanyBody(payload) {
    return companyId ? { ...payload, companyId } : payload;
  }

  const t = (key) => {
    const messages = {
      'pt-BR': {
        title: 'Avaliações de Desempenho',
        subtitle: 'Ciclos, metas e avaliação → PDI',
        listEmpty: 'Nenhum ciclo cadastrado',
        searchNamePh: 'Buscar por título…',
        listEmptyDesc:
          'Crie um ciclo com metas; outcomes “Desenvolver” geram itens no PDI e pedem 1:1 na Equipe.',
        needCompanyTitle: 'Selecione uma empresa',
        needCompanyHint: 'Escolha a empresa no filtro do painel para gerenciar ciclos.',
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
        filterAll: 'Todos',
        reviewsCount: 'Avaliações',
        submittedCount: 'submetidas',
        createCycleSuccess: 'Ciclo criado com sucesso',
        updateCycleSuccess: 'Ciclo atualizado',
        errorCycleTitleRequired: 'Título do ciclo é obrigatório',
        loadError: 'Erro ao carregar ciclos',
        saveError: 'Erro ao salvar',
        autoPdiNote: 'Outcome "Desenvolver" gera item PDI automaticamente para o colaborador',
        continuousFeedbackNote:
          'Entre ciclos, use 1:1 na Equipe para feedback contínuo. Metas “Desenvolver” também pedem conversa.',
        continuousFeedbackCta: 'Abrir Equipe',
        edit: 'Editar',
        view: 'Ver',
        delete: 'Excluir / encerrar',
        confirmDelete:
          'Rascunho sem avaliações será excluído. Ciclos com avaliações serão apenas encerrados. Continuar?',
        deleteSuccess: 'Ciclo removido',
        closeSuccess: 'Ciclo encerrado',
        actions: 'Ações',
        titleCol: 'Título',
        allowSelfReview: 'Autoavaliação (180°)',
        allowPeerReview: 'Avaliação de pares (360°)',
        sideReviewButton: '180/360',
        sideReviewTitle: 'Convites 180/360',
        sideReviewCandidate: 'Colaborador',
        sideReviewRole: 'Papel',
        sideReviewRoleSelf: 'Autoavaliação',
        sideReviewRolePeer: 'Par / colega',
        sideReviewLabel: 'Nome do avaliador (opcional)',
        sideReviewCreated: 'Convite criado',
        sideReviewCapError: 'Limite de convites atingido para este colaborador',
        sideReviewDisabled: 'Ative autoavaliação ou pares no ciclo primeiro',
      },
      en: {
        title: 'Performance Reviews',
        subtitle: 'Cycles, goals, and review → PDI',
        listEmpty: 'No cycles registered',
        searchNamePh: 'Search by title…',
        listEmptyDesc:
          'Create a cycle with goals; “Develop” outcomes seed PDI items and call for a 1:1 in Team.',
        needCompanyTitle: 'Select a company',
        needCompanyHint: 'Choose a company in the panel filter to manage review cycles.',
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
        filterAll: 'All',
        reviewsCount: 'Reviews',
        submittedCount: 'submitted',
        createCycleSuccess: 'Cycle created successfully',
        updateCycleSuccess: 'Cycle updated',
        errorCycleTitleRequired: 'Cycle title is required',
        loadError: 'Failed to load cycles',
        saveError: 'Failed to save',
        autoPdiNote: 'Outcome "Develop" automatically generates a PDI item for the employee',
        continuousFeedbackNote:
          'Between cycles, use Team 1:1s for continuous feedback. “Develop” goals also need a conversation.',
        continuousFeedbackCta: 'Open Team',
        edit: 'Edit',
        view: 'View',
        delete: 'Delete / close',
        confirmDelete:
          'Drafts with no reviews are deleted. Cycles with reviews are closed only. Continue?',
        deleteSuccess: 'Cycle deleted',
        closeSuccess: 'Cycle closed',
        actions: 'Actions',
        titleCol: 'Title',
        allowSelfReview: 'Self-assessment (180°)',
        allowPeerReview: 'Peer review (360°)',
        sideReviewButton: '180/360',
        sideReviewTitle: '180/360 invites',
        sideReviewCandidate: 'Employee',
        sideReviewRole: 'Role',
        sideReviewRoleSelf: 'Self-assessment',
        sideReviewRolePeer: 'Peer / colleague',
        sideReviewLabel: 'Reviewer name (optional)',
        sideReviewCreated: 'Invite created',
        sideReviewCapError: 'Invite cap reached for this employee',
        sideReviewDisabled: 'Enable self or peer review on the cycle first',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  };

  useEffect(() => {
    loadCycles();
  }, [companyId]);

  async function loadCycles() {
    if (!companyId) {
      setCycles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/performance-cycles?limit=40${companyQs('&')}`);
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
      {
        name: 'allowSelfReview',
        label: t('allowSelfReview'),
        type: 'boolean',
        value: Boolean(cycle?.allowSelfReview),
      },
      {
        name: 'allowPeerReview',
        label: t('allowPeerReview'),
        type: 'boolean',
        value: Boolean(cycle?.allowPeerReview),
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
        body: JSON.stringify(withCompanyBody(result)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('createCycleSuccess'), 'ok');
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
        body: JSON.stringify(
          withCompanyBody({
            title: result.title,
            description: result.description,
            periodStart: result.periodStart || null,
            periodEnd: result.periodEnd || null,
            status: result.status,
            allowSelfReview: Boolean(result.allowSelfReview),
            allowPeerReview: Boolean(result.allowPeerReview),
          })
        ),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('updateCycleSuccess'), 'ok');
      loadCycles();
    } catch (err) {
      console.error('Edit cycle error:', err);
      toast(t('saveError'), 'error');
    }
  }

  async function handleViewCycle(cycle) {
    setSelectedCycle(cycle);
    const lines = [
      `${t('status')}: ${getStatusLabel(cycle.status)}`,
      `${t('periodStart')}: ${formatDate(cycle.periodStart)}`,
      `${t('periodEnd')}: ${formatDate(cycle.periodEnd)}`,
      `${t('reviewsCount')}: ${cycle.reviewCount || 0}` +
        (cycle.submittedCount != null ? ` (${cycle.submittedCount} ${t('submittedCount')})` : ''),
    ];
    if (cycle.description) lines.push('', String(cycle.description).trim());
    try {
      const res = await fetch(
        `/api/admin/performance-cycles/${cycle.id}/reviews?limit=20${
          companyId ? `&companyId=${companyId}` : ''
        }`
      );
      if (res.ok) {
        const data = await res.json();
        const reviews = data.reviews || [];
        if (reviews.length) {
          lines.push('', '·');
          for (const r of reviews.slice(0, 12)) {
            lines.push(
              `• ${r.candidateName || r.candidateEmail || `#${r.candidateId}`}: ${r.status}`
            );
          }
          if (reviews.length > 12) lines.push(`… +${reviews.length - 12}`);
        }
      }
    } catch {
      /* view still shows cycle meta */
    }
    await notice({ title: cycle.title, message: lines.join('\n') });
  }

  async function handleSideReviewInvite(cycle) {
    if (!cycle.allowSelfReview && !cycle.allowPeerReview) {
      toast(t('sideReviewDisabled'), 'error');
      return;
    }
    const roleOptions = [];
    if (cycle.allowSelfReview) {
      roleOptions.push({ value: 'self', label: t('sideReviewRoleSelf') });
    }
    if (cycle.allowPeerReview) {
      roleOptions.push({ value: 'peer', label: t('sideReviewRolePeer') });
    }
    const result = await promptForm({
      title: t('sideReviewTitle'),
      fields: [
        {
          key: 'candidateId',
          type: 'entitySearch',
          label: t('sideReviewCandidate'),
          searchUrl: companyId
            ? `/api/admin/employees/search?companyId=${encodeURIComponent(companyId)}`
            : '/api/admin/employees/search',
          minChars: 2,
          required: true,
        },
        {
          key: 'role',
          type: 'select',
          label: t('sideReviewRole'),
          required: true,
          options: roleOptions,
          initialValue: roleOptions[0]?.value || 'self',
        },
        {
          key: 'reviewerLabel',
          type: 'text',
          label: t('sideReviewLabel'),
          initialValue: '',
        },
      ],
    });
    if (!result?.candidateId) return;

    try {
      const res = await fetch(`/api/admin/performance-cycles/${cycle.id}/side-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: Number(result.candidateId),
          role: result.role,
          reviewerLabel: result.reviewerLabel,
          companyId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.errorCode === 'ITEMS_CAP') {
          toast(t('sideReviewCapError'), 'error');
          return;
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      toast(t('sideReviewCreated'), 'ok');
      await notice({
        title: t('sideReviewCreated'),
        message: data.publicUrl
          ? `${i18nT(locale, 'performanceReviews.sideReview.linkLabel')}:\n${data.publicUrl}`
          : i18nT(locale, 'performanceReviews.sideReview.createdHint'),
        tone: 'ok',
      });
    } catch (err) {
      console.error('Side review invite error:', err);
      toast(t('saveError'), 'error');
    }
  }

  async function handleDeleteCycle(cycle) {
    const ok = await confirm({
      message: t('confirmDelete'),
      danger: true,
      confirmLabel: t('delete'),
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/admin/performance-cycles/${cycle.id}${companyId ? `?companyId=${companyId}` : ''}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      toast(data.mode === 'closed' ? t('closeSuccess') : t('deleteSuccess'), 'ok');
      loadCycles();
    } catch (err) {
      console.error('Delete cycle error:', err);
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
    const q = String(nameQ || '').trim().toLowerCase();
    const rows = [...cycles].filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!q) return true;
      return String(row.title || '').toLowerCase().includes(q);
    });
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
  }, [cycles, sort, sortDir, locale, nameQ, statusFilter]);

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

  if (!companyId) {
    return <EmptyState title={t('needCompanyTitle')} message={t('needCompanyHint')} />;
  }

  if (loading) return <AppLoading variant="panel" />;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<AdminCreateButton label={t('createCycleButton')} onClick={handleCreateCycle} />}
      />
      <InlineCallout tone="info" className="text-xs text-ink-muted">
        {t('autoPdiNote')}
      </InlineCallout>
      <InlineCallout tone="brand" className="text-xs text-ink-muted">
        {t('continuousFeedbackNote')}{' '}
        <a href="/dashboard?tab=team" className="font-medium text-brand-600 hover:underline">
          {t('continuousFeedbackCta')}
        </a>
      </InlineCallout>

      <AdminListFilters
        aria-label={t('title')}
        locale={locale}
        onClear={() => {
          setNameQ('');
          setStatusFilter('');
          setPage(1);
        }}
        clearEnabled={Boolean(String(nameQ || '').trim() || statusFilter)}
      >
        <AdminListSearch
          locale={locale}
          value={nameQ}
          onChange={(v) => {
            setNameQ(v);
            setPage(1);
          }}
          placeholder={t('searchNamePh')}
        />
        <AdminListFilterSelect
          label={t('status')}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <option value="">{t('filterAll')}</option>
          <option value={PERFORMANCE_CYCLE_STATUS.DRAFT}>{t('statusDraft')}</option>
          <option value={PERFORMANCE_CYCLE_STATUS.ACTIVE}>{t('statusActive')}</option>
          <option value={PERFORMANCE_CYCLE_STATUS.CLOSED}>{t('statusClosed')}</option>
        </AdminListFilterSelect>
      </AdminListFilters>

      {cycles.length === 0 ? (
        <EmptyState
          title={t('listEmpty')}
          message={t('listEmptyDesc')}
          actionLabel={t('createCycleButton')}
          onAction={handleCreateCycle}
        />
      ) : (
        <>
        <AdminTableShell minWidth="640px" animKey={`${nameQ}|${statusFilter}|${safePage}|${pageSize}`}>
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
                <tr
                  key={cycle.id}
                  className={cn(
                    'hover:bg-canvas-alt/50',
                    selectedCycle?.id === cycle.id && 'bg-brand-500/[0.06]'
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-ink">{cycle.title}</p>
                    {cycle.description ? (
                      <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{cycle.description}</p>
                    ) : null}
                    {cycle.allowSelfReview || cycle.allowPeerReview ? (
                      <p className="mt-1 font-mono text-2xs text-brand-600">
                        {cycle.allowSelfReview ? t('allowSelfReview') : ''}
                        {cycle.allowSelfReview && cycle.allowPeerReview ? ' · ' : ''}
                        {cycle.allowPeerReview ? t('allowPeerReview') : ''}
                      </p>
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
                      <AdminViewButton label={t('view')} onClick={() => handleViewCycle(cycle)} />
                      <AdminEditButton label={t('edit')} onClick={() => handleEditCycle(cycle)} />
                      {cycle.status !== PERFORMANCE_CYCLE_STATUS.CLOSED &&
                      (cycle.allowSelfReview || cycle.allowPeerReview) ? (
                        <AdminIconButton
                          icon="link"
                          label={t('sideReviewButton')}
                          onClick={() => handleSideReviewInvite(cycle)}
                        />
                      ) : null}
                      {cycle.status !== PERFORMANCE_CYCLE_STATUS.CLOSED ? (
                        <AdminDeleteButton
                          label={t('delete')}
                          onClick={() => handleDeleteCycle(cycle)}
                        />
                      ) : null}
                    </AdminActionsCell>
                  </td>
                </tr>
              ))}
            </tbody>
        </AdminTableShell>
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
        </>
      )}
      <NineBoxBlock locale={locale} companyId={companyId} />
      {selectedCycle ? (
        <CalibrationBlock
          locale={locale}
          companyId={companyId}
          cycleId={selectedCycle.id}
          cycleTitle={selectedCycle.title || ''}
        />
      ) : null}
      <OkrBlock locale={locale} companyId={companyId} />
    </div>
  );
}
