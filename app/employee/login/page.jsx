import { AppFeedbackProvider } from '../../_components/AppFeedback';
import { EmployeeLoginClient } from './EmployeeLoginClient';

export const dynamic = 'force-dynamic';

export default function EmployeeLoginPage({ searchParams }) {
  const locale = searchParams?.locale === 'en' ? 'en' : 'pt-BR';
  return (
    <AppFeedbackProvider locale={locale}>
      <EmployeeLoginClient locale={locale} />
    </AppFeedbackProvider>
  );
}
