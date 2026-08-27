import { t } from '../../../lib/i18n';
import { unsubscribeJobAlert } from '../../../lib/job-alerts';
import { brandMarkSrc } from '../../../lib/brand';
import Link from 'next/link';

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Cancelamento de alerta de vagas — path neutro `/a/unsubscribe?token=…`
 * (não usar URL em português).
 */
export default async function JobAlertUnsubscribePage({ searchParams }) {
  const locale = 'pt-BR';
  const token = String(searchParams?.token || '').trim();
  let kind = 'invalid';
  if (token) {
    const result = await unsubscribeJobAlert(token);
    if (!result.ok) kind = 'invalid';
    else if (result.updated) kind = 'ok';
    else kind = 'already';
  }

  const title = t(locale, 'publicVacancy.alertUnsubTitle');
  const message =
    kind === 'ok'
      ? t(locale, 'publicVacancy.alertUnsubOk')
      : kind === 'already'
        ? t(locale, 'publicVacancy.alertUnsubAlready')
        : t(locale, 'publicVacancy.alertUnsubInvalid');

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas font-display text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-radial-glow" />
      <div className="relative mx-auto max-w-[520px] px-5 py-12">
        <img src={brandMarkSrc(64)} alt="" width={40} height={40} className="mb-4" />
        <h1 className="m-0 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-[clamp(24px,4vw,32px)] font-normal text-transparent">
          {title}
        </h1>
        <div className="mt-5 rounded-card border border-ink/12 bg-white px-6 py-[22px]">
          <p className="m-0 leading-relaxed text-ink-muted">{message}</p>
          <p className="mb-0 mt-4">
            <Link href="/jobs" className="text-brand-500">
              {t(locale, 'publicVacancy.browseOpenCta')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
