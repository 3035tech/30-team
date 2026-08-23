import { Suspense } from 'react';
import ClimatePublicClient from './ClimatePublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function ClimatePublicPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <ClimatePublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
