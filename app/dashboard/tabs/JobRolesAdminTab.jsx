'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { S } from '../dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { Icon } from '../../_components/Icon';

export function JobRolesAdminTab({ locale, companyId }) {
  const { promptForm, toast, confirm } = useAppFeedback();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');

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
      setError(t(locale, 'common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [companyId]);

  const handleCreate = async () => {
    const result = await promptForm({
      title: t(locale, 'jobRoles.createButton'),
      fields: [
        {
          name: 'name',
          label: t(locale, 'jobRoles.nameLabel'),
          type: 'text',
          required: true,
          placeholder: t(locale, 'jobRoles.namePlaceholder'),
        },
        {
          name: 'description',
          label: t(locale, 'jobRoles.descriptionLabel'),
          type: 'text',
          placeholder: t(locale, 'jobRoles.descriptionPlaceholder'),
        },
      ],
    });

    if (!result) return;

    try {
      const res = await fetch('/api/admin/job-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: result.name,
          description: result.description || null,
          rubric: {}, // Rubrica vazia por ora; edição posterior
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'create_failed');
      }

      toast(t(locale, 'jobRoles.createSuccess'), 'success');
      loadRoles();
    } catch (err) {
      console.error('[JobRolesAdminTab] Create error:', err);
      toast(t(locale, 'jobRoles.errorNameRequired'), 'error');
    }
  };

  const handleEdit = async (role) => {
    const result = await promptForm({
      title: t(locale, 'jobRoles.editButton'),
      fields: [
        {
          name: 'name',
          label: t(locale, 'jobRoles.nameLabel'),
          type: 'text',
          required: true,
          defaultValue: role.name,
        },
        {
          name: 'description',
          label: t(locale, 'jobRoles.descriptionLabel'),
          type: 'text',
          defaultValue: role.description || '',
        },
      ],
    });

    if (!result) return;

    try {
      const res = await fetch(`/api/admin/job-roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.name,
          description: result.description || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'update_failed');
      }

      toast(t(locale, 'jobRoles.updateSuccess'), 'success');
      loadRoles();
    } catch (err) {
      console.error('[JobRolesAdminTab] Update error:', err);
      toast(t(locale, 'common.error'), 'error');
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
      toast(t(locale, 'common.error'), 'error');
    }
  };

  if (!companyId) {
    return (
      <div className={S.card}>
        <p className="text-ink-muted">{t(locale, 'common.selectCompany')}</p>
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

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className={S.card}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-lg font-medium text-ink">{t(locale, 'jobRoles.title')}</h2>
            <p className="text-sm text-ink-muted">{t(locale, 'jobRoles.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className={S.btnPrimary}
          >
            <Icon name="plus" className="mr-1.5 h-3.5 w-3.5" />
            {t(locale, 'jobRoles.createButton')}
          </button>
        </div>
      </div>

      {/* Lista */}
      {roles.length === 0 ? (
        <EmptyState
          title={t(locale, 'jobRoles.listEmpty')}
          actionLabel={t(locale, 'jobRoles.createButton')}
          onAction={handleCreate}
        />
      ) : (
        <div className="grid gap-3">
          {roles.map((role) => (
            <div key={role.id} className={S.card}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-medium text-ink">{role.name}</h3>
                  {role.description && (
                    <p className="mb-2 text-sm text-ink-muted">{role.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-ink-faint">
                    {role.rubric && Object.keys(role.rubric).length > 0 && (
                      <span>
                        {Object.keys(role.rubric).length} {t(locale, 'jobRoles.rubricLabel')}
                      </span>
                    )}
                    {!role.active && (
                      <span className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-ink-muted">
                        {t(locale, 'common.inactive')}
                      </span>
                    )}
                  </div>
                </div>

                {role.active && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(role)}
                      className={S.btnGhost}
                      title={t(locale, 'jobRoles.editButton')}
                    >
                      <Icon name="edit-2" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(role)}
                      className={S.btnGhost}
                      title={t(locale, 'jobRoles.deactivateButton')}
                    >
                      <Icon name="trash-2" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
