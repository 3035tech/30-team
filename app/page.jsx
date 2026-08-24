'use client';

import { useRouter } from 'next/navigation';
import { t } from '../lib/i18n';
import { useLocale } from '../lib/useLocale';
import LanguageSelect from './_components/LanguageSelect';
import { BrandMark } from './_components/BrandMark';

const EARLY_MAIL = 'contact@3035tech.com';

function earlyMailto(locale) {
  const subject = encodeURIComponent(t(locale, 'productPage.earlyMailSubject'));
  const body = encodeURIComponent(t(locale, 'productPage.earlyMailBody'));
  return `mailto:${EARLY_MAIL}?subject=${subject}&body=${body}`;
}

function lines(locale, key) {
  return String(t(locale, key) || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function SectionLabel({ children }) {
  return (
    <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-500/70">{children}</p>
  );
}

function Pillar({ title, items }) {
  return (
    <div className="rounded-card border border-ink/10 bg-white/80 p-5 shadow-sm">
      <h3 className="mb-3 mt-0 font-display text-lg font-normal text-ink">{title}</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((line) => (
          <li
            key={line}
            className="relative pl-4 text-sm leading-relaxed text-ink-muted before:absolute before:left-0 before:text-brand-400 before:content-['·']"
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [locale, setLocale] = useLocale();

  const goLogin = () => router.push('/login');

  const pillars = [
    { titleKey: 'productPage.pillarRecruitTitle', itemsKey: 'productPage.pillarRecruitItems' },
    { titleKey: 'productPage.pillarProfileTitle', itemsKey: 'productPage.pillarProfileItems' },
    { titleKey: 'productPage.pillarTeamTitle', itemsKey: 'productPage.pillarTeamItems' },
    { titleKey: 'productPage.pillarJourneyTitle', itemsKey: 'productPage.pillarJourneyItems' },
  ];

  const diffs = ['productPage.diff1', 'productPage.diff2', 'productPage.diff3', 'productPage.diff4'];
  const problems = ['productPage.problem1', 'productPage.problem2', 'productPage.problem3'];
  const steps = [
    { n: '01', titleKey: 'productPage.step1Title', bodyKey: 'productPage.step1Body' },
    { n: '02', titleKey: 'productPage.step2Title', bodyKey: 'productPage.step2Body' },
    { n: '03', titleKey: 'productPage.step3Title', bodyKey: 'productPage.step3Body' },
  ];

  return (
    <div className="min-h-screen bg-canvas font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow opacity-80" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-ink/8 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="inline-flex items-center gap-2" aria-label="30Team">
            <BrandMark size={28} withWordmark />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LanguageSelect locale={locale} onChange={setLocale} compact />
            <a
              href={earlyMailto(locale)}
              className="hidden min-h-touch items-center rounded-control border border-ink/12 bg-transparent px-3 py-2 text-sm text-ink no-underline sm:inline-flex"
            >
              {t(locale, 'productPage.navEarly')}
            </a>
            <button
              type="button"
              onClick={goLogin}
              className="inline-flex min-h-touch cursor-pointer items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-3.5 py-2 text-sm text-white"
            >
              {t(locale, 'productPage.navLogin')}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-[1]">
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
          <p className="mb-4 inline-block rounded-control border border-success/25 bg-success/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-success">
            {t(locale, 'productPage.earlyBadge')}
          </p>
          <h1 className="mb-4 max-w-[18ch] bg-gradient-to-br from-brand-200 via-brand-400 to-brand-600 bg-clip-text text-[clamp(2rem,5.5vw,3.25rem)] font-normal leading-[1.12] text-transparent">
            {t(locale, 'productPage.heroTitle')}
          </h1>
          <p className="mb-3 max-w-2xl text-lg leading-relaxed text-ink">{t(locale, 'productPage.heroLead')}</p>
          <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{t(locale, 'productPage.heroBody')}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goLogin}
              className="inline-flex min-h-touch cursor-pointer items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white"
            >
              {t(locale, 'productPage.ctaLogin')}
            </button>
            <a
              href={earlyMailto(locale)}
              className="inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-white/70 px-5 py-3.5 text-sm text-ink no-underline"
            >
              {t(locale, 'productPage.ctaEarly')}
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-faint">{t(locale, 'productPage.heroFoot')}</p>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{t(locale, 'productPage.problemLabel')}</SectionLabel>
            <h2 className="mb-8 mt-0 max-w-xl text-2xl font-normal leading-snug text-ink sm:text-[1.75rem]">
              {t(locale, 'productPage.problemTitle')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {problems.map((key) => (
                <p
                  key={key}
                  className="m-0 rounded-card border border-ink/8 bg-canvas/80 p-4 text-sm leading-relaxed text-ink-muted"
                >
                  {t(locale, key)}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
          <SectionLabel>{t(locale, 'productPage.howLabel')}</SectionLabel>
          <h2 className="mb-10 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
            {t(locale, 'productPage.howTitle')}
          </h2>
          <ol className="m-0 grid list-none gap-6 p-0 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="relative">
                <span className="mb-2 block font-mono text-xs text-brand-400">{s.n}</span>
                <h3 className="mb-2 mt-0 text-base font-normal text-ink">{t(locale, s.titleKey)}</h3>
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{t(locale, s.bodyKey)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-ink/8 bg-white/50 py-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{t(locale, 'productPage.pillarsLabel')}</SectionLabel>
            <h2 className="mb-3 mt-0 text-2xl font-normal text-ink sm:text-[1.75rem]">
              {t(locale, 'productPage.pillarsTitle')}
            </h2>
            <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {t(locale, 'productPage.pillarsLead')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {pillars.map((p) => (
                <Pillar key={p.titleKey} title={t(locale, p.titleKey)} items={lines(locale, p.itemsKey)} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
          <SectionLabel>{t(locale, 'productPage.diffLabel')}</SectionLabel>
          <h2 className="mb-8 mt-0 max-w-xl text-2xl font-normal text-ink sm:text-[1.75rem]">
            {t(locale, 'productPage.diffTitle')}
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {diffs.map((key) => (
              <li
                key={key}
                className="rounded-card border border-ink/10 bg-white/70 px-4 py-3.5 text-sm leading-relaxed text-ink-muted"
              >
                {t(locale, key)}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm italic leading-relaxed text-ink-faint">{t(locale, 'productPage.diffNote')}</p>
        </section>

        <section id="early" className="border-y border-ink/8 bg-brand-50/80 py-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionLabel>{t(locale, 'productPage.earlyLabel')}</SectionLabel>
            <h2 className="mb-3 mt-0 max-w-lg text-2xl font-normal text-ink sm:text-[1.75rem]">
              {t(locale, 'productPage.earlyTitle')}
            </h2>
            <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              {t(locale, 'productPage.earlyBody')}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={goLogin}
                className="inline-flex min-h-touch cursor-pointer items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white"
              >
                {t(locale, 'productPage.ctaLogin')}
              </button>
              <a
                href={earlyMailto(locale)}
                className="inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-white/80 px-5 py-3.5 text-sm text-ink no-underline"
              >
                {t(locale, 'productPage.ctaEarly')}
              </a>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              {t(locale, 'productPage.earlyContact')}{' '}
              <a href={`mailto:${EARLY_MAIL}`} className="text-brand-600 underline-offset-2 hover:underline">
                {EARLY_MAIL}
              </a>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <h2 className="mb-3 mt-0 text-2xl font-normal text-ink">{t(locale, 'productPage.closeTitle')}</h2>
          <p className="mb-8 max-w-xl text-sm leading-relaxed text-ink-muted">{t(locale, 'productPage.closeBody')}</p>
          <button
            type="button"
            onClick={goLogin}
            className="inline-flex min-h-touch cursor-pointer items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3.5 text-sm text-white"
          >
            {t(locale, 'productPage.ctaLogin')}
          </button>
        </section>
      </main>

      <footer className="relative z-[1] border-t border-ink/8 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{t(locale, 'productPage.footerBrand')}</span>
          <span>{t(locale, 'productPage.footerLegal')}</span>
        </div>
      </footer>
    </div>
  );
}
