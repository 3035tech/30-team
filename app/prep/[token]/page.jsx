import { Suspense } from 'react';
import InterviewPrepClient from './InterviewPrepClient';
import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { BrandPulseLoading } from '../../_components/PublicStatusScreens';

export default function InterviewPrepPage({ params }) {
  const token = params?.token || '';
  return (
    <AppFeedbackProvider>
      <Suspense fallback={<BrandPulseLoading />}>
        <InterviewPrepClient token={token} />
      </Suspense>
    </AppFeedbackProvider>
  );
}
