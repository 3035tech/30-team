'use client';

import { t } from '../../lib/i18n';
import { ROSTER_SCOPE } from '../../lib/domain-status';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/**
 * Empty cohort when roster filter hides recruiting people (audit P1).
 * Primary CTAs switch roster via navigateDashboard — no second chrome.
 */
export function RosterEmptyHint({
  locale = 'pt-BR',
  roster = ROSTER_SCOPE.INTERNAL,
  navigateDashboard,
  className,
}) {
  const scope = roster || ROSTER_SCOPE.INTERNAL;
  const isInternal = scope === ROSTER_SCOPE.INTERNAL;
  const canNav = typeof navigateDashboard === 'function';

  return (
    <div className={cn('rounded-[14px] border border-dashed border-ink/12 bg-ink/[0.02] px-5 py-7 text-center', className)}>
      <p className="mb-2 mt-0 font-display text-[15px] text-ink">
        {t(locale, 'dashboard.rosterEmptyTitle')}
      </p>
      <p className="mx-auto my-0 max-w-[48ch] text-[13px] leading-[1.55] text-ink-muted">
        {isInternal
          ? t(locale, 'dashboard.rosterEmptyBodyInternal')
          : t(locale, 'dashboard.rosterEmptyBodyOther')}
      </p>
      {canNav ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {isInternal || scope === ROSTER_SCOPE.RECRUITING ? (
            <button
              type="button"
              className={S.btnBrandSoft}
              onClick={() => navigateDashboard({ roster: ROSTER_SCOPE.RECRUITING })}
            >
              {t(locale, 'dashboard.rosterCtaRecruiting')}
            </button>
          ) : null}
          {scope !== ROSTER_SCOPE.ALL ? (
            <button
              type="button"
              className={S.btnGhost}
              onClick={() => navigateDashboard({ roster: ROSTER_SCOPE.ALL })}
            >
              {t(locale, 'dashboard.rosterCtaAll')}
            </button>
          ) : null}
          {!isInternal ? (
            <button
              type="button"
              className={S.btnGhost}
              onClick={() => navigateDashboard({ roster: ROSTER_SCOPE.INTERNAL })}
            >
              {t(locale, 'dashboard.rosterInternal')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
