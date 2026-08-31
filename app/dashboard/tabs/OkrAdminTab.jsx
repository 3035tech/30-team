'use client';

import { OkrBlock } from '../../_components/OkrBlock';

export function OkrAdminTab({ locale = 'pt-BR', companyId }) {
  return <OkrBlock locale={locale} companyId={companyId} />;
}
