'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { RichTextView } from '../../_components/RichTextView';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { AdminListFilters, AdminListFilterSelect } from '../../_components/AdminListFilters';
import {
  dialogBtnGhostClass,
  dialogBtnPrimaryClass,
  dialogCardClass,
  dialogOverlayClass,
} from '../../_components/app-dialog-styles';
import { EXIT_REASONS, EXIT_TYPES } from '../../../lib/domain-status.js';
import { formatDisplayDate, toDateOnlyIso } from '../../../lib/format-display-date.js';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { cn } from '../../../lib/cn';
import { CHART_MIN_N, topCategoryCounts } from '../../../lib/chart-aggregates';
import { CategoryBars } from '../../_components/CategoryBars';
import { ChartPanel } from '../../_components/ChartPanel';
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
  S,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';

export function ExitAnalysisAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [viewRecord, setViewRecord] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('exitDate');
  const [sortDir, setSortDir] = useState('desc');
  const [nameQ, setNameQ] = useState('');
  const [exitTypeFilter, setExitTypeFilter] = useState('');
  const [exitReasonFilter, setExitReasonFilter] = useState('');
  const { promptForm, toast, confirm } = useAppFeedback();

  /** Tab already gated by USERS_MANAGE; allow write for hr/direction too. */
  const canWrite = Boolean(isAdmin) || Boolean(companyId);

  function companyQs(prefix = '?') {
    if (!companyId) return '';
    return `${prefix}companyId=${companyId}`;
  }

  function withCompanyBody(payload) {
    return companyId ? { ...payload, companyId } : payload;
  }

  function employeesSearchUrl() {
    return companyId
      ? `/api/admin/employees/search?companyId=${companyId}`
      : '/api/admin/employees/search';
  }

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Análise Demissional',
        subtitle: 'Registro de saídas e insights para melhorar seleção e gestão',
        register: 'Registrar Saída',
        noRecords: 'Nenhuma saída registrada',
        searchNamePh: 'Buscar por colaborador…',
        noRecordsDesc: 'Registre saídas de colaboradores para análise',
        needCompanyTitle: 'Selecione uma empresa',
        needCompanyHint: 'Escolha a empresa no filtro do painel para ver saídas.',
        openPerson: 'Abrir na Equipe',
        ctaBenefits: 'Revisar benefícios',
        ctaTeam: 'Ver Equipe / retenção',
        exitDate: 'Data',
        candidateName: 'Colaborador',
        exitType: 'Tipo',
        exitReason: 'Motivo',
        filterAll: 'Todos',
        actions: 'Ações',
        view: 'Ver',
        edit: 'Editar',
        delete: 'Excluir',
        close: 'Fechar',
        viewTitle: 'Detalhe da saída',
        notes: 'Notas',
        noNotes: 'Sem notas neste registro.',
        email: 'E-mail',
        voluntary: 'Voluntária',
        involuntary: 'Involuntária',
        mutual: 'Acordo mútuo',
        better_offer: 'Proposta melhor',
        career_growth: 'Crescimento de carreira',
        compensation: 'Compensação',
        benefits: 'Pacote de benefícios',
        work_life_balance: 'Equilíbrio vida-trabalho',
        burnout: 'Esgotamento / burnout',
        workload: 'Sobrecarga de trabalho',
        relocation: 'Mudança de cidade/país',
        commute: 'Deslocamento / commute',
        schedule: 'Escala / turnos',
        personal: 'Pessoal',
        family_care: 'Cuidado familiar',
        health: 'Saúde',
        study: 'Estudos',
        public_exam: 'Concurso / setor público',
        entrepreneurship: 'Empreendedorismo',
        performance: 'Desempenho',
        conduct: 'Conduta',
        harassment: 'Assédio / ambiente hostil',
        restructuring: 'Reestruturação',
        layoff: 'Demissão em massa / layoff',
        position_eliminated: 'Cargo eliminado',
        contract_end: 'Fim de contrato',
        seasonal_end: 'Fim de temporada / sazonal',
        retirement: 'Aposentadoria',
        culture_fit: 'Fit cultural',
        manager_relationship: 'Relação com gestor',
        recognition: 'Reconhecimento',
        lack_of_challenge: 'Falta de desafio',
        targets_pressure: 'Pressão por metas',
        client_pressure: 'Pressão de clientes',
        tools_process: 'Ferramentas / processos',
        other: 'Outro',
        formTitle: 'Registrar Saída',
        formEditTitle: 'Editar saída',
        formCandidate: 'Colaborador',
        formCandidatePh: 'Buscar por nome…',
        formCandidateHelp: 'Digite o nome e selecione na lista. O ID é gravado automaticamente.',
        formExitDate: 'Data da saída',
        formExitType: 'Tipo de saída',
        formExitReason: 'Motivo principal',
        formNotes: 'Notas (contexto, feedback)',
        registered: 'Saída registrada',
        updated: 'Registro atualizado',
        deleted: 'Registro excluído',
        loadError: 'Erro ao carregar saídas',
        saveError: 'Erro ao registrar saída',
        updateError: 'Erro ao atualizar saída',
        deleteError: 'Erro ao excluir saída',
        pickEmployee: 'Selecione um colaborador na busca.',
        confirmDelete:
          'Excluir este registro de saída? O colaborador volta ao status ativo se ainda estiver como alumni. Esta ação não desfaz o histórico de insights já agregados em outras telas até o próximo refresh.',
        reasonsTitle: 'Principais motivos',
        reasonsHint: 'Top motivos no total registrado (independente dos filtros da lista).',
      },
      en: {
        title: 'Exit Analysis',
        subtitle: 'Exit records and insights to improve recruitment and management',
        register: 'Register Exit',
        noRecords: 'No exits recorded',
        searchNamePh: 'Search by employee…',
        noRecordsDesc: 'Register employee exits for analysis',
        needCompanyTitle: 'Select a company',
        needCompanyHint: 'Choose a company in the panel filter to view exits.',
        openPerson: 'Open on Team',
        ctaBenefits: 'Review benefits',
        ctaTeam: 'Open Team / retention',
        exitDate: 'Date',
        candidateName: 'Employee',
        exitType: 'Type',
        exitReason: 'Reason',
        filterAll: 'All',
        actions: 'Actions',
        view: 'View',
        edit: 'Edit',
        delete: 'Delete',
        close: 'Close',
        viewTitle: 'Exit details',
        notes: 'Notes',
        noNotes: 'No notes on this record.',
        email: 'Email',
        voluntary: 'Voluntary',
        involuntary: 'Involuntary',
        mutual: 'Mutual agreement',
        better_offer: 'Better offer',
        career_growth: 'Career growth',
        compensation: 'Compensation',
        benefits: 'Benefits package',
        work_life_balance: 'Work-life balance',
        burnout: 'Burnout',
        workload: 'Workload',
        relocation: 'Relocation',
        commute: 'Commute',
        schedule: 'Schedule / shifts',
        personal: 'Personal',
        family_care: 'Family care',
        health: 'Health',
        study: 'Study',
        public_exam: 'Public exam / civil service',
        entrepreneurship: 'Entrepreneurship',
        performance: 'Performance',
        conduct: 'Conduct',
        harassment: 'Harassment / hostile environment',
        restructuring: 'Restructuring',
        layoff: 'Layoff',
        position_eliminated: 'Position eliminated',
        contract_end: 'Contract end',
        seasonal_end: 'Seasonal end',
        retirement: 'Retirement',
        culture_fit: 'Culture fit',
        manager_relationship: 'Manager relationship',
        recognition: 'Recognition',
        lack_of_challenge: 'Lack of challenge',
        targets_pressure: 'Targets pressure',
        client_pressure: 'Client pressure',
        tools_process: 'Tools / process',
        other: 'Other',
        formTitle: 'Register Exit',
        formEditTitle: 'Edit exit',
        formCandidate: 'Employee',
        formCandidatePh: 'Search by name…',
        formCandidateHelp: 'Type a name and pick from the list. The ID is saved automatically.',
        formExitDate: 'Exit date',
        formExitType: 'Exit type',
        formExitReason: 'Main reason',
        formNotes: 'Notes (context, feedback)',
        registered: 'Exit recorded',
        updated: 'Record updated',
        deleted: 'Record deleted',
        loadError: 'Failed to load exits',
        saveError: 'Failed to record exit',
        updateError: 'Failed to update exit',
        deleteError: 'Failed to delete exit',
        pickEmployee: 'Select an employee from search.',
        confirmDelete:
          'Delete this exit record? The employee returns to active status if still alumni. Aggregated insights on other screens refresh on the next load.',
        reasonsTitle: 'Top reasons',
        reasonsHint: 'Top reasons across all recorded exits (independent of list filters).',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  useEffect(() => {
    loadRecords();
  }, [companyId]);

  async function loadRecords() {
    if (!companyId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exit-analysis?limit=100${companyQs('&')}`);
      const data = await res.json();
      if (data.ok) setRecords(data.records || []);
      else toast(t('loadError'), 'error');
    } catch {
      toast(t('loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterExit() {
    const today = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();

    const result = await promptForm({
      title: t('formTitle'),
      fields: [
        {
          name: 'candidateId',
          label: t('formCandidate'),
          type: 'entitySearch',
          required: true,
          searchUrl: employeesSearchUrl(),
          placeholder: t('formCandidatePh'),
          help: t('formCandidateHelp'),
          minChars: 1,
        },
        {
          name: 'exitDate',
          label: t('formExitDate'),
          type: 'date',
          required: true,
          defaultValue: today,
        },
        {
          name: 'exitType',
          label: t('formExitType'),
          type: 'select',
          required: true,
          defaultValue: 'voluntary',
          options: EXIT_TYPES.map((value) => ({ value, label: t(value) })),
        },
        {
          name: 'exitReason',
          label: t('formExitReason'),
          type: 'select',
          required: true,
          defaultValue: 'other',
          options: EXIT_REASONS.map((value) => ({ value, label: t(value) })),
        },
        {
          name: 'notes',
          label: t('formNotes'),
          type: 'richText',
          required: false,
          minHeight: 120,
        },
      ],
    });
    if (!result) return;

    const candidateId = Number(result.candidateId);
    if (!Number.isFinite(candidateId) || candidateId <= 0) {
      toast(t('pickEmployee'), 'warning');
      return;
    }

    try {
      const res = await fetch('/api/admin/exit-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          withCompanyBody({
            candidateId,
            exitDate: result.exitDate,
            exitType: result.exitType,
            exitReason: result.exitReason,
            notes: result.notes,
          })
        ),
      });
      const data = await res.json();
      if (data.ok) {
        toast(t('registered'), 'ok');
        loadRecords();
      } else {
        toast(data.error || t('saveError'), 'error');
      }
    } catch {
      toast(t('saveError'), 'error');
    }
  }

  async function handleEdit(rec) {
    const result = await promptForm({
      title: t('formEditTitle'),
      fields: [
        {
          name: 'exitDate',
          label: t('formExitDate'),
          type: 'date',
          required: true,
          defaultValue: toDateOnlyIso(rec.exitDate) || '',
        },
        {
          name: 'exitType',
          label: t('formExitType'),
          type: 'select',
          required: true,
          defaultValue: rec.exitType || 'voluntary',
          options: EXIT_TYPES.map((value) => ({ value, label: t(value) })),
        },
        {
          name: 'exitReason',
          label: t('formExitReason'),
          type: 'select',
          required: true,
          defaultValue: rec.exitReason || 'other',
          options: EXIT_REASONS.map((value) => ({ value, label: t(value) })),
        },
        {
          name: 'notes',
          label: t('formNotes'),
          type: 'richText',
          required: false,
          minHeight: 120,
          defaultValue: rec.notes || '',
        },
      ],
    });
    if (!result) return;

    try {
      const res = await fetch(`/api/admin/exit-analysis/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          withCompanyBody({
            exitDate: result.exitDate,
            exitType: result.exitType,
            exitReason: result.exitReason,
            notes: result.notes,
          })
        ),
      });
      const data = await res.json();
      if (data.ok) {
        toast(t('updated'), 'ok');
        setViewRecord(null);
        loadRecords();
      } else {
        toast(data.error || t('updateError'), 'error');
      }
    } catch {
      toast(t('updateError'), 'error');
    }
  }

  async function handleDelete(rec) {
    const ok = await confirm({
      message: t('confirmDelete'),
      danger: true,
      confirmLabel: t('delete'),
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/exit-analysis/${rec.id}${companyQs('?')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        toast(t('deleted'), 'ok');
        setViewRecord((cur) => (cur?.id === rec.id ? null : cur));
        loadRecords();
      } else {
        toast(data.error || t('deleteError'), 'error');
      }
    } catch {
      toast(t('deleteError'), 'error');
    }
  }

  function formatDate(dateStr) {
    return formatDisplayDate(dateStr, locale, { fallback: '-' });
  }

  const sortedRecords = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const q = String(nameQ || '').trim().toLowerCase();
    const rows = [...records].filter((row) => {
      if (exitTypeFilter && row.exitType !== exitTypeFilter) return false;
      if (exitReasonFilter && row.exitReason !== exitReasonFilter) return false;
      if (!q) return true;
      return String(row.candidateName || '').toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      const av = a?.[sort];
      const bv = b?.[sort];
      if (sort === 'exitDate') {
        const as = toDateOnlyIso(av) || '';
        const bs = toDateOnlyIso(bv) || '';
        return as.localeCompare(bs) * dirMul;
      }
      return String(av || '').localeCompare(String(bv || ''), locale === 'en' ? 'en' : 'pt-BR') * dirMul;
    });
    return rows;
  }, [records, sort, sortDir, locale, nameQ, exitTypeFilter, exitReasonFilter]);

  const reasonBars = useMemo(() => {
    const counted = records.map((r) => ({ exitReason: r.exitReason, count: 1 }));
    return topCategoryCounts(counted, { key: 'exitReason', limit: 5 }).map((r) => ({
      id: r.id,
      label: t(r.id),
      value: r.value,
      toneClass: 'rounded-full bg-warning',
    }));
  }, [records, locale]);

  const total = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (columnKey) => {
    const nextDir = clientSortNextDir(columnKey, sort, sortDir);
    setSort(columnKey);
    setSortDir(nextDir);
    setPage(1);
  };

  if (!companyId) {
    return (
      <ContentEnter>
        <EmptyState title={t('needCompanyTitle')} message={t('needCompanyHint')} />
      </ContentEnter>
    );
  }

  if (loading) return <AppLoading variant="panel" />;

  return (
    <ContentEnter>
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          canWrite ? (
            <AdminCreateButton label={t('register')} onClick={handleRegisterExit} />
          ) : null
        }
      />

      {records.length >= CHART_MIN_N && reasonBars.length > 0 ? (
        <ChartPanel title={t('reasonsTitle')} hint={t('reasonsHint')}>
          <CategoryBars items={reasonBars} height={8} total={records.length} />
        </ChartPanel>
      ) : null}

      {records.length > 0 ? (
        <AdminListFilters
          aria-label={t('title')}
          locale={locale}
          onClear={() => {
            setNameQ('');
            setExitTypeFilter('');
            setExitReasonFilter('');
            setPage(1);
          }}
          clearEnabled={Boolean(
            String(nameQ || '').trim() || exitTypeFilter || exitReasonFilter
          )}
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
            label={t('exitType')}
            value={exitTypeFilter}
            onChange={(v) => {
              setExitTypeFilter(v);
              setPage(1);
            }}
          >
            <option value="">{t('filterAll')}</option>
            {EXIT_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </AdminListFilterSelect>
          <AdminListFilterSelect
            label={t('exitReason')}
            value={exitReasonFilter}
            onChange={(v) => {
              setExitReasonFilter(v);
              setPage(1);
            }}
          >
            <option value="">{t('filterAll')}</option>
            {EXIT_REASONS.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </AdminListFilterSelect>
        </AdminListFilters>
      ) : null}

      {records.length === 0 ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            title={t('noRecords')}
            message={t('noRecordsDesc')}
            actionLabel={canWrite ? t('register') : undefined}
            onAction={canWrite ? handleRegisterExit : undefined}
          />
          <div className="flex flex-wrap gap-3 px-1">
            <Link href="/dashboard?tab=company-benefits" className="font-mono text-xs text-brand-600 hover:underline">
              {t('ctaBenefits')} →
            </Link>
            <Link href="/dashboard?tab=team" className="font-mono text-xs text-brand-600 hover:underline">
              {t('ctaTeam')} →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <AdminTableShell minWidth="640px" animKey={`${nameQ}|${exitTypeFilter}|${exitReasonFilter}|${safePage}|${pageSize}`}>
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <SortableTh columnKey="exitDate" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('exitDate')}
                </SortableTh>
                <SortableTh columnKey="candidateName" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('candidateName')}
                </SortableTh>
                <SortableTh columnKey="exitType" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('exitType')}
                </SortableTh>
                <SortableTh columnKey="exitReason" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('exitReason')}
                </SortableTh>
                <AdminActionsTh>{t('actions')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {pageRows.map((rec) => (
                <tr key={rec.id} className="hover:bg-canvas-alt/50">
                  <td className="px-4 py-3 text-sm text-ink">{formatDate(rec.exitDate)}</td>
                  <td className="px-4 py-3 text-sm text-ink">
                    {rec.candidateId ? (
                      <Link
                        href={`/dashboard?tab=team&candidate=${rec.candidateId}`}
                        className="text-brand-600 hover:underline"
                        title={t('openPerson')}
                      >
                        {rec.candidateName}
                      </Link>
                    ) : (
                      rec.candidateName
                    )}
                    {rec.exitReason === 'benefits' || rec.exitReason === 'compensation' ? (
                      <div className="mt-1">
                        <Link
                          href="/dashboard?tab=company-benefits"
                          className="font-mono text-2xs text-brand-600 hover:underline"
                        >
                          {t('ctaBenefits')}
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <StatusToneChip
                      tone={
                        rec.exitType === 'voluntary'
                          ? 'info'
                          : rec.exitType === 'involuntary'
                            ? 'danger'
                            : 'warning'
                      }
                      bordered={false}
                      className="rounded px-2 py-0.5 font-ui text-xs font-medium"
                    >
                      {t(rec.exitType)}
                    </StatusToneChip>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{t(rec.exitReason)}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminActionsCell>
                      <AdminViewButton label={t('view')} onClick={() => setViewRecord(rec)} />
                      {canWrite ? (
                        <>
                          <AdminEditButton label={t('edit')} onClick={() => handleEdit(rec)} />
                          <AdminDeleteButton label={t('delete')} onClick={() => handleDelete(rec)} />
                        </>
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

      {viewRecord ? (
        <ExitRecordViewDialog
          locale={locale}
          record={viewRecord}
          t={t}
          formatDate={formatDate}
          canWrite={canWrite}
          onClose={() => setViewRecord(null)}
          onEdit={() => handleEdit(viewRecord)}
          onDelete={() => handleDelete(viewRecord)}
        />
      ) : null}
    </div>
    </ContentEnter>
  );
}

function ExitRecordViewDialog({ locale, record, t, formatDate, canWrite, onClose, onEdit, onDelete }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!record) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [record, onClose]);

  if (!mounted || !record) return null;

  const hasNotes = Boolean(String(record.notes || '').replace(/<[^>]*>/g, '').trim());

  return createPortal(
    <div
      className={cn('app-dialog-overlay', dialogOverlayClass)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(dialogCardClass, 'max-w-[520px]')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-record-view-title"
      >
        <h3 id="exit-record-view-title" className="m-0 text-lg font-semibold text-ink">
          {t('viewTitle')}
        </h3>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wider text-ink-faint">{t('candidateName')}</dt>
            <dd className="m-0 mt-0.5 text-ink">{record.candidateName}</dd>
            {record.candidateEmail ? (
              <dd className="m-0 text-xs text-ink-muted">
                {t('email')}: {record.candidateEmail}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wider text-ink-faint">{t('exitDate')}</dt>
            <dd className="m-0 mt-0.5 text-ink">{formatDate(record.exitDate)}</dd>
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wider text-ink-faint">{t('exitType')}</dt>
            <dd className="m-0 mt-0.5 text-ink">{t(record.exitType)}</dd>
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wider text-ink-faint">{t('exitReason')}</dt>
            <dd className="m-0 mt-0.5 text-ink">{t(record.exitReason)}</dd>
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wider text-ink-faint">{t('notes')}</dt>
            <dd className="m-0 mt-1">
              {hasNotes ? (
                <RichTextView html={record.notes} className="rounded-control border border-ink/8 bg-canvas px-3 py-2" />
              ) : (
                <span className="text-ink-muted">{t('noNotes')}</span>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {canWrite ? (
            <>
              <button type="button" onClick={onEdit} className={dialogBtnGhostClass}>
                {t('edit')}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={cn(dialogBtnGhostClass, 'border-danger/30 text-danger')}
              >
                {t('delete')}
              </button>
            </>
          ) : null}
          <button type="button" onClick={onClose} className={dialogBtnPrimaryClass}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
