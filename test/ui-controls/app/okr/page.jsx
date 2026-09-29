'use client';
import {useState} from 'react';
import {AppFeedbackProvider} from '../../../../app/_components/AppFeedback';
import {OkrHierarchyBlock} from '../../../../app/_components/OkrHierarchyBlock';
export default function OkrFixture() {
  const [company, setCompany] = useState('1');
  return <AppFeedbackProvider locale="pt-BR"><main className="p-4"><button onClick={() => setCompany('2')}>Empresa 2</button><OkrHierarchyBlock locale="pt-PT" companyId={company} /></main></AppFeedbackProvider>;
}
