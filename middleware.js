import { NextResponse } from 'next/server';
import { COOKIE_NAME } from './lib/auth';
import { verifyTokenEdge, verifyEmployeeTokenEdge } from './lib/auth-edge';
import { isManagerRole } from './lib/permissions';
import { ERR } from './lib/api-error-codes';
import { EMPLOYEE_COOKIE_NAME } from './lib/employee-auth-constants';
import {
  JOB_ATTR_COOKIE,
  attributionCookieOptions,
  decodeAttributionCookie,
  encodeAttributionCookie,
  mergeAttribution,
  parseAttributionFromSearchParams,
  searchHasAttribution,
} from './lib/job-attribution';

/** Cabeçalhos de segurança (baseline + HSTS/CSP opcionais via env). */
function withSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const csp = process.env.CSP_REPORT_ONLY?.trim();
  if (csp) {
    response.headers.set('Content-Security-Policy-Report-Only', csp);
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  const hstsOn =
    process.env.ENABLE_HSTS === 'true' ||
    (process.env.NODE_ENV === 'production' && appUrl.startsWith('https://'));
  if (hstsOn) {
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

function isPublicEmployeeAuthPath(pathname) {
  return (
    pathname === '/colaborador/login' ||
    pathname.startsWith('/colaborador/entrar') ||
    pathname.startsWith('/colaborador/cadastrar-senha') ||
    pathname === '/api/auth/employee/magic-link' ||
    pathname === '/api/auth/employee/session' ||
    pathname === '/api/auth/employee/login' ||
    pathname === '/api/auth/employee/set-password' ||
    pathname === '/api/auth/employee/forgot-password'
  );
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
            NextResponse.json({ error: 'UNAUTHORIZED', errorCode: ERR.UNAUTHORIZED }, { status: 401 })
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

  // Collaborator hub — employee JWT only (never manager cookie alone).
  if (
    (pathname.startsWith('/colaborador') || pathname.startsWith('/api/employee')) &&
    !isPublicEmployeeAuthPath(pathname)
  ) {
    const empToken = request.cookies.get(EMPLOYEE_COOKIE_NAME)?.value;
    const emp = empToken ? await verifyEmployeeTokenEdge(empToken) : null;
    if (!emp) {
      if (pathname.startsWith('/api/')) {
        return withJobAttributionCookie(
          request,
          withSecurityHeaders(
            NextResponse.json({ error: 'UNAUTHORIZED', errorCode: ERR.UNAUTHORIZED }, { status: 401 })
          )
        );
      }
      return withJobAttributionCookie(
        request,
        withSecurityHeaders(NextResponse.redirect(new URL('/colaborador/login', request.url)))
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
