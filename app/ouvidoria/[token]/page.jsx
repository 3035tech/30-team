import { Suspense } from 'react';
import WhistleblowingPublicClient from './WhistleblowingPublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function WhistleblowingPublicPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <WhistleblowingPublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
