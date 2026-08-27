'use client';

/**
 * Performance Reviews Admin Tab — manage cycles, goals, and reviews → PDI (B-1004).
 */

import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';

export function PerformanceReviewsAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, promptForm, toast } = useAppFeedback();

  const t = (key) => {
    // Simplified i18n for demo - in production, use lib/i18n.js
    const messages = {
      'pt-BR': {
        title: 'Avaliações de Desempenho',
        subtitle: 'Ciclos, metas e avaliação → PDI',
        listEmpty: 'Nenhum ciclo cadastrado',
        createCycleButton: 'Novo Ciclo',
        cycleTitle: 'Título do ciclo',
        cycleTitlePlaceholder: 'Ex: Avaliação 2026 S1',
        cycleDescription: 'Descrição',
        periodStart: 'Início',
        periodEnd: 'Fim',
        statusDraft: 'Rascunho',
        statusActive: 'Ativo',
        statusClosed: 'Fechado',
        reviewsCount: 'avaliações',
        submittedCount: 'submetidas',
        createCycleSuccess: 'Ciclo criado com sucesso',
        errorCycleTitleRequired: 'Título do ciclo é obrigatório',
        autoPdiNote: '💡 Outcome "Desenvolver" gera item PDI automaticamente para o colaborador',
      },
      en: {
        title: 'Performance Reviews',
        subtitle: 'Cycles, goals, and review → PDI',
        listEmpty: 'No cycles registered',
        createCycleButton: 'New Cycle',
        cycleTitle: 'Cycle title',
        cycleTitlePlaceholder: 'E.g.: 2026 H1 Review',
        cycleDescription: 'Description',
        periodStart: 'Start',
        periodEnd: 'End',
        statusDraft: 'Draft',
        statusActive: 'Active',
        statusClosed: 'Closed',
        reviewsCount: 'reviews',
        submittedCount: 'submitted',
        createCycleSuccess: 'Cycle created successfully',
        errorCycleTitleRequired: 'Cycle title is required',
        autoPdiNote: '💡 Outcome "Develop" automatically generates a PDI item for the employee',
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
      toast({ title: 'Erro ao carregar ciclos', level: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCycle() {
    const result = await promptForm({
      title: t('createCycleButton'),
      fields: [
        { name: 'title', label: t('cycleTitle'), placeholder: t('cycleTitlePlaceholder'), required: true },
        { name: 'description', label: t('cycleDescription'), type: 'textarea', rows: 3 },
        { name: 'periodStart', label: t('periodStart'), type: 'date' },
        { name: 'periodEnd', label: t('periodEnd'), type: 'date' },
      ],
    });
    if (!result) return;

    if (!result.title || String(result.title).trim().length === 0) {
      toast({ title: t('errorCycleTitleRequired'), level: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/admin/performance-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: t('createCycleSuccess'), level: 'success' });
      loadCycles();
    } catch (err) {
      console.error('Create cycle error:', err);
      toast({ title: 'Erro ao criar ciclo', level: 'error' });
    }
  }

  function getStatusColor(status) {
    if (status === 'active') return 'text-success';
    if (status === 'closed') return 'text-ink-muted';
    return 'text-warning';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale);
  }

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="text-sm text-ink-muted">{t('subtitle')}</p>
        <div className="rounded-lg border border-info/20 bg-info/5 px-3 py-2 text-xs text-ink-muted">
          {t('autoPdiNote')}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCreateCycle}
          className="inline-flex min-h-touch items-center rounded-control bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + {t('createCycleButton')}
        </button>
      </div>

      {/* List */}
      {cycles.length === 0 ? (
        <EmptyState message={t('listEmpty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="rounded-card border border-ink/8 bg-canvas p-4 hover:border-ink/16"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-medium text-ink">{cycle.title}</h3>
                    {cycle.description && (
                      <p className="text-sm text-ink-muted">{cycle.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(cycle.status)}`}>
                    {t(`status${cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
                  {cycle.periodStart && (
                    <span>
                      {t('periodStart')}: {formatDate(cycle.periodStart)}
                    </span>
                  )}
                  {cycle.periodEnd && (
                    <span>
                      {t('periodEnd')}: {formatDate(cycle.periodEnd)}
                    </span>
                  )}
                  <span>
                    {cycle.reviewCount || 0} {t('reviewsCount')} ({cycle.submittedCount || 0} {t('submittedCount')})
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
