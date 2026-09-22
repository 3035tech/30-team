import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import { DashboardRouteLoading } from './DashboardRouteLoading';
import { resolveDashboardAuth } from './resolve-dashboard-auth';
import { loadDashboardTabData } from './load-dashboard-data';

/**
 * Auth (light) resolves first → shell paints via Suspense fallback while
 * tab queries run in DashboardTabPayload (B-201).
 */
export default async function DashboardPage(props) {
  const searchParams = await props.searchParams;
  const { authUser, locale, payload, isAdmin, companyId } = await resolveDashboardAuth();

  return (
    <Suspense
      fallback={<DashboardRouteLoading locale={locale} />}
    >
      <DashboardTabPayload
        searchParams={searchParams}
        authUser={authUser}
        locale={locale}
        payload={payload}
        isAdmin={isAdmin}
        companyId={companyId}
      />
    </Suspense>
  );
}

async function DashboardTabPayload({ searchParams, authUser, locale, payload, isAdmin, companyId }) {
  const data = await loadDashboardTabData({
    searchParams,
    payload,
    isAdmin,
    companyId,
    locale,
  });

  return (
    <DashboardClient
      {...data}
      auth={authUser}
      initialLocale={locale}
    />
  );
}
