import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale } from '../lib/i18n';
import {
  buildProductLandingJsonLd,
  buildProductLandingMetadata,
  getProductLandingCopy,
} from '../lib/product-landing-seo';
import ProductLandingClient from './_components/ProductLandingClient';

export const dynamic = 'force-dynamic';

export function generateMetadata() {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  return buildProductLandingMetadata(locale);
}

export default function HomePage() {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const copyByLocale = {
    'pt-BR': getProductLandingCopy('pt-BR'),
    en: getProductLandingCopy('en'),
  };
  const jsonLd = buildProductLandingJsonLd(locale);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ProductLandingClient copyByLocale={copyByLocale} locale={locale} />
    </>
  );
}
