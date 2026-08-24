'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { PreOnboardingChecklistBlock } from './PreOnboardingChecklistBlock';
import { OnboardingCheckinsBlock } from './OnboardingCheckinsBlock';
import { DevelopmentPlansBlock } from './DevelopmentPlansBlock';

const JOURNEY_STEPS = ['d1', 'd30', 'd60', 'd90', 'pdi'];

/**
 * Continuous post-hire journey strip: D1 kit → D30/60/90 check-ins → light PDI.
 * Composes existing blocks (no second checklist UI).
 */
export function HireJourneyBlock({
  locale,
  candidateId,
  employmentStatus,
  onPdiChanged,
  pdiSeedIdeas,
  oneOnOnes,
  pdiRefresh,
}) {
  if (!candidateId || employmentStatus !== 'employee') return null;

  return (
    <section
      className="mb-4 rounded-control border border-info/25 bg-info/[0.04] p-3.5"
      aria-labelledby="hire-journey-title"
    >
      <span id="hire-journey-title" className={cn(S.label, 'mb-1')}>
        {t(locale, 'panel.hireJourney.title')}
      </span>
      <p className="mb-3 mt-0 text-[11px] leading-snug text-ink-muted">
        {t(locale, 'panel.hireJourney.hint')}
      </p>
      <ol className="mb-4 mt-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={t(locale, 'panel.hireJourney.stepsAria')}>
        {JOURNEY_STEPS.map((step, i) => (
          <li
            key={step}
            className="inline-flex min-h-touch items-center gap-1 rounded-control border border-ink/10 bg-white/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted"
          >
            <span className="text-ink-faint" aria-hidden>
              {i + 1}.
            </span>
            {t(locale, `panel.hireJourney.step_${step}`)}
          </li>
        ))}
      </ol>

      <PreOnboardingChecklistBlock
        locale={locale}
        candidateId={candidateId}
        employmentStatus={employmentStatus}
      />

      <OnboardingCheckinsBlock
        locale={locale}
        candidateId={candidateId}
        employmentStatus={employmentStatus}
        onPdiChanged={onPdiChanged}
      />

      <DevelopmentPlansBlock
        locale={locale}
        candidateId={candidateId}
        seedIdeas={pdiSeedIdeas}
        oneOnOnes={oneOnOnes}
        refreshKey={pdiRefresh}
      />
    </section>
  );
}
