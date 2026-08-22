import { permanentRedirect } from 'next/navigation';
import { PUBLIC_JOB_PATH_PREFIX } from '../../lib/public-job-url';

/** Legado `/empresas` (sem slug) → índice de vagas; empresa individual é `/c/{slug}`. */
export default function LegacyEmpresasIndexRedirect() {
  permanentRedirect(PUBLIC_JOB_PATH_PREFIX);
}
