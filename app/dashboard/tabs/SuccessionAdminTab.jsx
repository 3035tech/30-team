'use client';

/**
 * Succession Admin Tab — critical roles + successors + readiness (B-1005).
 */

import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';

export function SuccessionAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, promptForm, toast } = useAppFeedback();

  const t = (key) => {
    const messages = {
      'pt-BR': {
        title: 'Sucessão',
        subtitle: 'Papéis críticos + sucessores + prontidão',
        listEmpty: 'Nenhum papel crítico cadastrado',
        createRoleButton: 'Novo Papel Crítico',
        roleTitle: 'Título do papel',
        roleTitlePlaceholder: 'Ex: Diretor Comercial, CTO...',
        roleDescription: 'Descrição',
        impactLevel: 'Nível de impacto',
        impactHigh: 'Alto',
        impactCritical: 'Crítico',
        successorsCount: 'sucessor(es)',
        createRoleSuccess: 'Papel crítico criado',
        errorRoleTitleRequired: 'Título é obrigatório',
      },
      en: {
        title: 'Succession',
        subtitle: 'Critical roles + successors + readiness',
        listEmpty: 'No critical roles registered',
        createRoleButton: 'New Critical Role',
        roleTitle: 'Role title',
        roleTitlePlaceholder: 'E.g.: Sales Director, CTO...',
        roleDescription: 'Description',
        impactLevel: 'Impact level',
        impactHigh: 'High',
        impactCritical: 'Critical',
        successorsCount: 'successor(s)',
        createRoleSuccess: 'Critical role created',
        errorRoleTitleRequired: 'Title is required',
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
      toast({ title: 'Erro ao carregar papéis críticos', level: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRole() {
    const result = await promptForm({
      title: t('createRoleButton'),
      fields: [
        { name: 'title', label: t('roleTitle'), placeholder: t('roleTitlePlaceholder'), required: true },
        { name: 'description', label: t('roleDescription'), type: 'textarea', rows: 3 },
        {
          name: 'impactLevel',
          label: t('impactLevel'),
          type: 'select',
          options: [
            { value: 'high', label: t('impactHigh') },
            { value: 'critical', label: t('impactCritical') },
          ],
          defaultValue: 'high',
        },
      ],
    });
    if (!result) return;

    if (!result.title || String(result.title).trim().length === 0) {
      toast({ title: t('errorRoleTitleRequired'), level: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/admin/succession/critical-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: t('createRoleSuccess'), level: 'success' });
      loadRoles();
    } catch (err) {
      console.error('Create role error:', err);
      toast({ title: 'Erro ao criar papel', level: 'error' });
    }
  }

  function getImpactColor(level) {
    return level === 'critical' ? 'text-danger' : 'text-warning';
  }

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="text-sm text-ink-muted">{t('subtitle')}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCreateRole}
          className="inline-flex min-h-touch items-center rounded-control bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + {t('createRoleButton')}
        </button>
      </div>

      {/* List */}
      {roles.length === 0 ? (
        <EmptyState message={t('listEmpty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-card border border-ink/8 bg-canvas p-4 hover:border-ink/16"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-medium text-ink">{role.title}</h3>
                    {role.description && (
                      <p className="text-sm text-ink-muted">{role.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${getImpactColor(role.impactLevel)}`}>
                    {t(`impact${role.impactLevel.charAt(0).toUpperCase() + role.impactLevel.slice(1)}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
                  <span>
                    {role.successorCount || 0} {t('successorsCount')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
