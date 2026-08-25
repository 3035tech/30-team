import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '../../lib/auth';
import { queryRead } from '../../lib/db';
import { normalizeLocale } from '../../lib/i18n';
import { isAdminRole, isManagerRole } from '../../lib/permissions';
import { attachCapabilityOverrides } from '../../lib/user-capabilities';
import { isSelfServiceOrigin, resolveUserOrigin } from '../../lib/user-signup-origin';

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
    /** Wizard “Primeiros passos” — só cohort /signup; admin/painel antigo não. */
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
        const origin = resolveUserOrigin({
          signupSource: row.signupSource,
          signupPending: row.signupPending,
          signupMetadata: row.signupMetadata,
        });
        // Early-access wizard only — never for admin master or panel-created users.
        const showOnboardingWizard =
          !isAdmin &&
          !onboardingCompleted &&
          isSelfServiceOrigin(origin);
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
