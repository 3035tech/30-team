import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../auth';

export function requireManagerRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export function requireAdminRole(payload) {
  return payload?.role === 'admin';
}

export function getSessionPayload() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return session ? verifyToken(session) : null;
}

export function getManagerScope(payload) {
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  return { isAdmin, companyId, authorized: isAdmin || companyId != null };
}

export function publicAppUrl(request) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return '';
}
