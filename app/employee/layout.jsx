import { cookies } from 'next/headers';
import { EmployeeShell } from '../_components/EmployeeShell';
import {
  EMPLOYEE_COOKIE_NAME,
} from '../../lib/employee-auth-constants.js';
import { verifyEmployeeToken, isEmployeeSessionPayload } from '../../lib/employee-auth.js';

export const dynamic = 'force-dynamic';

export default function ColaboradorLayout({ children }) {
  const jar = cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  const payload = token ? verifyEmployeeToken(token) : null;
  const locale =
    isEmployeeSessionPayload(payload) && payload.locale === 'en' ? 'en' : 'pt-BR';

  return (
    <EmployeeShell initialLocale={locale}>
      {children}
    </EmployeeShell>
  );
}
