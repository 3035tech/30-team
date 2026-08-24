import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '../../lib/auth';
import { queryRead } from '../../lib/db';
import { normalizeLocale } from '../../lib/i18n';
import { isAdminRole, isManagerRole } from '../../lib/permissions';
import { attachCapabilityOverrides } from '../../lib/user-capabilities';

/**
 * Light auth for dashboard chrome (JWT + optional display name).
 * Heavy tab queries stay in loadDashboardTabData / Suspense.
 */
export async function resolveDashboardAuth() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const rawPayload = token ? verifyToken(token) : null;
  const payload = await attachCapabilityOverrides(rawPayload);
  if (!isManagerRole(payload)) redirect('/login');
  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  const locale = normalizeLocale(payload?.locale);
  if (!isAdmin && !companyId) redirect('/login');

  let authUser = {
    userId: payload?.userId ?? null,
    role: payload?.role || null,
    companyId: payload?.companyId ?? null,
    locale,
    email: null,
    displayName: null,
    onboardingCompleted: true, // default true (coluna pode não existir ainda)
    capabilitiesCustomized: Boolean(payload?.capabilitiesCustomized),
    capabilityOverrides: Array.isArray(payload?.capabilityOverrides)
      ? payload.capabilityOverrides
      : [],
  };
  try {
    if (payload?.userId) {
      const u = await queryRead(
        `SELECT email, display_name AS "displayName", onboarding_completed AS "onboardingCompleted"
         FROM users WHERE id = $1 AND deleted = FALSE LIMIT 1`,
        [payload.userId]
      );
      if (u.rowCount) {
        authUser = {
          ...authUser,
          email: u.rows[0].email,
          displayName: u.rows[0].displayName,
          onboardingCompleted: u.rows[0].onboardingCompleted !== false, // default true se NULL
        };
      }
    }
  } catch {
    /* display_name / onboarding_completed columns may be missing before migrations 023/053 */
  }

  return { authUser, locale, payload, isAdmin, companyId };
}
