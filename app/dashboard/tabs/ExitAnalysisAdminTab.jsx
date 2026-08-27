'use client';
import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';

export function ExitAnalysisAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, promptForm, toast } = useAppFeedback();

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Análise Demissional',
        subtitle: 'Registro de saídas e insights para melhorar seleção e gestão',
        register: 'Registrar Saída',
        noRecords: 'Nenhuma saída registrada',
        noRecordsDesc: 'Registre saídas de colaboradores para análise',
        exitDate: 'Data',
        candidateName: 'Colaborador',
        exitType: 'Tipo',
        exitReason: 'Motivo',
        actions: 'Ações',
        edit: 'Editar',
        // Exit types
        voluntary: 'Voluntária',
        involuntary: 'Involuntária',
        mutual: 'Acordo mútuo',
        // Exit reasons
        better_offer: 'Proposta melhor',
        career_growth: 'Crescimento de carreira',
        compensation: 'Compensação',
        work_life_balance: 'Equilíbrio vida-trabalho',
        relocation: 'Mudança de cidade/país',
        personal: 'Pessoal',
        study: 'Estudos',
        entrepreneurship: 'Empreendedorismo',
        performance: 'Desempenho',
        conduct: 'Conduta',
        restructuring: 'Reestruturação',
        position_eliminated: 'Cargo eliminado',
        culture_fit: 'Fit cultural',
        manager_relationship: 'Relação com gestor',
        lack_of_challenge: 'Falta de desafio',
        other: 'Outro',
        // Form
        formTitle: 'Registrar Saída',
        formCandidate: 'Colaborador',
        formExitDate: 'Data da saída',
        formExitType: 'Tipo de saída',
        formExitReason: 'Motivo principal',
        formNotes: 'Notas (contexto, feedback)',
      },
      en: {
        title: 'Exit Analysis',
        subtitle: 'Exit records and insights to improve recruitment and management',
        register: 'Register Exit',
        noRecords: 'No exits recorded',
        noRecordsDesc: 'Register employee exits for analysis',
        exitDate: 'Date',
        candidateName: 'Employee',
        exitType: 'Type',
        exitReason: 'Reason',
        actions: 'Actions',
        edit: 'Edit',
        // Exit types
        voluntary: 'Voluntary',
        involuntary: 'Involuntary',
        mutual: 'Mutual agreement',
        // Exit reasons
        better_offer: 'Better offer',
        career_growth: 'Career growth',
        compensation: 'Compensation',
        work_life_balance: 'Work-life balance',
        relocation: 'Relocation',
        personal: 'Personal',
        study: 'Study',
        entrepreneurship: 'Entrepreneurship',
        performance: 'Performance',
        conduct: 'Conduct',
        restructuring: 'Restructuring',
        position_eliminated: 'Position eliminated',
        culture_fit: 'Culture fit',
        manager_relationship: 'Manager relationship',
        lack_of_challenge: 'Lack of challenge',
        other: 'Other',
        // Form
        formTitle: 'Register Exit',
        formCandidate: 'Employee',
        formExitDate: 'Exit date',
        formExitType: 'Exit type',
        formExitReason: 'Main reason',
        formNotes: 'Notes (context, feedback)',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  useEffect(() => {
    loadRecords();
  }, [companyId]);

  async function loadRecords() {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exit-analysis?limit=100`);
      const data = await res.json();
      if (data.ok) setRecords(data.records || []);
    } catch (err) {
      toast('error', 'Erro ao carregar saídas');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterExit() {
    // For simplicity, use promptForm with text inputs (not ideal UX, but quick)
    // In production, this should be a custom drawer/modal with selects for employee, type, reason
    const result = await promptForm({
      title: t('formTitle'),
      fields: [
        { name: 'candidateId', label: t('formCandidate') + ' (ID)', type: 'text', required: true },
        { name: 'exitDate', label: t('formExitDate'), type: 'text', required: true },
        { name: 'exitType', label: t('formExitType') + ' (voluntary/involuntary/mutual)', type: 'text', required: true },
        { name: 'exitReason', label: t('formExitReason'), type: 'text', required: true },
        { name: 'notes', label: t('formNotes'), type: 'textarea', required: false },
      ],
    });
    if (!result) return;

    try {
      const res = await fetch('/api/admin/exit-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', 'Saída registrada');
        loadRecords();
      } else {
        toast('error', 'Erro ao registrar saída');
      }
    } catch (err) {
      toast('error', 'Erro ao registrar saída');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR');
  }

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-ink">{t('title')}</h2>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="flex gap-2">
          <button
            onClick={handleRegisterExit}
            className="inline-flex items-center gap-2 rounded-control bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            + {t('register')}
          </button>
        </div>
      )}

      {/* List */}
      {records.length === 0 ? (
        <EmptyState
          title={t('noRecords')}
          description={t('noRecordsDesc')}
          icon="📊"
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink/10 bg-white">
          <table className="w-full">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('exitDate')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('candidateName')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('exitType')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('exitReason')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-canvas-alt/50">
                  <td className="px-4 py-3 text-sm text-ink">{formatDate(rec.exitDate)}</td>
                  <td className="px-4 py-3 text-sm text-ink">{rec.candidateName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        rec.exitType === 'voluntary'
                          ? 'bg-info/10 text-info'
                          : rec.exitType === 'involuntary'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {t(rec.exitType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{t(rec.exitReason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
