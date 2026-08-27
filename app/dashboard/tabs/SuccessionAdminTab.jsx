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
  const [expandedRoles, setExpandedRoles] = useState(new Set());
  const [successorsByRole, setSuccessorsByRole] = useState({});
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
      // Load successors if not already loaded
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
          {roles.map((role) => {
            const isExpanded = expandedRoles.has(role.id);
            const successors = successorsByRole[role.id] || [];
            return (
              <div
                key={role.id}
                className="rounded-card border border-ink/8 bg-canvas p-4 hover:border-ink/16"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1 flex-1">
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
                    <button
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
                    >
                      <span>
                        {role.successorCount || 0} {t('successorsCount')}
                      </span>
                      <span>{isExpanded ? '▼' : '►'}</span>
                    </button>
                  </div>
                  {isExpanded && successors.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2 border-t border-ink/8 pt-2">
                      {successors.map((successor) => {
                        const colors = getReadinessColor(successor.readiness);
                        return (
                          <div
                            key={successor.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-ink/8 bg-ink/[0.02] p-2"
                          >
                            <span className="text-sm text-ink">{successor.candidateName || 'N/A'}</span>
                            <span
                              className={`rounded-full border px-2 py-px font-mono text-[11px] ${colors.bg} ${colors.border} ${colors.text}`}
                            >
                              {getReadinessLabel(successor.readiness)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded && successors.length === 0 && (
                    <div className="mt-2 border-t border-ink/8 pt-2 text-center text-xs italic text-ink-muted">
                      {locale === 'en' ? 'No successors yet' : 'Nenhum sucessor ainda'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
