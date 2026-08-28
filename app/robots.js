import { buildRobotsRules } from '../lib/crawler-guard.js';

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

/**
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 *
 * /jobs e /companies ficam de fora do Disallow — vagas públicas continuam indexáveis.
 * Bots de IA: Disallow /, Allow /llms.txt apenas.
 */
export default function robots() {
  const base = appBaseUrl();
  return {
    rules: buildRobotsRules(),
    sitemap: base ? `${base}/sitemap.xml` : '/sitemap.xml',
    host: base || undefined,
  };
}
