'use client';

import Home from '../../page';
import { useParams } from 'next/navigation';

export default function CompanyTokenEntryPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  return <Home companyToken={token || ''} />;
}

