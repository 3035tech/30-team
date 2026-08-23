'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/**
 * Briefing acionável (Equipe): síntese + faça/evite + entrevista + time + alertas.
 * Dados vêm de people.decisionBrief (servidor).
 */
export function HrActionBrief({ locale = 'pt-BR', brief, dense = false }) {
  if (!brief?.hasAny) {
    return (
      <div className={cn(S.cardTight, dense ? 'mb-3 p-3' : 'mb-4')}>
        <span className={cn(S.label, 'mb-1.5')}>{t(locale, 'panel.team.briefTitle')}</span>
        <p className="m-0 text-xs leading-relaxed text-ink-muted">
          {t(locale, 'panel.team.briefEmpty')}
        </p>
      </div>
    );
  }

  const syn = brief.synthesis || {};
  const team = brief.team || {};
  const alerts = brief.alerts || [];
  const interview = brief.interviewQuestions || [];
  const actionsDo = brief.actionsDo || [];
  const actionsAvoid = brief.actionsAvoid || [];
  const hypotheses = brief.hypotheses || [];

  return (
    <div className={cn('mb-4 rounded-control border border-brand-500/20 bg-brand-500/[0.03]', dense ? 'p-3' : 'p-3.5')}>
      <span className={cn(S.label, 'mb-1')}>{t(locale, 'panel.team.briefTitle')}</span>
      <p className="mb-3 mt-0 text-[11px] leading-snug text-ink-faint">
        {t(locale, 'panel.team.briefHint')}
      </p>

      {syn.headline ? (
        <p className="mb-3 mt-0 text-[13px] font-medium leading-snug text-ink">
          {syn.headline}
        </p>
      ) : null}

      {alerts.length > 0 ? (
        <section className="mb-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-warning">
            {t(locale, 'panel.team.briefAlerts')}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {alerts.map((a) => (
              <li
                key={a.key || a.text}
                className="rounded-control border border-warning/30 bg-warning/[0.08] px-2.5 py-2 text-xs leading-snug text-ink"
              >
                {a.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(actionsDo.length > 0 || actionsAvoid.length > 0) ? (
        <section className="mb-3 grid gap-2 sm:grid-cols-2">
          {actionsDo.length > 0 ? (
            <div className="rounded-control border border-success/25 bg-success/[0.06] px-2.5 py-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-success">
                {t(locale, 'panel.team.briefDo')}
              </div>
              <ul className="m-0 list-disc space-y-1 pl-4 text-xs leading-snug text-ink">
                {actionsDo.map((a) => (
                  <li key={`do-${a.dimension}-${a.text}`}>{a.text}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {actionsAvoid.length > 0 ? (
            <div className="rounded-control border border-danger/25 bg-danger/[0.06] px-2.5 py-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-danger">
                {t(locale, 'panel.team.briefAvoid')}
              </div>
              <ul className="m-0 list-disc space-y-1 pl-4 text-xs leading-snug text-ink">
                {actionsAvoid.map((a) => (
                  <li key={`av-${a.dimension}-${a.text}`}>{a.text}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {interview.length > 0 ? (
        <section className="mb-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {t(locale, 'panel.team.briefInterview')}
          </div>
          <ol className="m-0 list-decimal space-y-1.5 pl-4 text-xs leading-snug text-ink">
            {interview.map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {!team.empty ? (
        <section className="mb-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {t(locale, 'panel.team.briefTeam')}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs leading-snug text-ink-muted">
            {team.roleHint ? (
              <li className="rounded-control border border-ink/10 bg-white/60 px-2.5 py-2 text-ink">
                {team.roleHint.text}
              </li>
            ) : null}
            {(team.synergies || []).map((row) => (
              <li
                key={`syn-${row.colleagueId}`}
                className="rounded-control border border-success/20 bg-success/[0.05] px-2.5 py-2 text-ink"
              >
                {row.text}
              </li>
            ))}
            {(team.tensions || []).map((row) => (
              <li
                key={`ten-${row.colleagueId}`}
                className="rounded-control border border-warning/25 bg-warning/[0.06] px-2.5 py-2 text-ink"
              >
                {row.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hypotheses.length > 0 ? (
        <section>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {t(locale, 'panel.team.briefHypotheses')}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {hypotheses.map((h) => (
              <li key={h.id} className="rounded-control border border-ink/10 bg-white/70 px-2.5 py-2">
                <div className="mb-0.5 text-xs font-semibold text-ink">{h.title}</div>
                <p className="m-0 text-xs leading-snug text-ink-muted">{h.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
