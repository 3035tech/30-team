'use client';

import { useEffect } from 'react';
import { useLocale } from '../../lib/useLocale';
import { C, FONTS, RADIAL_GLOW_SINGLE } from '../../lib/theme';
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
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: FONTS.serif,
      }}
    >
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: RADIAL_GLOW_SINGLE }} />
      <main style={{ position: 'relative', maxWidth: '880px', margin: '0 auto', padding: '40px 20px 64px' }}>
        <PublicFunnyError locale={locale} onRetry={typeof reset === 'function' ? reset : undefined} />
      </main>
    </div>
  );
}
