import { listSitemapPublicEntries } from '../lib/public-vacancy-posting';

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

/**
 * Sitemap: / + /vagas + vagas públicas indexáveis.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default async function sitemap() {
  const base = appBaseUrl();
  if (!base) return [];

  const now = new Date();
  const entries = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${base}/vagas`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  try {
    const jobs = await listSitemapPublicEntries({ limit: 5000 });
    for (const job of jobs) {
      entries.push({
        url: job.url.startsWith('http') ? job.url : `${base}${job.path}`,
        lastModified: job.lastModified || now,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch (err) {
    console.error('[sitemap] failed to list public vacancies', err?.message || err);
  }

  return entries;
}

export const dynamic = 'force-dynamic';
