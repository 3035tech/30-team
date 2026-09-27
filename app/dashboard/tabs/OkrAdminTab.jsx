'use client';

import { OkrHierarchyBlock } from '../../_components/OkrHierarchyBlock';

export function OkrAdminTab({ locale = 'pt-BR', companyId }) {
  return <OkrHierarchyBlock locale={locale} companyId={companyId} />;
}
