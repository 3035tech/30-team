'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { printDecisionBrief } from '../../lib/people/brief-print';
import { useAppFeedbackOptional } from './AppFeedback';
import { Icon } from './Icon';
import { S } from '../dashboard/dashboard-shared';

/**
 * Briefing acionável (Equipe / vaga): síntese + faça/evite + entrevista + time + alertas.
 * Dados vêm de people.decisionBrief (servidor). Print/PDF via one-pager (B-401).
 */
export function HrActionBrief({ locale = 'pt-BR', brief, dense = false, personName = '', nucleusFit: nucleusFitProp = null }) {
  const feedback = useAppFeedbackOptional();

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
  const nucleusFit = nucleusFitProp || brief.nucleusFit || null;
  const showNucleus =
    nucleusFit &&
    !nucleusFit.empty &&
    (nucleusFit.summary || (nucleusFit.highlights || []).length > 0);

  const onPrint = () => {
    const ok = printDecisionBrief({
      locale,
      personName,
      brief,
      labels: {
        product: '30Team',
        title: t(locale, 'panel.team.briefTitle'),
        hint: t(locale, 'panel.team.briefHint'),
        alerts: t(locale, 'panel.team.briefAlerts'),
        do: t(locale, 'panel.team.briefDo'),
        avoid: t(locale, 'panel.team.briefAvoid'),
        interview: t(locale, 'panel.team.briefInterview'),
        team: t(locale, 'panel.team.briefTeam'),
        hypotheses: t(locale, 'panel.team.briefHypotheses'),
        synthesisConvergences: t(locale, 'panel.team.synthesisConvergences'),
        synthesisTensions: t(locale, 'panel.team.synthesisTensions'),
        synthesisHowToLead: t(locale, 'panel.team.synthesisHowToLead'),
        synthesisPdiIdeas: t(locale, 'panel.team.synthesisPdiIdeas'),
        footer: t(locale, 'panel.team.briefPrintFooter'),
        generatedAt: t(locale, 'panel.team.briefPrintGenerated', {
          date: new Date().toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR'),
        }),
      },
    });
    if (!ok && typeof feedback?.toast === 'function') {
      feedback.toast(t(locale, 'panel.team.briefPrintBlocked'), 'error');
    }
  };

  return (
    <div className={cn('mb-4 rounded-control border border-brand-500/20 bg-brand-500/[0.03]', dense ? 'p-3' : 'p-3.5')}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.team.briefTitle')}</span>
        <button
          type="button"
          onClick={onPrint}
          className={cn(S.btnGhost, 'inline-flex min-h-touch items-center gap-1.5 px-2.5 py-1.5 text-[11px]')}
          title={t(locale, 'panel.team.briefPrint')}
          aria-label={t(locale, 'panel.team.briefPrint')}
        >
          <Icon name="print" />
          <span>{t(locale, 'panel.team.briefPrint')}</span>
        </button>
      </div>
      <p className="mb-3 mt-0 text-[11px] leading-snug text-ink-faint">
        {t(locale, 'panel.team.briefHint')}
      </p>

      {syn.headline ? (
        <p className="mb-3 mt-0 text-[13px] font-medium leading-snug text-ink">
          {syn.headline}
        </p>
      ) : null}

      {(() => {
        const synSections = [
          ['convergences', 'panel.team.synthesisConvergences'],
          ['tensions', 'panel.team.synthesisTensions'],
          ['howToLead', 'panel.team.synthesisHowToLead'],
          ['pdiIdeas', 'panel.team.synthesisPdiIdeas'],
        ].filter(([key]) => syn[key]?.length);
        if (!synSections.length) return null;
        return (
          <section className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {synSections.map(([key, labelKey]) => (
              <div
                key={key}
                className="rounded-control border border-ink/10 bg-white/70 px-2.5 py-2"
              >
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {t(locale, labelKey)}
                </div>
                <ul className="m-0 list-disc space-y-1 pl-4 text-xs leading-snug text-ink">
                  {syn[key].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })()}

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

      {showNucleus ? (
        <section className="mb-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {t(locale, 'panel.team.briefNucleusFit')}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs leading-snug text-ink-muted">
            {nucleusFit.summary ? (
              <li className="rounded-control border border-ink/10 bg-white/60 px-2.5 py-2 text-ink">
                {nucleusFit.summary}
              </li>
            ) : null}
            {(nucleusFit.highlights || []).slice(0, 2).map((h) => (
              <li
                key={`nf-${h.withId || h.withName}-${h.level}`}
                className={cn(
                  'rounded-control px-2.5 py-2 text-ink',
                  h.level === 'synergy'
                    ? 'border border-success/20 bg-success/[0.05]'
                    : 'border border-warning/25 bg-warning/[0.06]'
                )}
              >
                {h.withName
                  ? t(locale, 'panel.team.briefNucleusFitWith', {
                      name: h.withName,
                      title: h.title || '',
                    })
                  : h.title}
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-1.5 text-[10px] leading-snug text-ink-faint">
            {t(locale, 'panel.team.briefNucleusFitHint')}
          </p>
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
