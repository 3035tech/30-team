import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '../../lib/auth';
import { queryRead } from '../../lib/db';
import { normalizeLocale } from '../../lib/i18n';
import { isAdminRole, isManagerRole, isSuperAdminPayload } from '../../lib/permissions';
import { attachCapabilityOverrides } from '../../lib/user-capabilities';

/**
 * Light auth for dashboard chrome (JWT + optional display name).
 * Heavy tab queries stay in loadDashboardTabData / Suspense.
 */
export async function resolveDashboardAuth() {
  const cookieStore = await cookies();
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
    // Keep tenant module entitlements in the client auth snapshot as well as
    // the server payload. Navigation and deep-link parsing must use the same
    // source of truth as admin API authorization.
    companyModules: Array.isArray(payload?.companyModules) ? payload.companyModules : null,
    locale,
    email: null,
    displayName: null,
    onboardingCompleted: true, // default true (coluna pode não existir ainda)
    /** Wizard “Primeiros passos” — todo gestor novo, exceto super admin. */
    showOnboardingWizard: false,
    capabilitiesCustomized: Boolean(payload?.capabilitiesCustomized),
    capabilityOverrides: Array.isArray(payload?.capabilityOverrides)
      ? payload.capabilityOverrides
      : [],
  };
  try {
    if (payload?.userId) {
      const u = await queryRead(
        `SELECT email, display_name AS "displayName",
                onboarding_completed AS "onboardingCompleted",
                signup_source AS "signupSource",
                signup_pending AS "signupPending",
                signup_metadata AS "signupMetadata"
         FROM users WHERE id = $1 AND deleted = FALSE LIMIT 1`,
        [payload.userId]
      );
      if (u.rowCount) {
        const row = u.rows[0];
        const onboardingCompleted = row.onboardingCompleted !== false;
        // Todo gestor novo configura a empresa; super admin mantém acesso integral.
        const showOnboardingWizard =
          !isSuperAdminPayload(payload) && !onboardingCompleted;
        authUser = {
          ...authUser,
          email: row.email,
          displayName: row.displayName,
          onboardingCompleted,
          showOnboardingWizard,
        };
      }
    }
  } catch {
    /* display_name / onboarding / signup columns may be missing before migrations */
  }

  return { authUser, locale, payload, isAdmin, companyId };
}
