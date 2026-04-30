'use client';

import { useRouter } from 'next/navigation';
import { C, FONTS, RADIAL_GLOW, GRADIENT, SHADOW } from '../lib/theme';

export default function HomePage() {
  const router = useRouter();

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
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'rgba(124,58,237,.55)',
            fontFamily: FONTS.mono,
            marginBottom: '16px',
            display: 'block',
          }}
        >
          ◈ 30Team
        </span>

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
          Para RH e gestores
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
          Teste de Perfil
          <br />
          30Team
        </h1>

        <p style={{ fontSize: '16px', color: C.text, lineHeight: 1.55, margin: '0 0 10px', fontWeight: 'normal' }}>
          Um retrato objetivo de perfil para alinhar time interno, liderança e contratação — com visão por empresa, área e vaga.
        </p>
        <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: '0 0 22px', fontStyle: 'normal' }}>
          Adequado a RH e liderança que precisam de visão agregada por empresa e vaga — para apoiar decisões combinando dados e conversa, com rastreio passível de auditoria.
        </p>

        <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '22px', fontStyle: 'italic' }}>
          Para iniciar o formulário, você precisa acessar um <b>link com token válido</b> enviado pela empresa (ex.: <code>/t/&lt;token&gt;</code> ou{' '}
          <code>/v/&lt;token&gt;</code>).
        </p>

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
            Sou gestor (dashboard) →
          </button>
          <button
            onClick={() => router.push('/')}
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
            Página inicial
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '18px' }}>
          <div style={{ fontSize: '11px', color: C.faint, fontFamily: FONTS.mono, marginBottom: '6px' }}>Acesso do formulário</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
            - Empresa: <code>/t/&lt;token&gt;</code>
            <br />- Vaga: <code>/v/&lt;token&gt;</code>
          </div>
        </div>
      </div>
    </div>
  );
}
