import { Suspense } from 'react';
import TeamPulsePublicClient from './TeamPulsePublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default async function TeamPulsePublicPage(props) {
  const params = await props.params;
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <TeamPulsePublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
