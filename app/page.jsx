import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale } from '../lib/i18n';
import {
  buildProductLandingJsonLd,
  buildProductLandingMetadata,
  getProductLandingCopy,
} from '../lib/product-landing-seo';
import ProductLandingClient from './_components/ProductLandingClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = normalizeLocale(await (await cookies()).get(LOCALE_COOKIE)?.value);
  return buildProductLandingMetadata(locale);
}

export default async function HomePage() {
  const locale = normalizeLocale(await (await cookies()).get(LOCALE_COOKIE)?.value);
  const copyByLocale = {
    'pt-BR': getProductLandingCopy('pt-BR'),
    'pt-PT': getProductLandingCopy('pt-PT'),
    en: getProductLandingCopy('en'),
    'es-419': getProductLandingCopy('es-419'),
  };
  const jsonLd = buildProductLandingJsonLd(locale);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ProductLandingClient copyByLocale={copyByLocale} locale={locale} />
    </>
  );
}
