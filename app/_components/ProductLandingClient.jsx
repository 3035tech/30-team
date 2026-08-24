'use client';

import Link from 'next/link';
import { BrandMark } from './BrandMark';
import LanguageSelect from './LanguageSelect';
import { PRODUCT_LANDING_CONTACT_EMAIL } from '../../lib/product-landing-seo';
import { useLocale } from '../../lib/useLocale';

function earlyMailto(copy) {
  const subject = encodeURIComponent(copy.earlyMailSubject);
  const body = encodeURIComponent(copy.earlyMailBody);
  return `mailto:${PRODUCT_LANDING_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function SectionLabel({ children }) {
  return (
    <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-500/70">{children}</p>
  );
}

function Ctas({ copy, mail }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/login"
        className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white no-underline"
      >
        {copy.ctaLogin}
      </Link>
      <a
        href={mail}
        className="inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-white/70 px-5 py-3.5 text-sm text-ink no-underline"
      >
        {copy.ctaEarly}
      </a>
    </div>
  );
}

/**
 * Landpage completa. `copyByLocale` vem do RSC (HTML indexável no locale do cookie).
 */
export default function ProductLandingClient({ copyByLocale, locale: initialLocale }) {
  const [locale, setLocale] = useLocale(initialLocale);
  const copy = copyByLocale[locale === 'en' ? 'en' : 'pt-BR'] || copyByLocale['pt-BR'];
  const mail = earlyMailto(copy);

  const toc = [
    { href: '#o-que-e', label: copy.whatLabel },
    { href: '#capacidades', label: copy.pillarsLabel },
    { href: '#modulos', label: copy.modulesLabel },
    { href: '#urls', label: copy.urlsLabel },
    { href: '#faq', label: copy.faqLabel },
    { href: '#ficha', label: copy.factsLabel },
  ];

  return (
    <div className="min-h-screen bg-canvas font-display text-ink" lang={locale === 'en' ? 'en' : 'pt-BR'}>
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
            <a
              href={mail}
              className="hidden min-h-touch items-center rounded-control border border-ink/12 bg-transparent px-3 py-2 text-sm text-ink no-underline sm:inline-flex"
            >
              {copy.navEarly}
            </a>
            <Link
              href="/login"
              className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-3.5 py-2 text-sm text-white no-underline"
            >
              {copy.navLogin}
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo" className="relative z-[1]">
        <section id="produto-hero" className="mx-auto max-w-5xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
          <p className="mb-4 inline-block rounded-control border border-success/25 bg-success/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-success">
            {copy.earlyBadge}
          </p>
          <h1 className="mb-4 max-w-[20ch] bg-gradient-to-br from-brand-200 via-brand-400 to-brand-600 bg-clip-text text-[clamp(2rem,5.5vw,3.25rem)] font-normal leading-[1.12] text-transparent">
            {copy.heroTitle}
          </h1>
          <p className="mb-3 max-w-2xl text-lg leading-relaxed text-ink">{copy.heroLead}</p>
          <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{copy.heroBody}</p>
          <Ctas copy={copy} mail={mail} />
          <p className="mt-4 text-sm text-ink-faint">{copy.heroFoot}</p>
          <nav aria-label={copy.tocLabel} className="mt-8 flex flex-wrap gap-2">
            {toc.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-control border border-ink/10 bg-white/60 px-2.5 py-1.5 text-xs text-ink-muted no-underline hover:border-brand-300 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="problem-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.problemLabel}</SectionLabel>
            <h2 id="problem-title" className="mb-8 mt-0 max-w-xl text-2xl font-normal leading-snug text-ink sm:text-[1.75rem]">
              {copy.problemTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {copy.problems.map((text) => (
                <p
                  key={text}
                  className="m-0 rounded-card border border-ink/8 bg-canvas/80 p-4 text-sm leading-relaxed text-ink-muted"
                >
                  {text}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="how-title">
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
        </section>

        <section id="o-que-e" className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="what-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.whatLabel}</SectionLabel>
            <h2 id="what-title" className="mb-6 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.whatTitle}
            </h2>
            <ul className="m-0 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
              {copy.whatBody.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="capacidades" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="pillars-title">
          <SectionLabel>{copy.pillarsLabel}</SectionLabel>
          <h2 id="pillars-title" className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.pillarsTitle}
          </h2>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-muted">{copy.pillarsLead}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {copy.pillars.map((p) => (
              <article key={p.id} id={p.id} className="rounded-card border border-ink/10 bg-white/80 p-5 shadow-sm">
                <h3 className="mb-3 mt-0 font-display text-lg font-normal text-ink">{p.title}</h3>
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
        </section>

        <section id="modulos" className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="modules-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.modulesLabel}</SectionLabel>
            <h2 id="modules-title" className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.modulesTitle}
            </h2>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">{copy.modulesNote}</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {copy.modules.map((m) => (
                <li key={m} className="rounded-control border border-ink/10 bg-canvas px-3 py-1.5 text-sm text-ink">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="urls" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="urls-title">
          <SectionLabel>{copy.urlsLabel}</SectionLabel>
          <h2 id="urls-title" className="mb-6 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.urlsTitle}
          </h2>
          <div className="overflow-x-auto rounded-card border border-ink/10 bg-white/80">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-canvas/80">
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wide text-ink-faint">
                    URL
                  </th>
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wide text-ink-faint">
                    {copy.urlsLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {copy.urls.map((row) => (
                  <tr key={row.path} className="border-b border-ink/6 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-600">{row.path}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-14" aria-labelledby="diff-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.diffLabel}</SectionLabel>
            <h2 id="diff-title" className="mb-8 mt-0 max-w-xl text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.diffTitle}
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {copy.diffs.map((d) => (
                <li
                  key={d}
                  className="rounded-card border border-ink/10 bg-canvas/80 px-4 py-3.5 text-sm leading-relaxed text-ink-muted"
                >
                  {d}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm italic leading-relaxed text-ink-faint">{copy.diffNote}</p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-5 py-14 sm:px-8" aria-labelledby="faq-title">
          <SectionLabel>{copy.faqLabel}</SectionLabel>
          <h2 id="faq-title" className="mb-8 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {copy.faqTitle}
          </h2>
          <div className="space-y-4">
            {copy.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-card border border-ink/10 bg-white/80 px-4 py-3 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-base text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-normal">{f.q}</span>
                </summary>
                <p className="mb-1 mt-3 text-sm leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="ficha" className="border-y border-ink/8 bg-canvas py-14" aria-labelledby="facts-title">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.factsLabel}</SectionLabel>
            <h2 id="facts-title" className="mb-6 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {copy.factsTitle}
            </h2>
            <dl className="m-0 grid gap-3 sm:grid-cols-2">
              {copy.facts.map((f) => (
                <div key={f.k} className="rounded-card border border-ink/10 bg-white/80 px-4 py-3">
                  <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{f.k}</dt>
                  <dd className="m-0 mt-1 text-sm text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-ink-muted">
              <Link href="/llms.txt" className="text-brand-600 underline-offset-2 hover:underline">
                /llms.txt
              </Link>
            </p>
          </div>
        </section>

        <section id="early" className="border-b border-ink/8 bg-brand-50/80 py-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{copy.earlyLabel}</SectionLabel>
            <h2 className="mb-3 mt-0 max-w-lg text-2xl font-normal text-ink sm:text-[1.75rem]">{copy.earlyTitle}</h2>
            <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{copy.earlyBody}</p>
            <Ctas copy={copy} mail={mail} />
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

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <h2 className="mb-3 mt-0 text-2xl font-normal text-ink">{copy.closeTitle}</h2>
          <p className="mb-8 max-w-xl text-sm leading-relaxed text-ink-muted">{copy.closeBody}</p>
          <Link
            href="/login"
            className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white no-underline"
          >
            {copy.ctaLogin}
          </Link>
        </section>
      </main>

      <footer className="relative z-[1] border-t border-ink/8 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{copy.footerBrand}</span>
          <span>{copy.footerLegal}</span>
        </div>
      </footer>
    </div>
  );
}
