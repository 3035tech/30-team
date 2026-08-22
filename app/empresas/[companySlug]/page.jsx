import { permanentRedirect } from 'next/navigation';
import { PUBLIC_COMPANY_PATH_PREFIX } from '../../../lib/public-job-url';

/** Legado pt-BR `/empresas/{slug}` → canônica neutra `/c/{slug}`. */
export default function LegacyEmpresasRedirect({ params }) {
  const slug = String(params?.companySlug || '').trim();
  if (!slug) permanentRedirect(PUBLIC_COMPANY_PATH_PREFIX);
  permanentRedirect(`${PUBLIC_COMPANY_PATH_PREFIX}/${encodeURIComponent(slug)}`);
}
