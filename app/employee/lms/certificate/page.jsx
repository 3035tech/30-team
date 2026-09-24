import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { EmployeeLmsCertificateClient } from './EmployeeLmsCertificateClient';
import { AppLoading } from '../../../_components/AppLoading';
import { EMPLOYEE_COOKIE_NAME } from '../../../../lib/employee-auth-constants.js';
import { isEmployeeSessionPayload, verifyEmployeeToken } from '../../../../lib/employee-auth.js';
import { normalizeLocale } from '../../../../lib/i18n.js';

export const dynamic = 'force-dynamic';

export default async function EmployeeLmsCertificatePage(props) {
  const searchParams = await props.searchParams;
  const jar = await cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  const payload = token ? verifyEmployeeToken(token) : null;
  if (!isEmployeeSessionPayload(payload)) {
    redirect('/employee/login?reason=expired');
  }
  const locale = normalizeLocale(searchParams?.locale || payload.locale);
  return (
    <Suspense fallback={<AppLoading variant="panel" />}>
      <EmployeeLmsCertificateClient locale={locale} />
    </Suspense>
  );
}
