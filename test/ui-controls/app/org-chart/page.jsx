'use client';
import { OrgChartBlock } from '../../../../app/_components/OrgChartBlock';
import { AppFeedbackProvider } from '../../../../app/_components/AppFeedback';
export default function OrgFixture() {
  return <AppFeedbackProvider locale="pt-BR"><main className="p-4"><OrgChartBlock companyId="1" /></main></AppFeedbackProvider>;
}
