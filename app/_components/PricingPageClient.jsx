'use client';

import Link from 'next/link';
import { BrandMark } from './BrandMark';
import LanguageSelect from './LanguageSelect';
import { useLocale } from '../../lib/useLocale';
import { t } from '../../lib/i18n';
import {
  PRODUCT_LANDING_CONTACT_EMAIL,
  getPricingAddons,
  getPricingCoreFeatures,
} from '../../lib/pricing-plans';

function SectionLabel({ children }) {
  return (
    <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-500/70">{children}</p>
  );
}

export default function PricingPageClient({ locale: initialLocale }) {
  const [locale, setLocale] = useLocale(initialLocale);
  const coreFeatures = getPricingCoreFeatures(locale);
  const addons = getPricingAddons(locale);

  return (
    <div className="min-h-screen bg-canvas font-display text-ink" lang={locale === 'en' ? 'en' : 'pt-BR'}>
      <div className="pointer-events-none fixed inset-0 bg-radial-glow opacity-80" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-ink/8 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline" aria-label="30Team">
            <BrandMark size={28} withWordmark />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSelect locale={locale} onChange={setLocale} compact />
            <Link
              href="/login"
              className="hidden min-h-touch items-center rounded-control border border-ink/12 bg-transparent px-3 py-2 text-sm text-ink no-underline sm:inline-flex"
            >
              {t(locale, 'pricing.navLogin')}
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-3.5 py-2 text-sm text-white no-underline"
            >
              {t(locale, 'pricing.navEarly')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-[1]">
        <section className="mx-auto max-w-5xl px-5 pb-8 pt-12 sm:px-8 sm:pt-16">
          <p className="mb-4 inline-block rounded-control border border-success/25 bg-success/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-success">
            {t(locale, 'pricing.earlyBadge')}
          </p>
          <h1 className="mb-4 max-w-2xl bg-gradient-to-br from-brand-200 via-brand-400 to-brand-600 bg-clip-text text-[clamp(2rem,5.5vw,3rem)] font-normal leading-[1.12] text-transparent">
            {t(locale, 'pricing.heroTitle')}
          </h1>
          <p className="mb-2 max-w-2xl text-lg leading-relaxed text-ink">{t(locale, 'pricing.heroLead')}</p>
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t(locale, 'pricing.heroBody')}</p>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="plan-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{t(locale, 'pricing.planLabel')}</SectionLabel>
            <div className="grid gap-6 lg:grid-cols-[1fr,minmax(280px,360px)] lg:items-start">
              <div>
                <h2 id="plan-title" className="mb-2 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
                  {t(locale, 'pricing.planName')}
                </h2>
                <p className="mb-6 max-w-xl text-sm leading-relaxed text-ink-muted">{t(locale, 'pricing.planDescription')}</p>
                <ul className="m-0 list-none space-y-2.5 p-0">
                  {coreFeatures.map((line) => (
                    <li
                      key={line}
                      className="relative pl-5 text-sm leading-relaxed text-ink-muted before:absolute before:left-0 before:text-success before:content-['✓']"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <article className="rounded-card border-2 border-brand-200 bg-canvas/90 p-6 shadow-sm">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-500/80">
                  {t(locale, 'pricing.priceLabel')}
                </p>
                <p className="mb-1 mt-0 text-3xl font-normal text-ink">{t(locale, 'pricing.priceFreeEarlyAccess')}</p>
                <p className="mb-6 text-sm leading-relaxed text-ink-muted">{t(locale, 'pricing.priceNote')}</p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex min-h-touch items-center justify-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white no-underline"
                  >
                    {t(locale, 'pricing.ctaSignup')}
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-h-touch items-center justify-center rounded-control border border-ink/12 bg-white/70 px-5 py-3.5 text-sm text-ink no-underline"
                  >
                    {t(locale, 'pricing.ctaLogin')}
                  </Link>
                </div>
                <p className="mb-0 mt-4 text-xs leading-relaxed text-ink-faint">
                  {t(locale, 'pricing.contactLead')}{' '}
                  <a
                    href={`mailto:${PRODUCT_LANDING_CONTACT_EMAIL}?subject=${encodeURIComponent(t(locale, 'pricing.contactSubject'))}`}
                    className="text-brand-600 underline-offset-2 hover:underline"
                  >
                    {PRODUCT_LANDING_CONTACT_EMAIL}
                  </a>
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="addons-title">
          <SectionLabel>{t(locale, 'pricing.addonsLabel')}</SectionLabel>
          <h2 id="addons-title" className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {t(locale, 'pricing.addonsTitle')}
          </h2>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-muted">{t(locale, 'pricing.addonsLead')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {addons.map((addon) => (
              <article
                key={addon.id}
                className="rounded-card border border-ink/10 bg-white/60 p-5 opacity-90"
                aria-disabled="true"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-base font-normal text-ink">{addon.name}</h3>
                  <span className="rounded-control border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    {addon.statusLabel}
                  </span>
                </div>
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{addon.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-ink/8 bg-brand-50/70 py-14" aria-labelledby="enterprise-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{t(locale, 'pricing.enterpriseLabel')}</SectionLabel>
            <h2 id="enterprise-title" className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {t(locale, 'pricing.enterpriseTitle')}
            </h2>
            <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t(locale, 'pricing.enterpriseBody')}</p>
            <a
              href={`mailto:${PRODUCT_LANDING_CONTACT_EMAIL}?subject=${encodeURIComponent(t(locale, 'pricing.enterpriseSubject'))}`}
              className="inline-flex min-h-touch items-center rounded-control border border-brand-300 bg-white/80 px-5 py-3.5 text-sm text-brand-700 no-underline hover:border-brand-400"
            >
              {t(locale, 'pricing.enterpriseCta')}
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="faq-title">
          <SectionLabel>{t(locale, 'pricing.faqLabel')}</SectionLabel>
          <h2 id="faq-title" className="mb-8 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {t(locale, 'pricing.faqTitle')}
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <details
                key={n}
                className="group rounded-card border border-ink/10 bg-white/80 px-4 py-3 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-base text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                  {t(locale, `pricing.faq${n}Q`)}
                </summary>
                <p className="mb-1 mt-3 text-sm leading-relaxed text-ink-muted">{t(locale, `pricing.faq${n}A`)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
          <h2 className="mb-3 mt-0 text-2xl font-normal text-ink">{t(locale, 'pricing.closeTitle')}</h2>
          <p className="mb-8 max-w-xl text-sm leading-relaxed text-ink-muted">{t(locale, 'pricing.closeBody')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white no-underline"
            >
              {t(locale, 'pricing.ctaSignup')}
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-white/70 px-5 py-3.5 text-sm text-ink no-underline"
            >
              {t(locale, 'pricing.backHome')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-[1] border-t border-ink/8 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{t(locale, 'pricing.footerBrand')}</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="text-ink-muted no-underline hover:text-ink">
              {t(locale, 'pricing.backHome')}
            </Link>
            <Link href="/login" className="text-ink-muted no-underline hover:text-ink">
              {t(locale, 'pricing.navLogin')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
