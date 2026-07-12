'use client';

import { useRouter } from 'next/navigation';
import { t } from '../lib/i18n';
import { useLocale } from '../lib/useLocale';
import { C, FONTS, RADIAL_GLOW, GRADIENT, SHADOW } from '../lib/theme';
import LanguageSelect from './_components/LanguageSelect';

export default function HomePage() {
  const router = useRouter();
  const [locale, setLocale] = useLocale();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: FONTS.serif,
        color: C.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: RADIAL_GLOW,
        }}
      />

      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '20px',
          padding: '44px 48px',
          backdropFilter: 'blur(24px)',
          boxShadow: SHADOW.cardElevated,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'rgba(124,58,237,.55)',
              fontFamily: FONTS.mono,
              display: 'block',
            }}
          >
            {t(locale, 'home.brand')}
          </span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>

        <p
          style={{
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(124,58,237,.65)',
            fontFamily: FONTS.mono,
            marginBottom: '10px',
            marginTop: 0,
            lineHeight: 1.5,
          }}
        >
          {t(locale, 'home.audience')}
        </p>

        <h1
          style={{
            fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 'normal',
            lineHeight: 1.15,
            marginBottom: '12px',
            background: GRADIENT.title,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t(locale, 'home.title').split('\n').map((line, i) => (
            <span key={i}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </h1>

        <p style={{ fontSize: '16px', color: C.text, lineHeight: 1.55, margin: '0 0 10px', fontWeight: 'normal' }}>
          {t(locale, 'home.lead')}
        </p>
        <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: '0 0 22px', fontStyle: 'normal' }}>
          {t(locale, 'home.body')}
        </p>

        <div id="como-funciona">
          <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '22px', fontStyle: 'italic' }}>
            {t(locale, 'home.howItWorks')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: GRADIENT.primaryBtn(C.purple, C.purpleDark),
              border: 'none',
              borderRadius: '10px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: FONTS.serif,
            }}
          >
            {t(locale, 'home.managerCta')}
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              background: 'rgba(26,22,37,.03)',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '14px 18px',
              color: C.text,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: FONTS.serif,
            }}
          >
            {t(locale, 'home.howCta')}
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '18px' }}>
          <div style={{ fontSize: '11px', color: C.faint, fontFamily: FONTS.mono, marginBottom: '6px' }}>
            {t(locale, 'home.formAccess')}
          </div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
            - {t(locale, 'home.companyPath')}
            <br />- {t(locale, 'home.vacancyPath')}
          </div>
        </div>
      </div>
    </div>
  );
}
