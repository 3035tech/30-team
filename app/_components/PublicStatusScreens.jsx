'use client';

import { brandMarkSrc } from '../../lib/brand';
import { t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';

/**
 * Branded loading moment (CSS animation on logo — sharper than a GIF).
 * @param {{ locale?: string, label?: string, fullPage?: boolean }} props
 */
export function BrandPulseLoading({ locale = 'pt-BR', label, fullPage = false }) {
  const text = label || t(locale, 'panel.common.loading');
  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '18px',
    padding: fullPage ? '48px 20px' : '28px 16px',
    minHeight: fullPage ? '50vh' : undefined,
    textAlign: 'center',
  };

  return (
    <div role="status" aria-live="polite" aria-busy="true" style={wrap}>
      <div className="brand-pulse-ring" aria-hidden>
        <img
          src={brandMarkSrc(128)}
          alt=""
          width={72}
          height={72}
          className="brand-pulse-mark"
          style={{ display: 'block' }}
        />
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: FONTS.serif,
          fontSize: '15px',
          color: C.muted,
          maxWidth: '280px',
          lineHeight: 1.45,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * Friendly broken-but-fixing status for public routes (/r, etc.).
 * @param {{
 *   locale?: string,
 *   title?: string,
 *   message?: string,
 *   onRetry?: () => void,
 * }} props
 */
export function PublicFunnyError({ locale = 'pt-BR', title, message, onRetry }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px',
        padding: '32px 20px 48px',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      <img
        src="/brand/status-broken-fixing.png"
        alt=""
        width={220}
        height={220}
        style={{
          width: 'min(220px, 70vw)',
          height: 'auto',
          borderRadius: '16px',
          display: 'block',
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.purple,
          fontFamily: FONTS.mono,
          fontWeight: 600,
        }}
      >
        30Team
      </p>
      <h1
        style={{
          margin: 0,
          fontFamily: FONTS.serif,
          fontSize: 'clamp(22px, 5vw, 28px)',
          color: C.text,
          fontWeight: 600,
          lineHeight: 1.25,
        }}
      >
        {title || t(locale, 'panel.report.funnyErrorTitle')}
      </h1>
      <p style={{ margin: 0, fontSize: '14px', color: C.muted, lineHeight: 1.55 }}>
        {message || t(locale, 'panel.report.funnyErrorBody')}
      </p>
      {typeof onRetry === 'function' ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '8px',
            minHeight: '40px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: `1px solid ${C.purple}55`,
            background: `${C.purple}14`,
            color: C.purple,
            fontFamily: FONTS.mono,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {t(locale, 'panel.report.funnyErrorRetry')}
        </button>
      ) : null}
    </div>
  );
}
