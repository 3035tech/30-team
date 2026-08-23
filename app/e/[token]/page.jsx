import { Suspense } from 'react';
import EmployeePortalClient from './EmployeePortalClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function EmployeePortalPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <EmployeePortalClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
