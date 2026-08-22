import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  resolvePublicVacancyPosting as resolveLegacyRaw,
} from '../../../../lib/public-vacancy-posting';

/** Legado `/vaga/{company}/{slug}` → canônica `/vagas/{slug}-{id}` (308 permanente). */
const resolveLegacy = cache(resolveLegacyRaw);

export async function generateMetadata() {
  return {
    robots: { index: false, follow: true },
  };
}

export default async function LegacyPublicVacancyRedirect({ params }) {
  const companySlug = typeof params?.companySlug === 'string' ? params.companySlug : '';
  const vacancySlug = typeof params?.vacancySlug === 'string' ? params.vacancySlug : '';
  const resolved = await resolveLegacy(companySlug, vacancySlug);
  if (!resolved.ok) notFound();
  permanentRedirect(resolved.canonicalPath);
}
