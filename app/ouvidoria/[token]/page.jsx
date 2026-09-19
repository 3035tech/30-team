import { Suspense } from 'react';
import WhistleblowingPublicClient from './WhistleblowingPublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default async function WhistleblowingPublicPage(props) {
  const params = await props.params;
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <WhistleblowingPublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
