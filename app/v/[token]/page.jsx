import { resolveVacancyLinkByToken } from '../../../lib/public-vacancy-link';
import VacancyTokenClient from './VacancyTokenClient';

export default async function VacancyTokenEntryPage({ params }) {
  const raw = params?.token;
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  const initial = await resolveVacancyLinkByToken(token);
  return <VacancyTokenClient token={token} initial={initial} />;
}
