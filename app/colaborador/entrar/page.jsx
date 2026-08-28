import { Suspense } from 'react';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import EmployeeEnterClient from './EmployeeEnterClient';

export const dynamic = 'force-dynamic';

export default function EmployeeEnterPage() {
  return (
    <AppFeedbackProvider locale="pt-BR">
      <Suspense fallback={<AppLoading variant="panel" />}>
        <EmployeeEnterClient />
      </Suspense>
    </AppFeedbackProvider>
  );
}
