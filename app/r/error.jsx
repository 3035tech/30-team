'use client';

import { AppErrorScreen } from '../_components/AppErrorScreen';

/** Route-level error UI for the public /r report: no dashboard link (external audience). */
export default function VacancyReportError({ error, retry, reset }) {
  const onRetry = typeof retry === 'function' ? retry : reset;
  return (
    <div className="relative min-h-screen bg-canvas font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
      <AppErrorScreen error={error} onRetry={onRetry} homeHref={null} className="relative min-h-screen" />
    </div>
  );
}
