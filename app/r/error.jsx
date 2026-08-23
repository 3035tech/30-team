'use client';

import { useEffect } from 'react';
import { useLocale } from '../../lib/useLocale';
import { PublicFunnyError } from '../_components/PublicStatusScreens';

/**
 * Route-level error UI for /r — funny “broken but fixing” screen.
 */
export default function VacancyReportError({ error, reset }) {
  const [locale] = useLocale();

  useEffect(() => {
    if (error) console.error('[/r error]', error);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-canvas font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
      <main className="relative mx-auto max-w-[880px] px-5 pb-16 pt-10">
        <PublicFunnyError locale={locale} onRetry={typeof reset === 'function' ? reset : undefined} />
      </main>
    </div>
  );
}
