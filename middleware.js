import { NextResponse } from 'next/server';
import { COOKIE_NAME } from './lib/auth';
import { verifyTokenEdge, verifyEmployeeTokenEdge } from './lib/auth-edge';
import { isManagerRole } from './lib/permissions';
import { ERR } from './lib/api-error-codes';
import { EMPLOYEE_COOKIE_NAME } from './lib/employee-auth-constants';
import {
  EMPLOYEE_PATH,
  isEmployeeAppPath,
  isPublicEmployeeAuthPath,
} from './lib/employee-paths';
import {
  JOB_ATTR_COOKIE,
  attributionCookieOptions,
  decodeAttributionCookie,
  encodeAttributionCookie,
  mergeAttribution,
  parseAttributionFromSearchParams,
  searchHasAttribution,
} from './lib/job-attribution';
import { applyContentSecurityPolicyHeaders } from './lib/security-csp';
import { isCrawlerNoIndexPath } from './lib/crawler-guard';

/** Cabeçalhos de segurança (baseline + HSTS/CSP opcionais via env). */
function withSecurityHeaders(response, { noindex = false } = {}) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (noindex) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  applyContentSecurityPolicyHeaders(response);

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

function secureResponse(request, response) {
  const noindex = isCrawlerNoIndexPath(request.nextUrl.pathname);
  return withJobAttributionCookie(request, withSecurityHeaders(response, { noindex }));
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

function isPublicEmployeeSurface(pathname) {
  return (
    isPublicEmployeeAuthPath(pathname) ||
    pathname === '/api/auth/employee/magic-link' ||
    pathname === '/api/auth/employee/session' ||
    pathname === '/api/auth/employee/login' ||
    pathname === '/api/auth/employee/set-password' ||
    pathname === '/api/auth/employee/forgot-password'
  );
}

const SESSION_EDGE_PATH = '/api/auth/session-edge';

async function sessionEdgeSaysLive(request) {
  try {
    const checkUrl = new URL(SESSION_EDGE_PATH, request.url);
    const res = await fetch(checkUrl, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function isManagerSessionLive(request, payload) {
  try {
    const checkUrl = new URL(SESSION_EDGE_PATH, request.url);
    const res = await fetch(checkUrl, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    if (res.ok) return true;
    if (res.status === 401) return false;
  } catch {
    /* Self-fetch do middleware falha em alguns deploys (ingress/edge) — ver fallback abaixo. */
  }
  const sv = Number(payload?.sv);
  return Number.isFinite(sv) && sv >= 1;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === SESSION_EDGE_PATH) {
    return secureResponse(request, NextResponse.next());
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? await verifyTokenEdge(token) : null;

    if (!isManagerRole(payload)) {
      if (token && (await sessionEdgeSaysLive(request))) {
        return secureResponse(request, NextResponse.next());
      }
      if (pathname.startsWith('/api/')) {
        return secureResponse(
          request,
          NextResponse.json({ error: 'UNAUTHORIZED', errorCode: ERR.UNAUTHORIZED }, { status: 401 })
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return secureResponse(request, NextResponse.redirect(loginUrl));
    }

    const live = await isManagerSessionLive(request, payload);
    if (!live) {
      if (pathname.startsWith('/api/')) {
        return secureResponse(
          request,
          NextResponse.json({ error: 'UNAUTHORIZED', errorCode: ERR.UNAUTHORIZED }, { status: 401 })
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return secureResponse(request, NextResponse.redirect(loginUrl));
    }
  }

  // Collaborator hub — employee JWT only (never manager cookie alone).
  if (
    (isEmployeeAppPath(pathname) || pathname.startsWith('/api/employee')) &&
    !isPublicEmployeeSurface(pathname)
  ) {
    const empToken = request.cookies.get(EMPLOYEE_COOKIE_NAME)?.value;
    const emp = empToken ? await verifyEmployeeTokenEdge(empToken) : null;
    if (!emp) {
      if (pathname.startsWith('/api/')) {
        return secureResponse(
          request,
          NextResponse.json({ error: 'UNAUTHORIZED', errorCode: ERR.UNAUTHORIZED }, { status: 401 })
        );
      }
      return secureResponse(
        request,
        NextResponse.redirect(new URL(EMPLOYEE_PATH.LOGIN, request.url))
      );
    }
  }

  return secureResponse(request, NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|site.webmanifest).*)',
  ],
};
