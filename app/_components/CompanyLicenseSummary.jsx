'use client';

import { t } from '../../lib/i18n';
import { COMPANY_LICENSE } from '../../lib/company-license';
import { cn } from '../../lib/cn';
import { formatDisplayDateTime } from '../../lib/format-display-date';
import { S } from '../dashboard/dashboard-shared';
import { StatusToneChip } from './StatusToneChip';
import { InlineCallout } from './InlineCallout';

function licensePlanLabel(locale, license) {
  const keys = {
    [COMPANY_LICENSE.OFFER_TIERS.TRIAL]: 'dashboard.licensePlanTrial',
    [COMPANY_LICENSE.OFFER_TIERS.EARLY_ADOPTER]: 'dashboard.licensePlanEarlyAdopter',
    [COMPANY_LICENSE.OFFER_TIERS.DESIGN_PARTNER]: 'dashboard.licensePlanDesignPartner',
    [COMPANY_LICENSE.OFFER_TIERS.LEGACY]: 'dashboard.licensePlanLegacy',
  };
  return t(locale, keys[license?.offerTier] || keys[COMPANY_LICENSE.OFFER_TIERS.LEGACY]);
}

export function CompanyLicenseSummary({ license, locale }) {
  const expired = license?.status === COMPANY_LICENSE.EXPIRED;
  return (
    <section aria-labelledby="company-license-title" className="mb-5 border-b border-ink/10 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="company-license-title" className="m-0 font-ui text-base font-semibold text-ink">
          {t(locale, 'dashboard.licenseTitle')}
        </h2>
        {license ? <StatusToneChip tone={expired ? 'warning' : 'success'}>
          {t(locale, expired ? 'dashboard.licenseExpired' : 'dashboard.licenseActive')}
        </StatusToneChip> : null}
      </div>
      {license ? <>
        <p className="mb-3 mt-1 text-sm text-ink-muted">{licensePlanLabel(locale, license)}</p>
        <dl className="m-0 grid gap-x-6 gap-y-4 rounded-control bg-canvas/60 p-4 sm:grid-cols-3">
          {[
            ['dashboard.licenseNumber', license.number, null],
            ['dashboard.licenseStartsAt', formatDisplayDateTime(license.startsAt, locale), license.startsAt],
            ['dashboard.licenseExpiresAt', formatDisplayDateTime(license.expiresAt, locale), license.expiresAt],
          ].map(([label, value, dateTime]) => <div key={label} className="min-w-0">
            <dt className={S.muted}>{t(locale, label)}</dt>
            <dd className={cn('m-0 mt-1.5 break-words text-sm text-ink tabular-nums',
              label === 'dashboard.licenseExpiresAt' ? 'font-semibold' : 'font-medium')}>
              {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
            </dd>
          </div>)}
        </dl>
        <p className="mb-0 mt-3 max-w-prose text-prose leading-relaxed text-ink-muted">{t(locale, 'dashboard.licenseEmployeeFree')}</p>
        {expired ? <InlineCallout tone="warning" className="mt-3">
          {t(locale, 'dashboard.licenseExpiredNotice')}
        </InlineCallout> : null}
      </> : <p className="mb-0 mt-2 text-sm text-ink-muted">{t(locale, 'dashboard.licenseNone')}</p>}
    </section>
  );
}
