import { NextResponse } from 'next/server';
import { COOKIE_NAME } from './lib/auth';
import { verifyTokenEdge } from './lib/auth-edge';

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

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? await verifyTokenEdge(token) : null;

    const role = payload?.role;
    const allowed = role === 'admin' || role === 'direction' || role === 'hr';
    if (!allowed) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  // Inclui HTML e APIs para HSTS/CSP opcionais; auth só nos paths abaixo.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
