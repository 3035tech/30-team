import { Suspense } from 'react';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { EmployeeLoginClient } from './EmployeeLoginClient';
import { normalizeLocale } from '../../../lib/i18n';

export const dynamic = 'force-dynamic';

export default async function EmployeeLoginPage(props) {
  const searchParams = await props.searchParams;
  const locale = normalizeLocale(searchParams?.locale);
  const reason = String(searchParams?.reason || '').slice(0, 40);
  return (
    <AppFeedbackProvider locale={locale}>
      <Suspense fallback={<AppLoading variant="panel" />}>
        <EmployeeLoginClient locale={locale} reason={reason} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
