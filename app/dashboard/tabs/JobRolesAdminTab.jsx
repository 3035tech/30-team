'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
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
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import {
  AdminRichFormDrawer,
  dialogBtnGhostClass,
  dialogBtnPrimaryClass,
} from '../../_components/AdminRichFormDrawer';
import { RubricEditor } from '../../_components/RubricEditor';
import { fieldInputClass } from '../../_components/form-control-styles';

const FIELD = `${fieldInputClass} w-full font-mono text-xs`;
const FIELD_LABEL = 'flex flex-col gap-1.5 font-mono text-[11px] text-ink-faint';

const emptyForm = () => ({
  name: '',
  description: '',
  rubric: {},
});

export function JobRolesAdminTab({ locale, companyId }) {
  const { toast, confirm, notice } = useAppFeedback();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [drawerMode, setDrawerMode] = useState(null); // 'create' | 'edit' | null
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const loadRoles = async () => {
    if (!companyId) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/job-roles?companyId=${companyId}`);
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('[JobRolesAdminTab] Load error:', err);
      setError(t(locale, 'panel.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDrawerMode('create');
  };

  const openEdit = (role) => {
    setEditingId(role.id);
    setForm({
      name: role.name || '',
      description: role.description || '',
      rubric: role.rubric && typeof role.rubric === 'object' ? { ...role.rubric } : {},
    });
    setDrawerMode('edit');
  };

  const closeDrawer = () => {
    if (saving || aiBusy) return;
    setDrawerMode(null);
    setEditingId(null);
    setForm(emptyForm());
  };

  const suggestRubricAi = async () => {
    const name = String(form.name || '').trim();
    if (name.length < 2) {
      toast(t(locale, 'jobRoles.rubricAiNeedName'), 'error');
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch('/api/admin/job-roles/rubric-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: String(form.description || '').trim() || null,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.errorCode || data?.error || '';
        if (code === 'RUBRIC_AI_NOT_CONFIGURED') {
          throw new Error(t(locale, 'jobRoles.rubricAiNotConfigured'));
        }
        if (code === 'RUBRIC_AI_PARSE') {
          throw new Error(t(locale, 'jobRoles.rubricAiParseError'));
        }
        throw new Error(data?.error || t(locale, 'jobRoles.rubricAiFailed'));
      }
      const rubric = data.rubric && typeof data.rubric === 'object' ? data.rubric : {};
      if (Object.keys(rubric).length === 0) {
        throw new Error(t(locale, 'jobRoles.rubricAiParseError'));
      }
      setForm((cur) => ({ ...cur, rubric }));
      toast(t(locale, 'jobRoles.rubricAiApplied'), 'success');
      if (data.notes) {
        void notice({
          title: t(locale, 'jobRoles.rubricAiNotesTitle'),
          message: String(data.notes),
          tone: 'info',
        });
      }
    } catch (err) {
      toast(err?.message || t(locale, 'jobRoles.rubricAiFailed'), 'error');
    } finally {
      setAiBusy(false);
    }
  };

  const saveForm = async () => {
    const name = String(form.name || '').trim();
    if (!name) {
      toast(t(locale, 'jobRoles.errorNameRequired'), 'error');
      return;
    }

    setSaving(true);
    try {
      if (drawerMode === 'create') {
        const res = await fetch('/api/admin/job-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            name,
            description: form.description?.trim() || null,
            rubric: form.rubric || {},
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.errorCode || data?.error || 'create_failed');
        }
        toast(t(locale, 'jobRoles.createSuccess'), 'success');
      } else if (drawerMode === 'edit' && editingId) {
        const res = await fetch(`/api/admin/job-roles/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: form.description?.trim() || null,
            rubric: form.rubric || {},
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.errorCode || data?.error || 'update_failed');
        }
        toast(t(locale, 'jobRoles.updateSuccess'), 'success');
      }
      setDrawerMode(null);
      setEditingId(null);
      setForm(emptyForm());
      await loadRoles();
    } catch (err) {
      console.error('[JobRolesAdminTab] Save error:', err);
      const code = err?.message;
      if (code === 'JOB_ROLE_NAME_EXISTS') {
        toast(t(locale, 'jobRoles.errorNameExists'), 'error');
      } else if (code === 'INVALID_RUBRIC') {
        toast(t(locale, 'jobRoles.errorInvalidRubric'), 'error');
      } else {
        toast(
          drawerMode === 'create'
            ? t(locale, 'jobRoles.errorNameRequired')
            : t(locale, 'panel.common.error'),
          'error'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (role) => {
    const confirmed = await confirm(t(locale, 'jobRoles.deactivateConfirm'));
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/job-roles/${role.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('deactivate_failed');

      toast(t(locale, 'jobRoles.deactivateSuccess'), 'success');
      loadRoles();
    } catch (err) {
      console.error('[JobRolesAdminTab] Deactivate error:', err);
      toast(t(locale, 'panel.common.error'), 'error');
    }
  };

  const sortedRoles = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const collator = locale === 'en' ? 'en' : 'pt-BR';
    const rows = [...roles];
    rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), collator) * dirMul);
    return rows;
  }, [roles, sort, sortDir, locale]);

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

  if (!companyId) {
    return (
      <div className={S.card}>
        <p className="text-ink-muted">{t(locale, 'jobRoles.selectCompany')}</p>
      </div>
    );
  }

  if (loading && roles.length === 0) {
    return <AppLoading />;
  }

  if (error) {
    return (
      <div className={S.card}>
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const drawerOpen = drawerMode === 'create' || drawerMode === 'edit';

  return (
    <div className="flex flex-col gap-4">
      <div className={S.card}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-lg font-medium text-ink">{t(locale, 'jobRoles.title')}</h2>
            <p className="text-sm text-ink-muted">{t(locale, 'jobRoles.subtitle')}</p>
          </div>
          <AdminCreateButton label={t(locale, 'jobRoles.createButton')} onClick={openCreate} />
        </div>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          title={t(locale, 'jobRoles.listEmpty')}
          message={t(locale, 'jobRoles.listEmptyDesc')}
          actionLabel={t(locale, 'jobRoles.createButton')}
          onAction={openCreate}
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink/10 bg-surface">
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <SortableTh columnKey="name" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t(locale, 'jobRoles.nameLabel')}
                </SortableTh>
                <AdminActionsTh>{t(locale, 'panel.admin.colActions')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {pageRows.map((role) => {
                const rubric = role.rubric && typeof role.rubric === 'object' ? role.rubric : {};
                const rubricKeys = Object.keys(rubric).filter((k) => Number(rubric[k]) > 0);
                return (
                  <tr key={role.id} className="hover:bg-canvas-alt/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">{role.name}</p>
                      {role.description ? (
                        <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{role.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-ink-faint">
                        {rubricKeys.length > 0
                          ? `${rubricKeys.length} ${t(locale, 'jobRoles.rubricTypesCount')}`
                          : t(locale, 'jobRoles.rubricEmpty')}
                        {!role.active ? (
                          <span className="ml-2 rounded bg-ink/10 px-1.5 py-0.5 font-mono text-ink-muted">
                            {t(locale, 'jobRoles.inactive')}
                          </span>
                        ) : null}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {role.active ? (
                        <AdminActionsCell>
                          <AdminEditButton
                            label={t(locale, 'jobRoles.editButton')}
                            onClick={() => openEdit(role)}
                          />
                          <AdminDeleteButton
                            label={t(locale, 'jobRoles.deactivateButton')}
                            onClick={() => handleDeactivate(role)}
                          />
                        </AdminActionsCell>
                      ) : null}
                    </td>
                  </tr>
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

      <AdminRichFormDrawer
        open={drawerOpen}
        title={
          drawerMode === 'edit'
            ? t(locale, 'jobRoles.editDrawerTitle')
            : t(locale, 'jobRoles.createDrawerTitle')
        }
        locale={locale}
        onClose={closeDrawer}
        footer={(
          <>
            <button
              type="button"
              onClick={closeDrawer}
              disabled={saving || aiBusy}
              className={dialogBtnGhostClass}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={saveForm}
              disabled={saving || aiBusy || !String(form.name || '').trim()}
              className={cn(
                dialogBtnPrimaryClass,
                'inline-flex items-center gap-2',
                (saving || aiBusy || !String(form.name || '').trim()) && 'opacity-60'
              )}
            >
              {saving ? <span className="spinner" /> : null}
              {drawerMode === 'edit'
                ? t(locale, 'panel.admin.save')
                : t(locale, 'panel.admin.create')}
            </button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <label className={FIELD_LABEL}>
            {t(locale, 'jobRoles.nameLabel')}
            <input
              value={form.name}
              onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))}
              placeholder={t(locale, 'jobRoles.namePlaceholder')}
              className={FIELD}
              autoFocus
            />
          </label>

          <label className={FIELD_LABEL}>
            {t(locale, 'jobRoles.descriptionLabel')}
            <textarea
              value={form.description}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder={t(locale, 'jobRoles.descriptionPlaceholder')}
              rows={3}
              className={cn(FIELD, 'min-h-[72px] resize-y font-ui')}
            />
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="m-0 font-mono text-[11px] text-ink-faint">{t(locale, 'jobRoles.rubricLabel')}</p>
                <p className="m-0 mt-0.5 text-xs text-ink-muted">{t(locale, 'jobRoles.rubricHint')}</p>
              </div>
              <button
                type="button"
                onClick={suggestRubricAi}
                disabled={saving || aiBusy || !String(form.name || '').trim()}
                aria-busy={aiBusy || undefined}
                className={cn(
                  'inline-flex min-h-touch shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-500/35 bg-brand-500/[0.09] px-3 py-2 font-mono text-[11px] text-brand-500',
                  (saving || aiBusy || !String(form.name || '').trim()) && 'cursor-default opacity-60'
                )}
              >
                {aiBusy ? (
                  <AppLoading locale={locale} variant="button" label={t(locale, 'jobRoles.rubricAiWorking')} />
                ) : (
                  t(locale, 'jobRoles.rubricAiSuggest')
                )}
              </button>
            </div>
            <p className="m-0 text-[11px] leading-normal text-ink-faint">{t(locale, 'jobRoles.rubricAiHint')}</p>
            <RubricEditor
              value={form.rubric}
              onChange={(rubric) => setForm((cur) => ({ ...cur, rubric }))}
              locale={locale}
            />
          </div>
        </div>
      </AdminRichFormDrawer>
    </div>
  );
}
