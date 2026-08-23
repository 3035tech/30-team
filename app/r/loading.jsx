'use client';

import { BrandPulseLoading } from '../_components/PublicStatusScreens';

/** Next.js streaming fallback while /r/[token] loads. */
export default function VacancyReportLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <BrandPulseLoading locale="pt-BR" fullPage />
    </div>
  );
}
