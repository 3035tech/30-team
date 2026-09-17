import assert from 'node:assert/strict';

const seo = await import('../../lib/product-landing-seo.js');
const crawler = await import('../../lib/crawler-guard.js');

const pt = seo.getProductLandingCopy('pt-BR');
const en = seo.getProductLandingCopy('en');

assert.equal(pt.journeyStages.length, 4);
assert.equal(en.journeyStages.length, 4);
assert.match(pt.metaTitle, /recrutamento/i);
assert.match(en.metaTitle, /recruiting/i);

const llms = seo.buildProductLlmsTxt();
assert.match(llms, /\/jobs\/{slug\}-\{id\}/);
assert.match(llms, /\/companies\/\{companySlug\}/);
assert.doesNotMatch(llms, /Public jobs: .*\/j\n/);

const jsonLd = JSON.parse(seo.buildProductLandingJsonLd('pt-BR'));
const types = jsonLd['@graph'].map((entry) => entry['@type']);
assert.ok(types.includes('Organization'));
assert.ok(types.includes('WebSite'));
assert.ok(types.includes('SoftwareApplication'));
assert.ok(types.includes('WebPage'));
assert.ok(types.includes('FAQPage'));

const gptRule = crawler.buildRobotsRules().find((rule) => rule.userAgent === 'GPTBot');
assert.ok(gptRule.allow.includes('/'));
assert.ok(gptRule.allow.includes('/llms.txt'));
assert.ok(gptRule.disallow.includes('/dashboard'));
assert.ok(gptRule.disallow.includes('/v/'));
assert.ok(!gptRule.disallow.includes('/jobs'));

console.log('product landing SEO unit: ok');
