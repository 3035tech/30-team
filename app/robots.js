function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

/**
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots() {
  const base = appBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/admin/', '/api/auth/', '/login'],
      },
    ],
    sitemap: base ? `${base}/sitemap.xml` : '/sitemap.xml',
    host: base || undefined,
  };
}
