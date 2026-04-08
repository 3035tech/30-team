import { NextResponse } from 'next/server';
import { COOKIE_NAME } from './lib/auth';
import { verifyTokenEdge } from './lib/auth-edge';

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
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
