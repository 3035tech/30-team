/**
 * Content-Security-Policy — opt-in via ENABLE_CSP=true (runtime, middleware).
 * Report-only continua disponível via CSP_REPORT_ONLY (sem enforcement).
 */

/**
 * Política padrão alinhada ao stack Next 14 + logos S3 + player LMS (YouTube/Vimeo)
 * + Turnstile + Cloudflare Web Analytics (beacon injetado na borda quando Insights está ligado).
 */
export function buildDefaultContentSecurityPolicy() {
  return [
    "default-src 'self'",
    // Next.js / React — inline + eval ainda necessários no build atual
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com https://*.cloudflareinsights.com",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export function resolveContentSecurityPolicy() {
  const custom = String(process.env.CSP_POLICY || '').trim();
  if (custom) return custom;
  return buildDefaultContentSecurityPolicy();
}

/** @param {import('next/server').NextResponse} response */
export function applyContentSecurityPolicyHeaders(response) {
  const enforce = process.env.ENABLE_CSP === 'true';
  const reportOnly = String(process.env.CSP_REPORT_ONLY || '').trim();

  if (enforce) {
    response.headers.set('Content-Security-Policy', resolveContentSecurityPolicy());
    return response;
  }

  if (reportOnly) {
    response.headers.set('Content-Security-Policy-Report-Only', reportOnly);
  }

  return response;
}
