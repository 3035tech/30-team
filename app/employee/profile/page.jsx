import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { EmployeeProfileClient } from './EmployeeProfileClient';
import { EMPLOYEE_COOKIE_NAME } from '../../../lib/employee-auth-constants.js';
import { isEmployeeSessionPayload, verifyEmployeeToken } from '../../../lib/employee-auth.js';

export const dynamic = 'force-dynamic';

export default function EmployeeProfilePage({ searchParams }) {
  const jar = cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  const payload = token ? verifyEmployeeToken(token) : null;
  if (!isEmployeeSessionPayload(payload)) {
    redirect('/colaborador/login');
  }
  const locale =
    searchParams?.locale === 'en' || payload.locale === 'en' ? 'en' : 'pt-BR';
  return <EmployeeProfileClient locale={locale} />;
}
