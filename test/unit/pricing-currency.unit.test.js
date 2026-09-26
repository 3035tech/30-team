import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPublicPrice, getPublicPricing, publicPricingTextValues } from '../../lib/pricing-currency.js';
import { t, localeRegionConfig } from '../../lib/i18n.js';
import { getProductLandingCopy, buildProductLandingJsonLd } from '../../lib/product-landing-seo.js';
import { buildPricingJsonLd } from '../../lib/pricing-plans.js';

for (const locale of ['pt-BR', 'pt-PT', 'en', 'es-419']) {
  test(`${locale}: fixed commercial price, annual discount and totals`, () => {
    const brazil = locale === 'pt-BR';
    for (const employeeCount of [5, 20, 500]) {
      for (const billingCycle of ['monthly', 'annual']) {
        const cents = billingCycle === 'annual' ? (brazil ? 792 : 472) : (brazil ? 990 : 590);
        assert.deepEqual(getPublicPricing(locale, { employeeCount, billingCycle }), {
          currency: brazil ? 'BRL' : 'USD', monthlyRate: cents / 100,
          monthlyTotal: cents * employeeCount / 100, annualTotal: cents * employeeCount * 12 / 100,
        });
      }
    }
  });

  test(`${locale}: landing, FAQ, signup and structured data agree`, () => {
    const copy = getProductLandingCopy(locale);
    const values = publicPricingTextValues(locale);
    const price = formatPublicPrice(locale, locale === 'pt-BR' ? 9.9 : 5.9);
    const currency = locale === 'pt-BR' ? 'BRL' : 'USD';
    assert.ok(t(locale, `pricing.currency${currency}`).includes(currency));
    assert.match(t(locale, 'pricing.annualBillingNote'), /20%/);
    assert.match(t(locale, 'pricing.annualBillingNote'), /12/);
    for (const text of [copy.pricingSnapshotBody, copy.earlyBody,
      t(locale, 'pricing.faq1A', values), t(locale, 'signup.intro', values)]) {
      assert.ok(text.includes(price), text);
      assert.doesNotMatch(text, /\{monthlyPrice\}/);
      if (locale !== 'pt-BR') assert.doesNotMatch(text, /R\$|EUR|€/);
    }
    assert.ok(copy.faqs.some(({ a }) => a.includes(price)));
    for (const build of [buildProductLandingJsonLd, buildPricingJsonLd]) {
      const software = JSON.parse(build(locale))['@graph'].find((item) => item['@type'] === 'SoftwareApplication');
      assert.equal(software.offers.priceCurrency, locale === 'pt-BR' ? 'BRL' : 'USD');
      assert.equal(Number(software.offers.price), 0, 'Trial remains free');
    }
  });
}

test('public pricing does not change regional currencies for payroll and expenses', () => {
  assert.equal(localeRegionConfig('pt-PT').currency, 'EUR');
  assert.equal(getPublicPricing('en-US').monthlyRate, 5.9);
  assert.equal(getPublicPricing('pt_pt').currency, 'USD');
});
