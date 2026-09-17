import { Suspense } from 'react';
import FormalReviewPublicClient from './FormalReviewPublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function FormalReviewPublicPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <FormalReviewPublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
