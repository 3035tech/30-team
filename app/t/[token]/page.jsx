import { resolveCompanyLinkByToken } from '../../../lib/public-company-link';
import CompanyTokenClient from './CompanyTokenClient';

export default async function CompanyTokenEntryPage({ params }) {
  const raw = params?.token;
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  const initial = await resolveCompanyLinkByToken(token);
  return <CompanyTokenClient token={token} initial={initial} />;
}
