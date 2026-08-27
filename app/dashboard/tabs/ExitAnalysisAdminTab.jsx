'use client';
import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { EXIT_REASONS, EXIT_TYPES } from '../../../lib/domain-status';
import { S } from '../dashboard-shared';

export function ExitAnalysisAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { promptForm, toast } = useAppFeedback();

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
        voluntary: 'Voluntária',
        involuntary: 'Involuntária',
        mutual: 'Acordo mútuo',
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
        formTitle: 'Registrar Saída',
        formCandidate: 'Colaborador',
        formCandidatePh: 'Buscar por nome…',
        formCandidateHelp: 'Digite o nome e selecione na lista. O ID é gravado automaticamente.',
        formExitDate: 'Data da saída',
        formExitType: 'Tipo de saída',
        formExitReason: 'Motivo principal',
        formNotes: 'Notas (contexto, feedback)',
        registered: 'Saída registrada',
        loadError: 'Erro ao carregar saídas',
        saveError: 'Erro ao registrar saída',
        pickEmployee: 'Selecione um colaborador na busca.',
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
        voluntary: 'Voluntary',
        involuntary: 'Involuntary',
        mutual: 'Mutual agreement',
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
        formTitle: 'Register Exit',
        formCandidate: 'Employee',
        formCandidatePh: 'Search by name…',
        formCandidateHelp: 'Type a name and pick from the list. The ID is saved automatically.',
        formExitDate: 'Exit date',
        formExitType: 'Exit type',
        formExitReason: 'Main reason',
        formNotes: 'Notes (context, feedback)',
        registered: 'Exit recorded',
        loadError: 'Failed to load exits',
        saveError: 'Failed to record exit',
        pickEmployee: 'Select an employee from search.',
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
          searchUrl: '/api/admin/employees/search',
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
        body: JSON.stringify({
          candidateId,
          exitDate: result.exitDate,
          exitType: result.exitType,
          exitReason: result.exitReason,
          notes: result.notes,
        }),
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

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR');
  }

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">{t('title')}</h2>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <button type="button" onClick={handleRegisterExit} className={S.btnPrimary}>
            + {t('register')}
          </button>
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState title={t('noRecords')} description={t('noRecordsDesc')} icon="📊" />
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
