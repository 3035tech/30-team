import { t } from '../../../lib/i18n';
import { unsubscribeJobAlert } from '../../../lib/job-alerts';
import { C, FONTS, GRADIENT, RADIAL_GLOW } from '../../../lib/theme';
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
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: FONTS.serif,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: RADIAL_GLOW,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: '520px',
          margin: '0 auto',
          padding: '48px 20px',
        }}
      >
        <img src={brandMarkSrc(64)} alt="" width={40} height={40} style={{ marginBottom: '16px' }} />
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 'normal',
            background: GRADIENT.title,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            marginTop: '20px',
            padding: '22px 24px',
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            background: C.card,
          }}
        >
          <p style={{ margin: 0, color: C.muted, lineHeight: 1.6 }}>{message}</p>
          <p style={{ margin: '16px 0 0' }}>
            <Link href="/j" style={{ color: C.purple }}>
              {t(locale, 'publicVacancy.browseOpenCta')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
