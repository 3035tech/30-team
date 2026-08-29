import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale } from '../../lib/i18n';
import { buildPricingJsonLd, buildPricingMetadata } from '../../lib/pricing-plans';
import PricingPageClient from '../_components/PricingPageClient';

export const dynamic = 'force-dynamic';

export function generateMetadata() {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  return buildPricingMetadata(locale);
}

export default function PricingPage() {
  const locale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  const jsonLd = buildPricingJsonLd(locale);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PricingPageClient locale={locale} />
    </>
  );
}
