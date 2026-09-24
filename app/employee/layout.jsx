import { cookies } from 'next/headers';
import { EmployeeShell } from '../_components/EmployeeShell';
import {
  EMPLOYEE_COOKIE_NAME,
} from '../../lib/employee-auth-constants.js';
import { verifyEmployeeToken, isEmployeeSessionPayload } from '../../lib/employee-auth.js';
import { normalizeLocale } from '../../lib/i18n.js';

export const dynamic = 'force-dynamic';

export default async function EmployeeLayout({ children }) {
  const jar = await cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  const payload = token ? verifyEmployeeToken(token) : null;
  const locale = isEmployeeSessionPayload(payload) ? normalizeLocale(payload.locale) : 'pt-BR';

  return (
    <EmployeeShell initialLocale={locale}>
      {children}
    </EmployeeShell>
  );
}
