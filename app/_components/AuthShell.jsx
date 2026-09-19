'use client';

import { cn } from '../../lib/cn';
import { BrandMark } from './BrandMark';
import LanguageSelect from './LanguageSelect';
import { PublicNarrowShell } from './PublicNarrowShell';

/** Shared authentication chrome for manager and collaborator entry points. */
export function AuthShell({
  locale,
  onLocaleChange,
  context,
  title,
  intro,
  children,
  className = '',
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-8 font-ui text-ink sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow-single" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden />
      <PublicNarrowShell
        variant="form"
        locale={locale}
        maxWidthClass="max-w-[440px]"
        className="relative z-[1] py-0"
      >
        <div className={cn('w-full rounded-[20px] border border-ink/12 bg-surface px-7 py-8 shadow-card sm:px-10 sm:py-10', className)}>
          <header className="mb-7">
            <div className="mb-7 flex items-center justify-between gap-3">
              <BrandMark size={36} withWordmark />
              <LanguageSelect locale={locale} onChange={onLocaleChange} compact />
            </div>
            {context ? <p className="mb-2 mt-0 text-xs font-semibold text-brand-700">{context}</p> : null}
            <h1 className="m-0 font-display text-3xl font-normal leading-tight text-ink sm:text-4xl">
              {title}
            </h1>
            {intro ? <p className="mb-0 mt-3 text-sm leading-6 text-ink-muted">{intro}</p> : null}
          </header>
          {children}
        </div>
      </PublicNarrowShell>
    </div>
  );
}
