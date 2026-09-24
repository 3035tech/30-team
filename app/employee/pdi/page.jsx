import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppLoading } from '../../_components/AppLoading';
import { EMPLOYEE_COOKIE_NAME } from '../../../lib/employee-auth-constants.js';
import { isEmployeeSessionPayload, verifyEmployeeToken } from '../../../lib/employee-auth.js';
import { normalizeLocale } from '../../../lib/i18n.js';
import { EmployeePdiClient } from './EmployeePdiClient';

export const dynamic = 'force-dynamic';

export default async function EmployeePdiPage(props) {
  const searchParams = await props.searchParams;
  const jar = await cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  const payload = token ? verifyEmployeeToken(token) : null;
  if (!isEmployeeSessionPayload(payload)) redirect('/employee/login?reason=expired');
  const locale = normalizeLocale(searchParams?.locale || payload.locale);
  return (
    <Suspense fallback={<AppLoading variant="panel" />}>
      <EmployeePdiClient locale={locale} />
    </Suspense>
  );
}
