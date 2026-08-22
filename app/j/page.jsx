import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale, t } from '../../lib/i18n';
import { normalizeEmploymentType } from '../../lib/vacancy-employment-type';
import {
  defaultPublicOgImageUrl,
  listOpenPublicVacancies,
  PUBLIC_JOB_PATH_PREFIX,
} from '../../lib/public-vacancy-posting';
import { PublicVacanciesIndexView } from '../_components/PublicVacancyPosting';

export async function generateMetadata({ searchParams } = {}) {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const q = String(searchParams?.q || '').trim();
  const title = q
    ? t(locale, 'publicVacancy.indexTitleFiltered', { q: q.slice(0, 40) })
    : t(locale, 'publicVacancy.indexTitle');
  const description = t(locale, 'publicVacancy.indexIntro');
  const base = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const url = base ? `${base}${PUBLIC_JOB_PATH_PREFIX}` : PUBLIC_JOB_PATH_PREFIX;
  const ogImage = defaultPublicOgImageUrl();
  return {
    metadataBase: base ? new URL(base) : undefined,
    title,
    description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1 },
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: '30Team',
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      images: ogImage ? [{ url: ogImage, width: 512, height: 512, alt: '30Team' }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PublicJobsIndexPage({ searchParams }) {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const q = String(searchParams?.q || '').trim().slice(0, 120);
  const employmentType = normalizeEmploymentType(searchParams?.employmentType);
  const pageRaw = parseInt(String(searchParams?.page || '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const result = await listOpenPublicVacancies({
    q: q || null,
    employmentType,
    page,
    pageSize: 12,
    includeTotal: true,
  });

  return (
    <PublicVacanciesIndexView
      locale={locale}
      items={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      filters={{ q, employmentType: employmentType || '' }}
    />
  );
}
