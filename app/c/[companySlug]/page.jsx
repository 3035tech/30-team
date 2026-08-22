import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { LOCALE_COOKIE, normalizeLocale, t } from '../../../lib/i18n';
import {
  defaultPublicOgImageUrl,
  listOpenPublicVacancies,
  resolvePublicCompanyBySlug,
} from '../../../lib/public-vacancy-posting';
import { publicCompanyPath } from '../../../lib/public-job-url';
import { PublicCompanyPageView } from '../../_components/PublicVacancyPosting';

export async function generateMetadata({ params }) {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const resolved = await resolvePublicCompanyBySlug(params?.companySlug);
  if (!resolved.ok) {
    return { title: t(locale, 'publicVacancy.companyNotFoundTitle'), robots: { index: false, follow: false } };
  }
  const name = resolved.company.name;
  const title = t(locale, 'publicVacancy.companyPageTitle', { name });
  const description = t(locale, 'publicVacancy.companyPageDescription', { name });
  const base = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const path = publicCompanyPath(resolved.company.slug);
  const url = base ? `${base}${path}` : path;
  const ogImage = defaultPublicOgImageUrl();
  return {
    metadataBase: base ? new URL(base) : undefined,
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: '30Team',
      images: ogImage ? [{ url: ogImage, width: 512, height: 512, alt: '30Team' }] : undefined,
    },
  };
}

export default async function PublicCompanyPage({ params }) {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const resolved = await resolvePublicCompanyBySlug(params?.companySlug);
  if (!resolved.ok) notFound();

  const listed = await listOpenPublicVacancies({
    companyId: resolved.company.companyId,
    filterCompanyId: true,
    page: 1,
    pageSize: 48,
    includeTotal: true,
  });

  return (
    <PublicCompanyPageView
      locale={locale}
      company={resolved.company}
      items={listed.items}
      total={listed.total}
    />
  );
}
