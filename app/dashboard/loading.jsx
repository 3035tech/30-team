import DashboardClient from './DashboardClient';
import { resolveDashboardAuth } from './resolve-dashboard-auth';

/**
 * Soft-nav: same shell chrome as Suspense fallback (B-201) while tab RSC re-fetches.
 */
export default async function DashboardLoading() {
  const { authUser, locale } = await resolveDashboardAuth();
  return <DashboardClient auth={authUser} initialLocale={locale} panelLoading />;
}
