'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { Icon } from './Icon';

const MAX_SHORTCUTS = 4;

/** Priority order: arrival first, then what tends to need action, then reference areas. */
const WELCOME_SHORTCUTS = Object.freeze([
  { id: 'journey', href: '#journey', icon: 'check', titleKey: 'employeeHome.journeyTitle', bodyKey: 'employeeHome.welcomeCardJourney' },
  { id: 'surveys', href: '#surveys', icon: 'climate', titleKey: 'employeeHome.surveysTitle', bodyKey: 'employeeHome.welcomeCardSurveys' },
  { id: 'timeClock', href: '/employee/time-clock', icon: 'timeClock', titleKey: 'employeeHome.timeClockTitle', bodyKey: 'employeeHome.welcomeCardTimeClock' },
  { id: 'pdi', href: '/employee/pdi', icon: 'target', titleKey: 'panel.employeePortal.pdiTitle', bodyKey: 'employeeHome.welcomeCardPdi' },
  { id: 'lms', href: '/employee/lms', icon: 'academy', titleKey: 'employeeHome.lmsTitle', bodyKey: 'employeeHome.welcomeCardLms' },
  { id: 'dp', href: '/employee/dp', icon: 'dp', titleKey: 'employeeHome.dpTitle', bodyKey: 'employeeHome.welcomeCardDp' },
  { id: 'feed', href: '#feed', icon: 'bell', titleKey: 'employeeHome.feedTitle', bodyKey: 'employeeHome.welcomeCardFeed' },
]);

/**
 * First-access orientation on /employee. Shows only sections enabled for the company.
 * @param {{ locale: string, firstName?: string, isAvailable: (id: string) => boolean, onShortcut: (id: string, href: string) => void, onDismiss: () => void }} props
 */
export function EmployeeWelcomeCard({ locale, firstName = '', isAvailable, onShortcut, onDismiss }) {
  const shortcuts = WELCOME_SHORTCUTS.filter((s) => isAvailable(s.id)).slice(0, MAX_SHORTCUTS);

  return (
    <section
      aria-labelledby="employee-welcome-title"
      className={cn(S.cardTight, 'mb-6 border-brand-500/20 bg-brand-500/[0.04]')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="employee-welcome-title" className="m-0 font-ui text-lg font-semibold text-ink">
            {firstName
              ? t(locale, 'employeeHome.welcomeCardTitle', { name: firstName })
              : t(locale, 'employeeHome.welcomeCardTitleNoName')}
          </h2>
          <p className={cn(S.muted, 'm-0 mt-1 max-w-[62ch]')}>{t(locale, 'employeeHome.welcomeCardBody')}</p>
        </div>
        <button type="button" onClick={onDismiss} className={cn(S.btnGhost, 'min-h-touch shrink-0')}>
          {t(locale, 'employeeHome.welcomeCardDismiss')}
        </button>
      </div>

      {shortcuts.length > 0 ? (
        <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
          {shortcuts.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                onClick={(event) => {
                  event.preventDefault();
                  onShortcut(s.id, s.href);
                }}
                className="flex min-h-touch items-start gap-3 rounded-control border border-ink/12 bg-surface px-3 py-2.5 no-underline transition-colors hover:border-brand-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className="mt-0.5 shrink-0 text-brand-500" aria-hidden>
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-ui text-sm font-medium text-ink">{t(locale, s.titleKey)}</span>
                  <span className={cn(S.cardMuted, 'mt-0.5 block')}>{t(locale, s.bodyKey)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <p className={cn(S.faint, 'mb-0 mt-3')}>{t(locale, 'employeeHome.welcomeCardFooter')}</p>
    </section>
  );
}
