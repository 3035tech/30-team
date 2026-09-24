'use client';

import { t } from '../../lib/i18n';
import { COMPANY_LICENSE } from '../../lib/company-license';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';

const panelClass = 'rounded-card border border-ink/10 bg-canvas/35 p-5 sm:p-6';

function tierKey(license) {
  const map = {
    [COMPANY_LICENSE.OFFER_TIERS.TRIAL]: 'dashboard.licensePlanTrial',
    [COMPANY_LICENSE.OFFER_TIERS.EARLY_ADOPTER]: 'dashboard.licensePlanEarlyAdopter',
    [COMPANY_LICENSE.OFFER_TIERS.DESIGN_PARTNER]: 'dashboard.licensePlanDesignPartner',
    [COMPANY_LICENSE.OFFER_TIERS.LEGACY]: 'dashboard.licensePlanLegacy',
  };
  return map[license?.offerTier] || map[COMPANY_LICENSE.OFFER_TIERS.LEGACY];
}

function SummaryItem({ label, children, tone = 'default' }) {
  return (
    <div className="min-w-0 rounded-control border border-ink/10 bg-surface/70 px-4 py-3">
      <p className={cn(S.muted, 'm-0')}>{label}</p>
      <p className={cn('m-0 mt-1.5 text-sm font-semibold', tone === 'muted' ? 'text-ink-muted' : 'text-ink')}>
        {children}
      </p>
    </div>
  );
}

export function BillingTab({ locale, role, companyId, companyName, license }) {
  const isSuperAdmin = role === 'admin' && !companyId;
  const licenseStatus = license?.status === COMPANY_LICENSE.EXPIRED
    ? t(locale, 'dashboard.licenseExpired')
    : t(locale, 'dashboard.licenseActive');

  if (isSuperAdmin) {
    return (
      <div className="grid gap-5">
        <section className={panelClass} aria-labelledby="billing-platform-title">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-4">
            <div>
              <h2 id="billing-platform-title" className="m-0 font-ui text-base font-semibold text-ink">
                {t(locale, 'dashboard.billingPlatformTitle')}
              </h2>
              <p className="mb-0 mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {t(locale, 'dashboard.billingPlatformHint')}
              </p>
            </div>
            <StatusToneChip tone="neutral">{t(locale, 'dashboard.billingNotConnected')}</StatusToneChip>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryItem label={t(locale, 'dashboard.billingMetricPlans')}>{t(locale, 'dashboard.billingMetricPlansValue')}</SummaryItem>
            <SummaryItem label={t(locale, 'dashboard.billingMetricInvoices')} tone="muted">{t(locale, 'dashboard.billingNotAvailable')}</SummaryItem>
            <SummaryItem label={t(locale, 'dashboard.billingMetricPayments')} tone="muted">{t(locale, 'dashboard.billingNotAvailable')}</SummaryItem>
          </div>
        </section>

        <section className={panelClass} aria-labelledby="billing-offers-title">
          <div className="border-b border-ink/10 pb-4">
            <h2 id="billing-offers-title" className="m-0 font-ui text-base font-semibold text-ink">
              {t(locale, 'dashboard.billingOffersTitle')}
            </h2>
            <p className="mb-0 mt-1 text-sm leading-relaxed text-ink-muted">
              {t(locale, 'dashboard.billingOffersHint')}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ['dashboard.billingOfferTrial', 'dashboard.billingOfferTrialDetail'],
              ['dashboard.billingOfferEarlyAdopter', 'dashboard.billingOfferEarlyAdopterDetail'],
              ['dashboard.billingOfferDesignPartner', 'dashboard.billingOfferDesignPartnerDetail'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-control border border-ink/10 bg-surface/70 p-4">
                <h3 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, title)}</h3>
                <p className="mb-0 mt-2 text-sm leading-relaxed text-ink-muted">{t(locale, detail)}</p>
              </div>
            ))}
          </div>
        </section>

        <InlineCallout tone="info">{t(locale, 'dashboard.billingIntegrationNotice')}</InlineCallout>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className={panelClass} aria-labelledby="billing-company-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-4">
          <div>
            <h2 id="billing-company-title" className="m-0 font-ui text-base font-semibold text-ink">
              {t(locale, 'dashboard.billingCompanyTitle')}
            </h2>
            <p className="mb-0 mt-1 text-sm leading-relaxed text-ink-muted">
              {companyName || t(locale, 'dashboard.billingCompanyFallback')}
            </p>
          </div>
          <StatusToneChip tone="neutral">{t(locale, 'dashboard.billingNotConnected')}</StatusToneChip>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label={t(locale, 'dashboard.billingCurrentOffer')}>
            {license ? t(locale, tierKey(license)) : t(locale, 'dashboard.billingNoOffer')}
          </SummaryItem>
          <SummaryItem label={t(locale, 'dashboard.billingAccessStatus')}>
            {license ? licenseStatus : t(locale, 'dashboard.billingAvailable')}
          </SummaryItem>
          <SummaryItem label={t(locale, 'dashboard.billingNextCharge')} tone="muted">
            {t(locale, 'dashboard.billingPendingIntegration')}
          </SummaryItem>
          <SummaryItem label={t(locale, 'dashboard.billingCurrency')} tone="muted">
            {t(locale, 'dashboard.billingCurrencyToDefine')}
          </SummaryItem>
        </div>
      </section>

      <section className={panelClass} aria-labelledby="billing-history-title">
        <div className="border-b border-ink/10 pb-4">
          <h2 id="billing-history-title" className="m-0 font-ui text-base font-semibold text-ink">
            {t(locale, 'dashboard.billingHistoryTitle')}
          </h2>
          <p className="mb-0 mt-1 text-sm leading-relaxed text-ink-muted">
            {t(locale, 'dashboard.billingHistoryHint')}
          </p>
        </div>
        <div className="mt-4 rounded-control border border-dashed border-ink/15 bg-surface/60 px-4 py-5">
          <h3 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'dashboard.billingEmptyTitle')}</h3>
          <p className="mb-0 mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {t(locale, 'dashboard.billingEmptyHint')}
          </p>
        </div>
      </section>

      <InlineCallout tone="info">{t(locale, 'dashboard.billingIntegrationNotice')}</InlineCallout>
    </div>
  );
}
