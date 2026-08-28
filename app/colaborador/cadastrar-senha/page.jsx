import { AppFeedbackProvider } from '../../_components/AppFeedback';
import EmployeeSetPasswordClient from './EmployeeSetPasswordClient';

export const dynamic = 'force-dynamic';

export default function EmployeeSetPasswordPage() {
  return (
    <AppFeedbackProvider locale="pt-BR">
      <EmployeeSetPasswordClient />
    </AppFeedbackProvider>
  );
}
