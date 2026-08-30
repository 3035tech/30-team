import { Suspense } from 'react';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { EmployeeLoginClient } from './EmployeeLoginClient';

export const dynamic = 'force-dynamic';

export default function EmployeeLoginPage({ searchParams }) {
  const locale = searchParams?.locale === 'en' ? 'en' : 'pt-BR';
  const reason = String(searchParams?.reason || '').slice(0, 40);
  return (
    <AppFeedbackProvider locale={locale}>
      <Suspense fallback={<AppLoading variant="panel" />}>
        <EmployeeLoginClient locale={locale} reason={reason} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
