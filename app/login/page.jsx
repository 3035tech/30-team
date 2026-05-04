'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { sanitizeLoginRedirect } from '../../lib/sanitize-login-redirect';
import { errorMessage, t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { C, FONTS, RADIAL_GLOW_SINGLE, GRADIENT, SHADOW } from '../../lib/theme';
import LanguageSelect from '../_components/LanguageSelect';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeLoginRedirect(searchParams.get('redirect'));
  const [locale, setLocale] = useLocale();

  const login = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push(redirect);
      } else {
        const data = await res.json();
        setError(data.errorCode ? errorMessage(locale, data.errorCode, data.error) : data.error || t(locale, 'login.wrongPassword'));
      }
    } catch {
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg,
      fontFamily:FONTS.serif, color:C.text,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none',
        background:RADIAL_GLOW_SINGLE }}/>
      <div style={{ maxWidth:'420px', width:'100%', background:C.card,
        border:`1px solid ${C.border}`, borderRadius:'20px', padding:'44px 48px',
        backdropFilter:'blur(24px)', position:'relative', zIndex:1,
        boxShadow:SHADOW.cardElevated }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
          <span style={{ fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase',
            color:'rgba(124,58,237,.55)', fontFamily:FONTS.mono,
            display:'block' }}>{t(locale, 'login.restricted')}</span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h2 style={{ fontSize:'32px', fontWeight:'normal', lineHeight:1.2, marginBottom:'12px',
          background:GRADIENT.titleLogin,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          {t(locale, 'login.title').split('\n').map((line, i) => (
            <span key={line}>{i > 0 ? <br /> : null}{line}</span>
          ))}
        </h2>
        <p style={{ fontSize:'14px', color:C.muted, lineHeight:1.7, marginBottom:'28px', fontStyle:'italic' }}>
          {t(locale, 'login.intro')}
        </p>
        <label style={{ fontSize:'12px', color:C.muted, display:'block', marginBottom:'8px' }}>
          {t(locale, 'login.email')}
        </label>
        <input type="email"
          style={{ width:'100%', background:'rgba(26,22,37,.04)',
            border:`1px solid ${C.border}`, borderRadius:'10px',
            padding:'14px 18px', color:C.text, fontSize:'15px',
            fontFamily:FONTS.serif, boxSizing:'border-box', marginBottom:'16px' }}
          value={email} placeholder="voce@empresa.com"
          onChange={e=>setEmail(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&login()}/>
        <label style={{ fontSize:'12px', color:C.muted, display:'block', marginBottom:'8px' }}>
          {t(locale, 'login.password')}
        </label>
        <input type="password"
          style={{ width:'100%', background:'rgba(26,22,37,.04)',
            border:`1px solid ${error?C.tension:C.border}`, borderRadius:'10px',
            padding:'14px 18px', color:C.text, fontSize:'15px',
            fontFamily:FONTS.serif, boxSizing:'border-box', marginBottom:'16px' }}
          value={password} placeholder="••••••••"
          onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&login()}/>
        {error&&(
          <p style={{ color:C.tension, fontSize:'12px', marginTop:'-8px', marginBottom:'16px' }}>{error}</p>
        )}
        <button
          style={{ background:GRADIENT.primaryBtn(C.purple,'#4C1D95'), border:'none',
            borderRadius:'10px', padding:'14px 32px', color:'#fff', fontSize:'14px',
            cursor:'pointer', fontFamily:FONTS.serif, opacity:loading?.6:1, marginBottom:'16px' }}
          onClick={login} disabled={loading}>
          {loading ? t(locale, 'login.entering') : t(locale, 'login.enter')}
        </button>
        <br/>
        <button onClick={()=>router.push('/')}
          style={{ background:'none', border:'none', color:C.muted,
            fontSize:'12px', cursor:'pointer', fontFamily:FONTS.serif }}>
          {t(locale, 'login.backToTest')}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm/>
    </Suspense>
  );
}
