'use client';
import { useState } from 'react';
import { AppFeedbackProvider } from '../../../../app/_components/AppFeedback';
import { PdiAdminTab } from '../../../../app/dashboard/tabs/PdiAdminTab';
import { WhistleblowingAdminTab } from '../../../../app/dashboard/tabs/WhistleblowingAdminTab';
import { VacancyInvitesBlock } from '../../../../app/dashboard/vacancies/VacancyInvitesBlock';
import { PipelineTemplatesManager } from '../../../../app/dashboard/vacancies/PipelineTemplatesManager';
export default function ListsFixture() {
  const [navigation, setNavigation] = useState(null);
  return <AppFeedbackProvider locale="pt-BR"><main className="min-w-0 p-4">
    <PdiAdminTab companyId="1" navigateDashboard={setNavigation} />
    <output data-testid="navigation">{JSON.stringify(navigation)}</output>
    <section data-testid="invites" className="mt-8"><VacancyInvitesBlock vacancyId="1" locale="pt-BR" /></section>
    <section data-testid="templates" className="mt-8"><PipelineTemplatesManager locale="pt-BR" companyId="1" templates={[{id: 1, name: 'Seleção padrão', stageCount: 3, vacancyCount: 2, isDefault: true}]} onChanged={() => {}} /></section>
    <WhistleblowingAdminTab companyId="1" />
  </main></AppFeedbackProvider>;
}
