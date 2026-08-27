import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { LOCALE_COOKIE, normalizeLocale, t } from '../../../../lib/i18n';
import {
  listAggregatorVacancies,
  resolveCityAggregator,
} from '../../../../lib/public-job-aggregators';
import { defaultPublicOgImageUrl } from '../../../../lib/public-vacancy-posting';
import { publicCityAggregatorPath } from '../../../../lib/public-job-url';
import { PublicVacanciesIndexView } from '../../../_components/PublicVacancyPosting';

export async function generateMetadata({ params, searchParams } = {}) {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const resolved = await resolveCityAggregator(params?.citySlug);
  if (!resolved.ok) {
    return {
      title: t(locale, 'publicVacancy.aggregatorNotFoundTitle'),
      robots: { index: false, follow: false },
    };
  }
  const city = resolved.city;
  const title = t(locale, 'publicVacancy.aggregatorCityTitle', { city });
  const description = t(locale, 'publicVacancy.aggregatorCityDescription', { city });
  const base = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const path = publicCityAggregatorPath(resolved.slug);
  const url = base ? `${base}${path}` : path;
  const ogImage = defaultPublicOgImageUrl();
  const pageRaw = parseInt(String(searchParams?.page || '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const canonical = page > 1 ? `${url}?page=${page}` : url;
  return {
    metadataBase: base ? new URL(base) : undefined,
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1 },
    },
    openGraph: {
      type: 'website',
      url: canonical,
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

export default async function PublicCityJobsPage({ params, searchParams }) {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const resolved = await resolveCityAggregator(params?.citySlug);
  if (!resolved.ok) notFound();

  const pageRaw = parseInt(String(searchParams?.page || '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const result = await listAggregatorVacancies('city', {
    city: resolved.city,
    cityNames: resolved.cityNames,
    page,
    pageSize: 12,
  });
  if ((Number(result.total) || 0) < 1) notFound();

  return (
    <PublicVacanciesIndexView
      locale={locale}
      items={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      title={t(locale, 'publicVacancy.aggregatorCityTitle', { city: resolved.city })}
      intro={t(locale, 'publicVacancy.aggregatorCityIntro', { city: resolved.city })}
      basePath={publicCityAggregatorPath(resolved.slug)}
      showSearchForm={false}
      showJobAlert={false}
    />
  );
}
