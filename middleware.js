import { NextResponse } from 'next/server';
import { COOKIE_NAME } from './lib/auth';
import { verifyTokenEdge } from './lib/auth-edge';
import { isManagerRole } from './lib/permissions';
import {
  JOB_ATTR_COOKIE,
  attributionCookieOptions,
  decodeAttributionCookie,
  encodeAttributionCookie,
  mergeAttribution,
  parseAttributionFromSearchParams,
  searchHasAttribution,
} from './lib/job-attribution';

/** Cabeçalhos opcionais em runtime (produção HTTPS). Ver .env.example. */
function withSecurityHeaders(response) {
  const csp = process.env.CSP_REPORT_ONLY?.trim();
  if (csp) {
    response.headers.set('Content-Security-Policy-Report-Only', csp);
  }
  if (process.env.ENABLE_HSTS === 'true') {
    const maxAge = process.env.HSTS_MAX_AGE?.trim() || '31536000';
    const preload = process.env.HSTS_PRELOAD === 'true' ? '; preload' : '';
    response.headers.set(
      'Strict-Transport-Security',
      `max-age=${maxAge}; includeSubDomains${preload}`
    );
  }
  return response;
}

function withJobAttributionCookie(request, response) {
  try {
    if (!searchHasAttribution(request.nextUrl.searchParams)) return response;
    const existing = decodeAttributionCookie(request.cookies.get(JOB_ATTR_COOKIE)?.value);
    const incoming = parseAttributionFromSearchParams(
      request.nextUrl.searchParams,
      request.nextUrl.pathname,
      { sessionId: existing?.sessionId }
    );
    const merged = mergeAttribution(existing, incoming);
    const encoded = encodeAttributionCookie(merged);
    if (encoded) {
      response.cookies.set(JOB_ATTR_COOKIE, encoded, attributionCookieOptions());
    }
  } catch {
    /* ignore attribution failures */
  }
  return response;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? await verifyTokenEdge(token) : null;

    if (!isManagerRole(payload)) {
      if (pathname.startsWith('/api/')) {
        return withJobAttributionCookie(
          request,
          withSecurityHeaders(
            NextResponse.json({ error: 'UNAUTHORIZED', errorCode: 'UNAUTHORIZED' }, { status: 401 })
          )
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withJobAttributionCookie(
        request,
        withSecurityHeaders(NextResponse.redirect(loginUrl))
      );
    }
  }

  return withJobAttributionCookie(request, withSecurityHeaders(NextResponse.next()));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|site.webmanifest).*)',
  ],
};
