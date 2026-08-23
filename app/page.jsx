'use client';

import { useRouter } from 'next/navigation';
import { t } from '../lib/i18n';
import { useLocale } from '../lib/useLocale';
import LanguageSelect from './_components/LanguageSelect';
import { BrandMark } from './_components/BrandMark';

export default function HomePage() {
  const router = useRouter();
  const [locale, setLocale] = useLocale();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-6 font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow" />

      <div className="relative z-[1] w-full max-w-[720px] rounded-[20px] border border-ink/12 bg-white px-12 py-11 shadow-card backdrop-blur-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandMark size={36} withWordmark />
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>

        <p className="mb-2.5 mt-0 font-mono text-[11px] uppercase leading-normal tracking-[0.12em] text-brand-500/65">
          {t(locale, 'home.audience')}
        </p>

        <h1 className="mb-3 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-[clamp(28px,5vw,44px)] font-normal leading-[1.15] text-transparent">
          {t(locale, 'home.title').split('\n').map((line, i) => (
            <span key={i}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </h1>

        <p className="mb-2.5 mt-0 text-base font-normal leading-[1.55] text-ink">
          {t(locale, 'home.lead')}
        </p>
        <p className="mb-[22px] mt-0 text-[13px] leading-[1.65] text-ink-muted">
          {t(locale, 'home.body')}
        </p>

        <div id="como-funciona">
          <p className="mb-[22px] text-[15px] italic leading-[1.75] text-ink-muted">
            {t(locale, 'home.howItWorks')}
          </p>
        </div>

        <div className="mb-[18px] flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="cursor-pointer rounded-control border-none bg-gradient-to-br from-brand-500 to-brand-800 px-[18px] py-3.5 font-display text-sm text-white"
          >
            {t(locale, 'home.managerCta')}
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="cursor-pointer rounded-control border border-ink/12 bg-ink/[0.03] px-[18px] py-3.5 font-display text-sm text-ink"
          >
            {t(locale, 'home.howCta')}
          </button>
        </div>

        <div className="border-t border-ink/12 pt-[18px]">
          <div className="mb-1.5 font-mono text-[11px] text-ink-faint">
            {t(locale, 'home.formAccess')}
          </div>
          <div className="text-xs leading-relaxed text-ink-muted">
            {t(locale, 'home.formAccessHint')}
          </div>
        </div>
      </div>
    </div>
  );
}
