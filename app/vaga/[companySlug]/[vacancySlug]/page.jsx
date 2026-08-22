import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { LOCALE_COOKIE, normalizeLocale, t } from '../../../../lib/i18n';
import {
  buildJobPostingJsonLd,
  listOpenPublicVacancies,
  postingMetaDescription,
  publicVacancyAbsoluteUrl,
  resolvePublicVacancyPosting,
  serializeJsonLdForScript,
} from '../../../../lib/public-vacancy-posting';
import { PublicVacancyPostingView } from '../../../_components/PublicVacancyPosting';
export async function generateMetadata({ params }) {
  const companySlug = typeof params?.companySlug === 'string' ? params.companySlug : '';
  const vacancySlug = typeof params?.vacancySlug === 'string' ? params.vacancySlug : '';
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const resolved = await resolvePublicVacancyPosting(companySlug, vacancySlug);

  if (!resolved.ok) {
    return {
      title: t(locale, 'publicVacancy.notFoundTitle'),
      robots: { index: false, follow: false },
    };
  }

  const { posting } = resolved;
  const closed = String(posting.status) !== 'open';
  const title = closed
    ? t(locale, 'publicVacancy.closedMetaTitle', { title: posting.title })
    : posting.showCompany && posting.company?.name
      ? `${posting.title} · ${posting.company.name}`
      : posting.title;
  const description = closed
    ? t(locale, 'publicVacancy.closedMetaDescription')
    : postingMetaDescription(posting, locale);
  const url = posting.pageUrl || publicVacancyAbsoluteUrl(posting.companySlug, posting.vacancySlug);
  const indexable = Boolean(posting.publicAllowIndex) && !closed;

  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
      },
    },
    openGraph: {
      type: 'website',
      url: url || undefined,
      title,
      description,
      siteName: '30Team',
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PublicVacancyPage({ params }) {
  const companySlug = typeof params?.companySlug === 'string' ? params.companySlug : '';
  const vacancySlug = typeof params?.vacancySlug === 'string' ? params.vacancySlug : '';
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const resolved = await resolvePublicVacancyPosting(companySlug, vacancySlug);
  if (!resolved.ok) notFound();

  const { posting } = resolved;
  const closed = String(posting.status) !== 'open';
  const related = closed
    ? await listOpenPublicVacancies({
        companyId: posting.company?.id ?? posting.companyId ?? null,
        excludeVacancyId: posting.vacancyId,
        limit: 8,
      })
    : [];

  const jsonLd =
    !closed && posting.publicAllowIndex ? buildJobPostingJsonLd(posting, locale) : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLdForScript(jsonLd) }}
        />
      ) : null}
      <PublicVacancyPostingView locale={locale} posting={posting} related={related} />
    </>
  );
}
