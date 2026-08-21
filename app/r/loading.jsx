'use client';

import { BrandPulseLoading } from '../_components/PublicStatusScreens';

/** Next.js streaming fallback while /r/[token] loads. */
export default function VacancyReportLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BrandPulseLoading locale="pt-BR" fullPage />
    </div>
  );
}
