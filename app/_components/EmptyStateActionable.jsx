'use client';

/**
 * Empty State Acionável — CTA claro quando lista vazia
 * Melhoria #1 (Sprint Quick Wins)
 */

export function EmptyStateActionable({
  icon,
  title,
  message,
  primaryAction,
  secondaryAction,
  illustration,
  tips = [],
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon ou Illustration */}
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : icon ? (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-canvas text-ink-muted">
          {icon}
        </div>
      ) : null}

      {/* Title */}
      <h3 className="mb-2 font-display text-lg font-semibold text-ink">{title}</h3>

      {/* Message */}
      <p className="mb-6 max-w-md font-ui text-sm text-ink-muted">{message}</p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="inline-flex min-h-touch items-center justify-center rounded-control bg-brand-500 px-6 py-3 font-ui text-prose font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
            {primaryAction.label}
          </button>
        )}

        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="inline-flex min-h-touch items-center justify-center rounded-control border border-ink/15 bg-surface px-6 py-3 font-ui text-prose font-medium text-ink transition-colors hover:bg-canvas"
          >
            {secondaryAction.icon && <span className="mr-2">{secondaryAction.icon}</span>}
            {secondaryAction.label}
          </button>
        )}
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div className="max-w-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Dicas para começar
          </div>
          <div className="grid grid-cols-1 gap-2">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-left p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span className="text-sm text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Empty States pré-configurados
 */

export function EmptyVacancies({ onCreateVacancy, onViewHelp }) {
  return (
    <EmptyStateActionable
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      }
      title="Nenhuma vaga criada ainda"
      message="Crie sua primeira vaga para começar a avaliar candidatos com perfil T1-T9 e Motivadores."
      primaryAction={{
        label: 'Criar primeira vaga',
        onClick: onCreateVacancy,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      }}
      secondaryAction={
        onViewHelp
          ? {
              label: 'Ver guia',
              onClick: onViewHelp,
            }
          : undefined
      }
      tips={[
        'Configure uma rubrica T1-T9 para a vaga (ou use um cargo existente)',
        'Convide candidatos por email ou compartilhe o link público',
        'Acompanhe o fit de cada candidato no ranking automaticamente',
      ]}
    />
  );
}

export function EmptyCandidates({ onInvitePeople, onCreateVacancy }) {
  return (
    <EmptyStateActionable
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      }
      title="Nenhuma pessoa cadastrada"
      message="Comece convidando candidatos ou membros do time interno para fazer o assessment T1-T9."
      primaryAction={{
        label: 'Convidar pessoas',
        onClick: onInvitePeople,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        ),
      }}
      secondaryAction={
        onCreateVacancy
          ? {
              label: 'Criar vaga',
              onClick: onCreateVacancy,
            }
          : undefined
      }
      tips={[
        'Use o link /t/{token} para convidar o time interno',
        'Crie uma vaga e envie /v/{token} para candidatos específicos',
        'Ou publique a página SEO (/j/{id}) para receber candidaturas',
      ]}
    />
  );
}

export function EmptyAnalytics({ onViewTutorial }) {
  return (
    <EmptyStateActionable
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      }
      title="Aguardando dados para analytics"
      message="As métricas serão geradas automaticamente conforme você usar o 30Team. Contrate, acompanhe PDI e lance pesquisas de clima."
      primaryAction={
        onViewTutorial
          ? {
              label: 'Ver preview de métricas',
              onClick: onViewTutorial,
            }
          : undefined
      }
      tips={[
        'Time-to-hire aparece após as primeiras contratações',
        'HR Score e turnover radar dependem de dados de clima e Motivadores',
        'Tendências mostram evolução dos últimos 6-24 meses',
      ]}
    />
  );
}
