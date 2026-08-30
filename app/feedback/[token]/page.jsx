import { Suspense } from 'react';
import FeedbackPublicClient from './FeedbackPublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function FeedbackPublicPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <FeedbackPublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
