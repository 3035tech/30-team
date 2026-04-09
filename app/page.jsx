'use client';

import { useRouter } from 'next/navigation';

const C = {
  bg: '#ffffff',
  card: 'rgba(124,58,237,0.06)',
  border: 'rgba(26,22,37,0.12)',
  purple: '#7C3AED',
  purpleLight: '#6D28D9',
  purpleDark: '#4C1D95',
  text: '#1a1625',
  muted: 'rgba(26,22,37,0.62)',
  faint: 'rgba(26,22,37,0.38)',
};

export default function HomePage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: "'Georgia','Times New Roman',serif",
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
          background: `radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.07) 0%,transparent 55%),
                      radial-gradient(ellipse at 85% 75%,rgba(71,168,232,.05) 0%,transparent 55%)`,
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
          boxShadow: '0 20px 50px rgba(124,58,237,.1), 0 4px 24px rgba(0,0,0,.05)',
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
            fontFamily: "'Courier New',monospace",
            marginBottom: '16px',
            display: 'block',
          }}
        >
          ◈ 30Team
        </span>

        <h1
          style={{
            fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 'normal',
            lineHeight: 1.15,
            marginBottom: '12px',
            background: 'linear-gradient(135deg,#E8E0FF 0%,#A78BFA 55%,#7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Teste de Perfil
          <br />
          30Team
        </h1>

        <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '22px', fontStyle: 'italic' }}>
          Para iniciar o formulário, você precisa acessar um <b>link com token válido</b> enviado pela empresa (ex.: <code>/t/&lt;token&gt;</code> ou{' '}
          <code>/v/&lt;token&gt;</code>).
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: `linear-gradient(135deg,${C.purple} 0%,${C.purpleDark} 100%)`,
              border: 'none',
              borderRadius: '10px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: "'Georgia',serif",
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
              fontFamily: "'Georgia',serif",
            }}
          >
            Página inicial
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '18px' }}>
          <div style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', marginBottom: '6px' }}>Acesso do formulário</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
            - Empresa: <code>/t/&lt;token&gt;</code>
            <br />- Vaga: <code>/v/&lt;token&gt;</code>
          </div>
        </div>
      </div>
    </div>
  );
}
