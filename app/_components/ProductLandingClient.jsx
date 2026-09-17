'use client';

import Link from 'next/link';
import { BrandMark } from './BrandMark';
import LanguageSelect from './LanguageSelect';
import { PRODUCT_LANDING_CONTACT_EMAIL } from '../../lib/product-landing-seo';
import { useLocale } from '../../lib/useLocale';
import LandingAnalytics from './LandingAnalytics';
import { ContentEnter } from './AppLoading';

function SectionLabel({ children }) {
  return (
    <p className="mb-3 text-sm font-medium text-brand-600">{children}</p>
  );
}

/** CTA primário = signup. Depois: gestão/RH e colaborador. */
function Ctas({ copy }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/signup"
        className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white no-underline"
      >
        {copy.ctaEarly}
      </Link>
      <Link
        href="/login"
        className="inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-white/70 px-5 py-3.5 text-sm text-ink no-underline"
      >
        {copy.ctaLogin}
      </Link>
      <Link
        href="/employee/login"
        className="inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-white/70 px-5 py-3.5 text-sm text-ink no-underline"
      >
        {copy.ctaEmployee}
      </Link>
    </div>
  );
}

export default function ProductLandingClient({ copyByLocale, locale: initialLocale }) {
  const [locale, setLocale] = useLocale(initialLocale);
  const copy = copyByLocale[locale === 'en' ? 'en' : 'pt-BR'] || copyByLocale['pt-BR'];

  const toc = [
    { href: '#jornada', label: copy.journeyNav },
    { href: '#resultados', label: copy.outcomesLabel },
    { href: '#produto', label: copy.pillarsLabel },
    { href: '#confianca', label: copy.trustLabel },
    { href: '#oferta', label: copy.earlyLabel },
  ];

  return (
    <div className="min-h-screen bg-canvas font-display text-ink" lang={locale === 'en' ? 'en' : 'pt-BR'}>
      <LandingAnalytics />
      <div className="pointer-events-none fixed inset-0 bg-radial-glow opacity-80" aria-hidden />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-card"
      >
        {copy.skipToContent}
      </a>

      <header className="sticky top-0 z-20 border-b border-ink/8 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="inline-flex items-center gap-2" aria-label="30Team">
            <BrandMark size={28} withWordmark />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSelect locale={locale} onChange={setLocale} compact />
            <Link
              href="/pricing"
              className="hidden min-h-touch items-center rounded-control border border-transparent px-3 py-2 text-sm text-ink-muted no-underline hover:text-ink sm:inline-flex"
            >
              {copy.navPricing}
            </Link>
            <Link
              href="/login"
              className="hidden min-h-touch items-center rounded-control border border-ink/12 bg-transparent px-3 py-2 text-sm text-ink no-underline sm:inline-flex"
            >
              {copy.navLogin}
            </Link>
            <Link
              href="/employee/login"
              className="hidden min-h-touch items-center rounded-control border border-ink/12 bg-transparent px-3 py-2 text-sm text-ink no-underline sm:inline-flex"
            >
              {copy.navEmployee}
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-3.5 py-2 text-sm text-white no-underline"
            >
              {copy.navEarly}
            </Link>
          </div>
        </div>
      </header>

      <ContentEnter animKey={locale} className="relative z-[1]">
        <main id="conteudo">
          <section id="produto-hero" className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)] lg:items-center">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-brand-500/20 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                {copy.earlyBadge}
              </p>
              <h1 className="mb-5 max-w-[18ch] text-[clamp(2.5rem,6vw,4.6rem)] font-normal leading-[1.02] tracking-[-0.035em] text-ink">
                {copy.heroTitle}
              </h1>
              <p className="mb-4 max-w-2xl font-ui text-lg leading-relaxed text-ink">{copy.heroLead}</p>
              <p className="mb-7 max-w-2xl font-ui text-base leading-relaxed text-ink-muted">{copy.heroBody}</p>
              <Ctas copy={copy} />
              <p className="mt-4 font-ui text-sm text-ink-faint">
                {copy.heroFoot}{' '}
                <Link href="/pricing" className="text-brand-600 underline-offset-2 hover:underline">
                  {copy.navPricing}
                </Link>
              </p>
            </div>
            <aside className="relative overflow-hidden rounded-card border border-brand-500/15 bg-surface p-5 shadow-card sm:p-7" aria-label={copy.journeyNav}>
            <div className="absolute inset-y-8 left-[2.15rem] w-px bg-brand-500/20" aria-hidden />
            <ol className="relative m-0 list-none space-y-5 p-0">
              {copy.journeyStages.map((stage, index) => (
                <li key={stage.title} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-500/25 bg-canvas text-xs font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="m-0 font-ui text-sm font-semibold text-ink">{stage.title}</p>
                    <p className="mb-0 mt-1 font-ui text-xs leading-relaxed text-ink-muted">{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            </aside>
            <nav aria-label={copy.tocLabel} className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/10 pt-5 lg:col-span-2">
            {toc.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="min-h-touch py-2 font-ui text-sm text-ink-muted underline-offset-4 hover:text-brand-700 hover:underline"
              >
                {item.label}
              </a>
            ))}
            </nav>
          </section>

        <section id="jornada" className="border-y border-ink/8 bg-surface py-16 sm:py-20" aria-labelledby="journey-title">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionLabel>{copy.journeyLabel}</SectionLabel>
            <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr] lg:gap-12">
              <div>
                <h2 id="journey-title" className="mb-4 mt-0 max-w-lg text-3xl font-normal leading-tight text-ink sm:text-4xl">
                  {copy.journeyTitle}
                </h2>
                <p className="m-0 max-w-lg font-ui text-base leading-relaxed text-ink-muted">{copy.journeyLead}</p>
              </div>
              <ol className="m-0 grid list-none gap-px overflow-hidden rounded-card border border-ink/10 bg-ink/10 p-0 sm:grid-cols-2">
                {copy.journeyStages.map((stage, index) => (
                  <li key={stage.title} className="bg-canvas p-5 sm:p-6">
                    <span className="mb-5 block font-ui text-xs font-semibold text-brand-600">0{index + 1}</span>
                    <h3 className="mb-2 mt-0 text-lg font-normal text-ink">{stage.title}</h3>
                    <p className="m-0 font-ui text-sm leading-relaxed text-ink-muted">{stage.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-12" aria-labelledby="audience-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.audienceLabel}</SectionLabel>
            <h2 id="audience-title" className="mb-6 mt-0 text-2xl font-normal text-ink sm:text-[1.65rem]">
              {copy.audienceTitle}
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
              {copy.audienceItems.map((item) => (
                <li
                  key={item}
                  className="rounded-card border border-ink/8 bg-canvas/80 p-4 text-sm leading-relaxed text-ink-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="dor" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="problem-title">
          <SectionLabel>{copy.problemLabel}</SectionLabel>
          <h2 id="problem-title" className="mb-8 mt-0 max-w-xl text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.problemTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {copy.problems.map((p) => (
              <article key={p.title} className="rounded-card border border-ink/10 bg-white/80 p-5">
                <h3 className="mb-2 mt-0 text-base font-normal text-ink">{p.title}</h3>
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="gancho" className="border-y border-ink/8 bg-brand-50/70 py-14" aria-labelledby="wedge-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.wedgeLabel}</SectionLabel>
            <h2 id="wedge-title" className="mb-4 mt-0 max-w-2xl text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.wedgeTitle}
            </h2>
            <p className="m-0 max-w-2xl text-base leading-relaxed text-ink-muted">{copy.wedgeBody}</p>
          </div>
        </section>

        <section id="resultados" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="outcomes-title">
          <SectionLabel>{copy.outcomesLabel}</SectionLabel>
          <h2 id="outcomes-title" className="mb-8 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.outcomesTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {copy.outcomes.map((o) => (
              <article key={o.title} className="rounded-card border border-ink/10 bg-white/80 p-5">
                <h3 className="mb-2 mt-0 text-base font-normal text-ink">{o.title}</h3>
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{o.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="produto" className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="pillars-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.pillarsLabel}</SectionLabel>
            <h2 id="pillars-title" className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.pillarsTitle}
            </h2>
            <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-muted">{copy.pillarsLead}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {copy.pillars.map((p) => (
                <article key={p.id} id={p.id} className="rounded-card border border-ink/10 bg-canvas/80 p-5">
                  <h3 className="mb-3 mt-0 text-lg font-normal text-ink">{p.title}</h3>
                  <ul className="m-0 list-none space-y-2 p-0">
                    {p.items.map((line) => (
                      <li
                        key={line}
                        className="relative pl-4 text-sm leading-relaxed text-ink-muted before:absolute before:left-0 before:text-brand-400 before:content-['·']"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="vs" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="compare-title">
          <SectionLabel>{copy.compareLabel}</SectionLabel>
          <h2 id="compare-title" className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.compareTitle}
          </h2>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-muted">{copy.compareLead}</p>
          <div className="space-y-3">
            {copy.compareRows.map((row) => (
              <article key={row.them} className="rounded-card border border-ink/10 bg-white/80 p-4 sm:p-5">
                <h3 className="mb-2 mt-0 text-sm font-normal text-ink">{row.them}</h3>
                <p className="mb-1 mt-0 text-sm text-ink-faint">{row.gap}</p>
                <p className="m-0 text-sm leading-relaxed text-ink-muted">
                  <span className="text-brand-600">30Team: </span>
                  {row.us}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="origem" className="border-y border-ink/8 bg-canvas/80 py-14" aria-labelledby="builder-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.builderLabel}</SectionLabel>
            <h2 id="builder-title" className="mb-6 mt-0 max-w-2xl text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.builderTitle}
            </h2>
            <div className="flex max-w-2xl flex-col gap-4">
              {(copy.builderParagraphs || []).map((p) => (
                <p key={p.slice(0, 48)} className="m-0 text-base leading-relaxed text-ink-muted">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="how-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.howLabel}</SectionLabel>
            <h2 id="how-title" className="mb-10 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.howTitle}
            </h2>
            <ol className="m-0 grid list-none gap-6 p-0 sm:grid-cols-3">
              {copy.steps.map((s) => (
                <li key={s.n}>
                  <span className="mb-2 block font-mono text-xs text-brand-400">{s.n}</span>
                  <h3 className="mb-2 mt-0 text-base font-normal text-ink">{s.title}</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="confianca" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="trust-title">
          <SectionLabel>{copy.trustLabel}</SectionLabel>
          <h2 id="trust-title" className="mb-6 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.trustTitle}
          </h2>
          <ul className="m-0 max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
            {copy.trustItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section id="oferta" className="border-y border-ink/8 bg-brand-50/80 py-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.earlyLabel}</SectionLabel>
            <h2 className="mb-3 mt-0 max-w-lg text-2xl font-normal text-ink sm:text-[1.75rem]">{copy.earlyTitle}</h2>
            <p className="mb-5 max-w-2xl text-base leading-relaxed text-ink-muted">{copy.earlyBody}</p>
            <ul className="mb-6 flex list-none flex-wrap gap-2 p-0">
              {copy.earlyProof.map((p) => (
                <li
                  key={p}
                  className="rounded-control border border-success/20 bg-success/10 px-3 py-1.5 text-xs text-success"
                >
              {p}
            </li>
          ))}
        </ul>
        <Ctas copy={copy} />
        <p className="mt-3 text-sm text-ink-muted">
          <Link href="/pricing" className="text-brand-600 underline-offset-2 hover:underline">
            {copy.navPricing} →
          </Link>
        </p>
        <p className="mt-3 text-xs text-ink-faint">
          {copy.earlyContact}{' '}
          <a
            href={`mailto:${PRODUCT_LANDING_CONTACT_EMAIL}`}
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            {PRODUCT_LANDING_CONTACT_EMAIL}
          </a>
        </p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="faq-title">
          <SectionLabel>{copy.faqLabel}</SectionLabel>
          <h2 id="faq-title" className="mb-8 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.faqTitle}
          </h2>
          <div className="space-y-3">
            {copy.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-card border border-ink/10 bg-white/80 px-4 py-3 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-base text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mb-1 mt-3 text-sm leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-16 pt-4 sm:px-8">
          <h2 className="mb-3 mt-0 text-2xl font-normal text-ink">{copy.closeTitle}</h2>
          <p className="mb-8 max-w-xl text-sm leading-relaxed text-ink-muted">{copy.closeBody}</p>
          <Link
            href="/signup"
            className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white no-underline"
          >
            {copy.ctaEarly}
          </Link>
        </section>
        </main>
      </ContentEnter>

      <footer className="relative z-[1] border-t border-ink/8 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 text-xs text-ink-faint sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 max-w-xl">
              <span className="font-ui text-sm text-ink-muted">{copy.footerBrand}</span>
              {copy.footerCred ? (
                <p className="mb-0 mt-1.5 text-xs leading-relaxed text-ink-faint">{copy.footerCred}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:justify-end">
              <Link href="/pricing" className="text-ink-muted no-underline hover:text-ink">
                {copy.footerPricing}
              </Link>
              <span>{copy.footerLegal}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
