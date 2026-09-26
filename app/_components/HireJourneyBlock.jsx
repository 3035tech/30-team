'use client';

import { t } from '../../lib/i18n';
import { EMPLOYMENT_STATUS } from '../../lib/domain-status.js';
import { PreOnboardingChecklistBlock } from './PreOnboardingChecklistBlock';
import { OnboardingCheckinsBlock } from './OnboardingCheckinsBlock';
import { DevelopmentPlansBlock } from './DevelopmentPlansBlock';
import { FormalReviewResultsBlock } from './FormalReviewResultsBlock';


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
  if (!candidateId || employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) return null;

  return (
    <section
      className="mb-4 rounded-control border border-info/25 bg-info/[0.04] p-3.5"
      aria-label={t(locale, 'panel.hireJourney.title')}
    >
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

      <FormalReviewResultsBlock locale={locale} candidateId={candidateId} onPdiChanged={onPdiChanged} />

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
