import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale, t } from '../../lib/i18n';
import { defaultPublicOgImageUrl, listOpenPublicVacancies } from '../../lib/public-vacancy-posting';
import { PublicVacanciesIndexView } from '../_components/PublicVacancyPosting';

export async function generateMetadata() {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const title = t(locale, 'publicVacancy.indexTitle');
  const description = t(locale, 'publicVacancy.indexIntro');
  const base = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const url = base ? `${base}/vagas` : '/vagas';
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

export default async function PublicVacanciesIndexPage() {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const items = await listOpenPublicVacancies({ limit: 48 });
  return <PublicVacanciesIndexView locale={locale} items={items} />;
}
