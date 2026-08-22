import { permanentRedirect } from 'next/navigation';
import { PUBLIC_JOB_PATH_PREFIX } from '../../lib/public-job-url';

/** Legado `/vagas` → canônica `/j` (308). */
export default function LegacyVagasIndexRedirect() {
  permanentRedirect(PUBLIC_JOB_PATH_PREFIX);
}
