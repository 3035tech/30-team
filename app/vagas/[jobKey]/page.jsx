import { permanentRedirect } from 'next/navigation';
import { PUBLIC_JOB_PATH_PREFIX } from '../../../lib/public-job-url';

/**
 * Legado `/vagas/{slug}-{id}` → canônica `/j/{slug}-{id}` (308).
 * Mantém bookmarks e indexações antigas.
 */
export default function LegacyVagasJobRedirect({ params }) {
  const jobKey = typeof params?.jobKey === 'string' ? params.jobKey : '';
  if (!jobKey) permanentRedirect(PUBLIC_JOB_PATH_PREFIX);
  permanentRedirect(`${PUBLIC_JOB_PATH_PREFIX}/${encodeURIComponent(jobKey)}`);
}
