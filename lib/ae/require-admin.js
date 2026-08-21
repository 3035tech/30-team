import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../auth';
import {
  CAP,
  canAccessAnalysisData,
  canAccessCandidateRecord,
  isAdminRole,
  isManagerRole,
  requireAnyCapability,
  requireCapability,
} from '../permissions';
import { attachCapabilityOverrides } from '../user-capabilities';

export {
  CAP,
  canAccessAnalysisData,
  canAccessCandidateRecord,
  isAdminRole,
  isManagerRole,
  requireAnyCapability,
  requireCapability,
};

export { verifySessionWithCapabilities } from '../user-capabilities';

export function requireManagerRole(payload) {
  return isManagerRole(payload);
}

export function requireAdminRole(payload) {
  return isAdminRole(payload);
}

/** Cookie session + per-user capability overrides (etapa 3). */
export async function getSessionPayload() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const payload = session ? verifyToken(session) : null;
  return attachCapabilityOverrides(payload);
}

export function getManagerScope(payload) {
  const isAdmin = isAdminRole(payload);
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
