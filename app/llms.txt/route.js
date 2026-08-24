import { buildProductLlmsTxt } from '../../lib/product-landing-seo';

/**
 * Documento plano para crawlers de IA (padrão llms.txt).
 * @see https://llmstxt.org/
 */
export function GET() {
  const body = buildProductLlmsTxt();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'all',
    },
  });
}
