import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { EmployeeLmsCertificateClient } from './EmployeeLmsCertificateClient';
import { AppLoading } from '../../../_components/AppLoading';
import { EMPLOYEE_COOKIE_NAME } from '../../../../lib/employee-auth-constants.js';
import { isEmployeeSessionPayload, verifyEmployeeToken } from '../../../../lib/employee-auth.js';

export const dynamic = 'force-dynamic';

export default function EmployeeLmsCertificatePage({ searchParams }) {
  const jar = cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  const payload = token ? verifyEmployeeToken(token) : null;
  if (!isEmployeeSessionPayload(payload)) {
    redirect('/employee/login?reason=expired');
  }
  const locale =
    searchParams?.locale === 'en' || payload.locale === 'en' ? 'en' : 'pt-BR';
  return (
    <Suspense fallback={<AppLoading variant="panel" />}>
      <EmployeeLmsCertificateClient locale={locale} />
    </Suspense>
  );
}
