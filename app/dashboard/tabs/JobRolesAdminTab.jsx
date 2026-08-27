'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { Icon } from '../../_components/Icon';
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
  const { toast, confirm } = useAppFeedback();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [drawerMode, setDrawerMode] = useState(null); // 'create' | 'edit' | null
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

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
    if (saving) return;
    setDrawerMode(null);
    setEditingId(null);
    setForm(emptyForm());
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

  if (!companyId) {
    return (
      <div className={S.card}>
        <p className="text-ink-muted">{t(locale, 'jobRoles.selectCompany')}</p>
      </div>
    );
  }

  if (loading && roles.length === 0) {
    return (
      <div className={S.card}>
        <div className="flex items-center gap-2">
          <Icon name="loader" className="h-4 w-4 animate-spin text-ink-muted" />
          <span className="text-sm text-ink-muted">{t(locale, 'common.loading')}</span>
        </div>
      </div>
    );
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
          <button type="button" onClick={openCreate} className={S.btnPrimary}>
            <Icon name="plus" className="mr-1.5 h-3.5 w-3.5" />
            {t(locale, 'jobRoles.createButton')}
          </button>
        </div>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          title={t(locale, 'jobRoles.listEmpty')}
          actionLabel={t(locale, 'jobRoles.createButton')}
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-3">
          {roles.map((role) => {
            const rubric = role.rubric && typeof role.rubric === 'object' ? role.rubric : {};
            const rubricKeys = Object.keys(rubric).filter((k) => Number(rubric[k]) > 0);
            return (
              <div key={role.id} className={S.card}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-medium text-ink">{role.name}</h3>
                    {role.description ? (
                      <p className="mb-2 text-sm text-ink-muted">{role.description}</p>
                    ) : null}
                    <div className="mb-2 flex flex-wrap gap-2 text-xs text-ink-faint">
                      {rubricKeys.length > 0 ? (
                        <span>
                          {rubricKeys.length} {t(locale, 'jobRoles.rubricTypesCount')}
                        </span>
                      ) : (
                        <span>{t(locale, 'jobRoles.rubricEmpty')}</span>
                      )}
                      {!role.active ? (
                        <span className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-ink-muted">
                          {t(locale, 'jobRoles.inactive')}
                        </span>
                      ) : null}
                    </div>
                    {rubricKeys.length > 0 ? (
                      <RubricEditor value={rubric} locale={locale} compact />
                    ) : null}
                  </div>

                  {role.active ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(role)}
                        className={S.btnGhost}
                        title={t(locale, 'jobRoles.editButton')}
                        aria-label={t(locale, 'jobRoles.editButton')}
                      >
                        <Icon name="edit-2" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(role)}
                        className={S.btnGhost}
                        title={t(locale, 'jobRoles.deactivateButton')}
                        aria-label={t(locale, 'jobRoles.deactivateButton')}
                      >
                        <Icon name="trash-2" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
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
              disabled={saving}
              className={dialogBtnGhostClass}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={saveForm}
              disabled={saving || !String(form.name || '').trim()}
              className={cn(
                dialogBtnPrimaryClass,
                'inline-flex items-center gap-2',
                (saving || !String(form.name || '').trim()) && 'opacity-60'
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
            <div>
              <p className="m-0 font-mono text-[11px] text-ink-faint">{t(locale, 'jobRoles.rubricLabel')}</p>
              <p className="m-0 mt-0.5 text-xs text-ink-muted">{t(locale, 'jobRoles.rubricHint')}</p>
            </div>
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
