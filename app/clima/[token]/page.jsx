import { Suspense } from 'react';
import ClimatePublicClient from './ClimatePublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default async function ClimatePublicPage(props) {
  const params = await props.params;
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <ClimatePublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
