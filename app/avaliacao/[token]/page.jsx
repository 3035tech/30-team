import { Suspense } from 'react';
import SideReviewPublicClient from './SideReviewPublicClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function SideReviewPublicPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <SideReviewPublicClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
