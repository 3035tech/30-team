'use client';

/**
 * Succession Admin Tab — critical roles + successors + readiness (B-1005).
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/cn';
import Link from 'next/link';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { htmlToPlainText } from '../../../lib/sanitize-html';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminListPager,
  S,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';

export function SuccessionAdminTab({ locale = 'pt-BR', companyId }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState(new Set());
  const [successorsByRole, setSuccessorsByRole] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const [nameQ, setNameQ] = useState('');
  const { confirm, promptForm, toast } = useAppFeedback();

  const t = (key) => {
    const messages = {
      'pt-BR': {
        title: 'Sucessão',
        subtitle: 'Papéis críticos + sucessores + prontidão',
        listEmpty: 'Nenhum papel crítico cadastrado',
        searchNamePh: 'Buscar por título…',
        listEmptyDesc:
          'Comece por um papel de alto impacto; depois atribua sucessores e acompanhe prontidão na Equipe.',
        createRoleButton: 'Novo Papel Crítico',
        ctaTeam: 'Ver Equipe',
        ctaHelp: 'Roteiro no Guia',
        roleTitle: 'Título do papel',
        roleTitlePlaceholder: 'Ex: Diretor Comercial, CTO...',
        roleDescription: 'Descrição',
        impactLevel: 'Nível de impacto',
        impactHigh: 'Alto',
        impactCritical: 'Crítico',
        successorsCount: 'Sucessores',
        createRoleSuccess: 'Papel crítico criado',
        updateRoleSuccess: 'Papel atualizado',
        deactivateRoleSuccess: 'Papel desativado',
        errorRoleTitleRequired: 'Título é obrigatório',
        loadError: 'Erro ao carregar papéis críticos',
        saveError: 'Erro ao salvar',
        edit: 'Editar',
        deactivate: 'Desativar',
        actions: 'Ações',
        expand: 'Ver sucessores',
        collapse: 'Ocultar',
        noSuccessors: 'Nenhum sucessor ainda',
        confirmDeactivate: 'Desativar este papel crítico?',
        editRoleTitle: 'Editar papel crítico',
      },
      en: {
        title: 'Succession',
        subtitle: 'Critical roles + successors + readiness',
        listEmpty: 'No critical roles registered',
        searchNamePh: 'Search by title…',
        listEmptyDesc:
          'Start with a high-impact role; then assign successors and track readiness in Team.',
        createRoleButton: 'New Critical Role',
        ctaTeam: 'Open Team',
        ctaHelp: 'Demo path in Help',
        roleTitle: 'Role title',
        roleTitlePlaceholder: 'E.g.: Sales Director, CTO...',
        roleDescription: 'Description',
        impactLevel: 'Impact level',
        impactHigh: 'High',
        impactCritical: 'Critical',
        successorsCount: 'Successors',
        createRoleSuccess: 'Critical role created',
        updateRoleSuccess: 'Role updated',
        deactivateRoleSuccess: 'Role deactivated',
        errorRoleTitleRequired: 'Title is required',
        loadError: 'Failed to load critical roles',
        saveError: 'Failed to save',
        edit: 'Edit',
        deactivate: 'Deactivate',
        actions: 'Actions',
        expand: 'View successors',
        collapse: 'Hide',
        noSuccessors: 'No successors yet',
        confirmDeactivate: 'Deactivate this critical role?',
        editRoleTitle: 'Edit critical role',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  };

  useEffect(() => {
    loadRoles();
  }, [companyId]);

  async function loadRoles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/succession/critical-roles?limit=40`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Load roles error:', err);
      toast(t('loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function roleFormFields(role) {
    return [
      {
        name: 'title',
        label: t('roleTitle'),
        placeholder: t('roleTitlePlaceholder'),
        required: true,
        value: role?.title || '',
      },
      {
        name: 'description',
        label: t('roleDescription'),
        type: 'richText',
        minHeight: 100,
        value: role?.description || '',
      },
      {
        name: 'impactLevel',
        label: t('impactLevel'),
        type: 'select',
        options: [
          { value: 'high', label: t('impactHigh') },
          { value: 'critical', label: t('impactCritical') },
        ],
        value: role?.impactLevel || 'high',
        defaultValue: role?.impactLevel || 'high',
      },
    ];
  }

  async function handleCreateRole() {
    const result = await promptForm({
      title: t('createRoleButton'),
      fields: roleFormFields(null),
    });
    if (!result) return;

    if (!result.title || String(result.title).trim().length === 0) {
      toast(t('errorRoleTitleRequired'), 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/succession/critical-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('createRoleSuccess'), 'success');
      loadRoles();
    } catch (err) {
      console.error('Create role error:', err);
      toast(t('saveError'), 'error');
    }
  }

  async function handleEditRole(role) {
    const result = await promptForm({
      title: t('editRoleTitle'),
      fields: roleFormFields(role),
    });
    if (!result) return;

    if (!result.title || String(result.title).trim().length === 0) {
      toast(t('errorRoleTitleRequired'), 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/succession/critical-roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          description: result.description,
          impactLevel: result.impactLevel,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('updateRoleSuccess'), 'success');
      loadRoles();
    } catch (err) {
      console.error('Edit role error:', err);
      toast(t('saveError'), 'error');
    }
  }

  async function handleDeactivateRole(role) {
    const ok = await confirm(t('confirmDeactivate'));
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/succession/critical-roles/${role.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(t('deactivateRoleSuccess'), 'success');
      loadRoles();
    } catch (err) {
      console.error('Deactivate role error:', err);
      toast(t('saveError'), 'error');
    }
  }

  function getImpactColor(level) {
    return level === 'critical' ? 'text-danger' : 'text-warning';
  }

  function getImpactLabel(level) {
    if (level === 'critical') return t('impactCritical');
    return t('impactHigh');
  }

  function getReadinessColor(readiness) {
    switch (readiness) {
      case 'now':
        return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' };
      case 'ready':
        return { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info' };
      case 'developing':
        return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' };
      case 'not_ready':
        return { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger' };
      default:
        return { bg: 'bg-ink/5', border: 'border-ink/10', text: 'text-ink-muted' };
    }
  }

  function getReadinessLabel(readiness) {
    const labels = {
      'pt-BR': {
        now: 'Pronto agora',
        ready: 'Pronto',
        developing: 'Em desenvolvimento',
        not_ready: 'Não pronto',
      },
      en: {
        now: 'Ready now',
        ready: 'Ready',
        developing: 'Developing',
        not_ready: 'Not ready',
      },
    };
    return labels[locale]?.[readiness] || labels['pt-BR'][readiness] || readiness;
  }

  async function toggleRole(roleId) {
    const newExpanded = new Set(expandedRoles);
    if (expandedRoles.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
      if (!successorsByRole[roleId]) {
        try {
          const res = await fetch(`/api/admin/succession/critical-roles/${roleId}/successors?limit=20`);
          if (res.ok) {
            const data = await res.json();
            setSuccessorsByRole((prev) => ({ ...prev, [roleId]: data.successors || [] }));
          }
        } catch (err) {
          console.error('Load successors error:', err);
        }
      }
    }
    setExpandedRoles(newExpanded);
  }

  const sortedRoles = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const collator = locale === 'en' ? 'en' : 'pt-BR';
    const q = String(nameQ || '').trim().toLowerCase();
    const rows = [...roles].filter((row) => {
      if (!q) return true;
      return String(row.title || '').toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      if (sort === 'successorCount') {
        return ((Number(a.successorCount) || 0) - (Number(b.successorCount) || 0)) * dirMul;
      }
      if (sort === 'impactLevel') {
        const rank = (v) => (v === 'critical' ? 2 : 1);
        return (rank(a.impactLevel) - rank(b.impactLevel)) * dirMul;
      }
      return String(a.title || '').localeCompare(String(b.title || ''), collator) * dirMul;
    });
    return rows;
  }, [roles, sort, sortDir, locale, nameQ]);

  const total = sortedRoles.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRoles.slice((safePage - 1) * pageSize, safePage * pageSize);

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
      </div>

      <div className="flex items-center gap-3">
        <AdminCreateButton label={t('createRoleButton')} onClick={handleCreateRole} />
      </div>

      {roles.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={nameQ}
            onChange={(e) => { setNameQ(e.target.value); setPage(1); }}
            placeholder={t('searchNamePh')}
            aria-label={t('searchNamePh')}
            className={cn(S.input, 'max-w-xs')}
          />
        </div>
      ) : null}

      {roles.length === 0 ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            title={t('listEmpty')}
            message={t('listEmptyDesc')}
            actionLabel={t('createRoleButton')}
            onAction={handleCreateRole}
          />
          <div className="flex flex-wrap gap-3 px-1">
            <Link href="/dashboard?tab=team" className="font-mono text-[12px] text-brand-600 hover:underline">
              {t('ctaTeam')} →
            </Link>
            <Link href="/dashboard?tab=help" className="font-mono text-[12px] text-brand-600 hover:underline">
              {t('ctaHelp')} →
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink/10 bg-surface">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <SortableTh columnKey="title" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('roleTitle')}
                </SortableTh>
                <SortableTh columnKey="impactLevel" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('impactLevel')}
                </SortableTh>
                <SortableTh columnKey="successorCount" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('successorsCount')}
                </SortableTh>
                <AdminActionsTh>{t('actions')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {pageRows.map((role) => {
                const isExpanded = expandedRoles.has(role.id);
                const successors = successorsByRole[role.id] || [];
                return (
                  <Fragment key={role.id}>
                    <tr className="hover:bg-canvas-alt/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-ink">{role.title}</p>
                        {role.description ? (
                          <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">
                            {htmlToPlainText(role.description)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${getImpactColor(role.impactLevel)}`}>
                          {getImpactLabel(role.impactLevel)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">
                        {role.successorCount || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AdminActionsCell>
                          <button
                            type="button"
                            onClick={() => toggleRole(role.id)}
                            className="min-h-touch rounded-control px-2 text-xs text-brand-600 hover:bg-brand-500/10"
                          >
                            {isExpanded ? t('collapse') : t('expand')}
                          </button>
                          <AdminEditButton label={t('edit')} onClick={() => handleEditRole(role)} />
                          <AdminDeleteButton
                            label={t('deactivate')}
                            onClick={() => handleDeactivateRole(role)}
                          />
                        </AdminActionsCell>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr>
                        <td colSpan={4} className="bg-canvas-alt/40 px-4 py-3">
                          {successors.length === 0 ? (
                            <p className="text-center text-xs italic text-ink-muted">{t('noSuccessors')}</p>
                          ) : (
                            <ul className="flex flex-col gap-2">
                              {successors.map((successor) => {
                                const colors = getReadinessColor(successor.readiness);
                                return (
                                  <li
                                    key={successor.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-ink/8 bg-surface px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="text-sm text-ink">
                                        {successor.candidateName || 'N/A'}
                                      </span>
                                      {successor.candidateId ? (
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          <Link
                                            href={`/dashboard?tab=team&candidate=${successor.candidateId}`}
                                            className="font-mono text-[11px] text-brand-600 hover:underline"
                                          >
                                            {locale === 'en' ? 'Open on Team' : 'Abrir na Equipe'}
                                          </Link>
                                          {(successor.readiness === 'developing' ||
                                            successor.readiness === 'not_ready') && (
                                            <Link
                                              href={`/dashboard?tab=team&candidate=${successor.candidateId}&section=journey`}
                                              className="font-mono text-[11px] text-brand-600 hover:underline"
                                            >
                                              PDI
                                            </Link>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                    <span
                                      className={`rounded-full border px-2 py-px font-mono text-[11px] ${colors.bg} ${colors.border} ${colors.text}`}
                                    >
                                      {getReadinessLabel(successor.readiness)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
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
