'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { printDecisionBrief } from '../../lib/people/brief-print';
import { useAppFeedbackOptional } from './AppFeedback';
import { CollapsibleBlock } from './CollapsibleBlock';
import { Icon } from './Icon';
import { S } from '../dashboard/dashboard-shared';

/**
 * Briefing acionável (Equipe / vaga): decisão acima; detalhe em disclosure.
 * Dados: people.decisionBrief (servidor). Print/PDF via one-pager (B-401).
 *
 * @param {{ omitHypotheses?: boolean }} props — hide hypotheses when 1:1 tab already shows them
 */
export function HrActionBrief({
  locale = 'pt-BR',
  brief,
  dense = false,
  personName = '',
  nucleusFit: nucleusFitProp = null,
  omitHypotheses = false,
}) {
  const feedback = useAppFeedbackOptional();

  if (!brief?.hasAny) {
    return (
      <div className={cn(dense ? 'mb-3' : 'mb-4')}>
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
  const hypotheses = omitHypotheses ? [] : brief.hypotheses || [];
  const nucleusFit = nucleusFitProp || brief.nucleusFit || null;
  const showNucleus =
    nucleusFit &&
    !nucleusFit.empty &&
    (nucleusFit.summary || (nucleusFit.highlights || []).length > 0);

  const synSections = [
    ['convergences', 'panel.team.synthesisConvergences'],
    ['tensions', 'panel.team.synthesisTensions'],
    ['howToLead', 'panel.team.synthesisHowToLead'],
    ['pdiIdeas', 'panel.team.synthesisPdiIdeas'],
  ].filter(([key]) => syn[key]?.length);

  const alertsPrimary = alerts.slice(0, 2);
  const alertsExtra = alerts.slice(2);
  const teamHasContent =
    !team.empty &&
    (team.roleHint || (team.synergies || []).length > 0 || (team.tensions || []).length > 0);

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
    <div className={cn('mb-4', dense ? 'space-y-3' : 'space-y-3.5')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.team.briefTitle')}</span>
          <p className="mb-0 mt-1 text-2xs leading-snug text-ink-faint">
            {t(locale, 'panel.team.briefHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={onPrint}
          className={cn(S.btnGhost, 'inline-flex min-h-touch shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-2xs')}
          title={t(locale, 'panel.team.briefPrint')}
          aria-label={t(locale, 'panel.team.briefPrint')}
        >
          <Icon name="print" />
          <span>{t(locale, 'panel.team.briefPrint')}</span>
        </button>
      </div>

      {syn.headline ? (
        <p className="m-0 text-sm font-medium leading-snug text-ink">{syn.headline}</p>
      ) : null}

      {alertsPrimary.length > 0 ? (
        <section>
          <div className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-warning">
            {t(locale, 'panel.team.briefAlerts')}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {alertsPrimary.map((a) => (
              <li
                key={a.key || a.text}
                className="border-l-2 border-warning/50 py-1 pl-2.5 text-xs leading-snug text-ink"
              >
                {a.text}
              </li>
            ))}
          </ul>
          {alertsExtra.length > 0 ? (
            <CollapsibleBlock
              locale={locale}
              title={t(locale, 'panel.team.briefMoreAlerts', { n: alertsExtra.length })}
              defaultOpen={false}
              bordered={false}
              className="mt-1"
            >
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {alertsExtra.map((a) => (
                  <li
                    key={a.key || a.text}
                    className="border-l-2 border-warning/40 py-1 pl-2.5 text-xs leading-snug text-ink"
                  >
                    {a.text}
                  </li>
                ))}
              </ul>
            </CollapsibleBlock>
          ) : null}
        </section>
      ) : null}

      {(actionsDo.length > 0 || actionsAvoid.length > 0) ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {actionsDo.length > 0 ? (
            <div>
              <div className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-success">
                {t(locale, 'panel.team.briefDo')}
              </div>
              <ul className="m-0 list-disc space-y-1.5 pl-4 text-xs leading-snug text-ink">
                {actionsDo.map((a) => (
                  <li key={`do-${a.dimension}-${a.text}`}>{a.text}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {actionsAvoid.length > 0 ? (
            <div>
              <div className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-danger">
                {t(locale, 'panel.team.briefAvoid')}
              </div>
              <ul className="m-0 list-disc space-y-1.5 pl-4 text-xs leading-snug text-ink">
                {actionsAvoid.map((a) => (
                  <li key={`av-${a.dimension}-${a.text}`}>{a.text}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {synSections.length > 0 ? (
        <CollapsibleBlock
          locale={locale}
          title={t(locale, 'panel.team.briefPrepareTitle')}
          defaultOpen={false}
          count={synSections.length}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {synSections.map(([key, labelKey]) => (
              <div key={key}>
                <div className="mb-1 font-mono text-2xs uppercase tracking-wider text-ink-muted">
                  {t(locale, labelKey)}
                </div>
                <ul className="m-0 list-disc space-y-1 pl-4 text-xs leading-snug text-ink">
                  {syn[key].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CollapsibleBlock>
      ) : null}

      {interview.length > 0 ? (
        <CollapsibleBlock
          locale={locale}
          title={t(locale, 'panel.team.briefInterview')}
          defaultOpen={false}
          count={interview.length}
        >
          <ol className="m-0 list-decimal space-y-1.5 pl-4 text-xs leading-snug text-ink">
            {interview.map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
          </ol>
        </CollapsibleBlock>
      ) : null}

      {teamHasContent ? (
        <CollapsibleBlock
          locale={locale}
          title={t(locale, 'panel.team.briefTeam')}
          defaultOpen={false}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-xs leading-snug text-ink-muted">
            {team.roleHint ? <li className="text-ink">{team.roleHint.text}</li> : null}
            {(team.synergies || []).map((row) => (
              <li key={`syn-${row.colleagueId}`} className="text-ink">
                {row.text}
              </li>
            ))}
            {(team.tensions || []).map((row) => (
              <li key={`ten-${row.colleagueId}`} className="text-ink">
                {row.text}
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
      ) : null}

      {showNucleus ? (
        <CollapsibleBlock
          locale={locale}
          title={t(locale, 'panel.team.briefNucleusFit')}
          defaultOpen={false}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-xs leading-snug text-ink">
            {nucleusFit.summary ? <li>{nucleusFit.summary}</li> : null}
            {(nucleusFit.highlights || []).slice(0, 2).map((h) => (
              <li key={`nf-${h.withId || h.withName}-${h.level}`}>
                {h.withName
                  ? t(locale, 'panel.team.briefNucleusFitWith', {
                      name: h.withName,
                      title: h.title || '',
                    })
                  : h.title}
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-1.5 text-2xs leading-snug text-ink-faint">
            {t(locale, 'panel.team.briefNucleusFitHint')}
          </p>
        </CollapsibleBlock>
      ) : null}

      {hypotheses.length > 0 ? (
        <CollapsibleBlock
          locale={locale}
          title={t(locale, 'panel.team.briefHypotheses')}
          defaultOpen={false}
          count={hypotheses.length}
        >
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {hypotheses.map((h) => (
              <li key={h.id}>
                <div className="mb-0.5 text-xs font-semibold text-ink">{h.title}</div>
                <p className="m-0 text-xs leading-snug text-ink-muted">{h.body}</p>
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
      ) : null}
    </div>
  );
}
