import { localeNumberLocale, normalizeLocale } from './i18n.js';

export const EARLY_ADOPTER_MONTHLY_RATE = 9.9;
export const EARLY_ADOPTER_MONTHLY_RATE_USD = 5.9;
export const EARLY_ADOPTER_ANNUAL_DISCOUNT = 0.8;

/** Product prices are BRL only in Brazilian Portuguese, USD in other locales. */
export function publicPricingCurrency(locale) {
  return normalizeLocale(locale) === 'pt-BR' ? 'BRL' : 'USD';
}

export function getPublicPricing(locale, { employeeCount = 1, billingCycle = 'monthly' } = {}) {
  const currency = publicPricingCurrency(locale);
  // Independent fixed commercial prices; changing exchange rates must not alter them.
  const monthlyCents = Math.round((currency === 'BRL'
    ? EARLY_ADOPTER_MONTHLY_RATE : EARLY_ADOPTER_MONTHLY_RATE_USD) * 100);
  // Round the unit price first so the visible rate and calculator totals agree.
  const rateCents = billingCycle === 'annual'
    ? Math.round(monthlyCents * EARLY_ADOPTER_ANNUAL_DISCOUNT)
    : monthlyCents;
  return {
    currency,
    monthlyRate: rateCents / 100,
    monthlyTotal: rateCents * employeeCount / 100,
    annualTotal: rateCents * employeeCount * 12 / 100,
  };
}

export function formatPublicPrice(locale, amount) {
  const currency = publicPricingCurrency(locale);
  return new Intl.NumberFormat(localeNumberLocale(locale), {
    style: 'currency', currency,
    currencyDisplay: currency === 'USD' ? 'code' : 'symbol',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

export function publicPricingTextValues(locale) {
  return { monthlyPrice: formatPublicPrice(locale, getPublicPricing(locale).monthlyRate) };
}
