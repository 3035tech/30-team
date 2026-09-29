'use client';
import { useState } from 'react';
import { AppFeedbackProvider } from '../../../../app/_components/AppFeedback';
import { EmployeeNavProvider } from '../../../../app/_components/EmployeeNavContext';
import { EmployeeHomeClient } from '../../../../app/employee/EmployeeHomeClient';
import { EmployeeProfileClient } from '../../../../app/employee/profile/EmployeeProfileClient';
import { EmployeeTopBar } from '../../../../app/_components/EmployeeTopBar';
import { EmployeePdiClient } from '../../../../app/employee/pdi/EmployeePdiClient';
import { EmployeeDpClient } from '../../../../app/employee/dp/EmployeeDpClient';
import { EmployeeLmsClient } from '../../../../app/employee/lms/EmployeeLmsClient';
import { EmployeeTimeClockClient } from '../../../../app/employee/time-clock/EmployeeTimeClockClient';
export default function EmployeePreview() {
  const [view, setView] = useState('home');
  const views = { home: EmployeeHomeClient, pdi: EmployeePdiClient, dp: EmployeeDpClient, lms: EmployeeLmsClient, point: EmployeeTimeClockClient, profile: EmployeeProfileClient };
  const View = views[view];
  return <AppFeedbackProvider locale="pt-BR"><EmployeeNavProvider>
    <nav aria-label="Preview" className="flex flex-wrap gap-4 p-3 border-b border-ink/12">{Object.keys(views).map(key => <button key={key} onClick={() => setView(key)}>{key}</button>)}</nav>
    {view === 'profile' ? <EmployeeTopBar locale="pt-BR" displayName="Pessoa de teste" companyName="Empresa exemplo" /> : null}
    <View />
  </EmployeeNavProvider></AppFeedbackProvider>;
}
