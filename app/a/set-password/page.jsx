'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';
import { C, FONTS, RADIAL_GLOW_SINGLE, GRADIENT, SHADOW } from '../../../lib/theme';
import LanguageSelect from '../../_components/LanguageSelect';
import { BrandMark } from '../../_components/BrandMark';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const token = String(searchParams.get('token') || '').trim();
  const router = useRouter();
  const [locale, setLocale] = useLocale();
  const [emailMasked, setEmailMasked] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        if (!cancelled) {
          setTokenError('INVALID_TOKEN');
          setChecking(false);
        }
        return;
      }
      setChecking(true);
      setTokenError('');
      try {
        const res = await fetch(`/api/public/set-password?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setTokenError(data.errorCode || 'INVALID_TOKEN');
          return;
        }
        if (!cancelled) setEmailMasked(data.email || '');
      } catch {
        if (!cancelled) setTokenError('INTERNAL');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async () => {
    if (!password || password.length < 8) {
      setError(t(locale, 'errors.PASSWORD_TOO_SHORT'));
      return;
    }
    if (password !== confirm) {
      setError(t(locale, 'login.changePasswordMismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.errorCode
            ? errorMessage(locale, data.errorCode, data.error)
            : data.error || t(locale, 'login.connectionError')
        );
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(26,22,37,.04)',
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '12px 14px',
    color: C.text,
    fontSize: '15px',
    fontFamily: FONTS.serif,
    boxSizing: 'border-box',
    marginBottom: '14px',
  };

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
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: RADIAL_GLOW_SINGLE,
        }}
      />
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '20px',
          padding: '44px 48px',
          backdropFilter: 'blur(24px)',
          position: 'relative',
          zIndex: 1,
          boxShadow: SHADOW.cardElevated,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <BrandMark size={36} withWordmark />
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'normal',
            lineHeight: 1.2,
            margin: '0 0 12px',
            background: GRADIENT.titleLogin,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t(locale, 'setPassword.title')}
        </h1>

        {checking ? (
          <p style={{ color: C.muted, fontSize: '14px' }}>{t(locale, 'common.loading')}</p>
        ) : tokenError ? (
          <>
            <p style={{ color: C.tension, fontSize: '14px', lineHeight: 1.6 }}>
              {errorMessage(locale, tokenError, t(locale, 'setPassword.invalidLink'))}
            </p>
            <Link href="/login" style={{ color: C.purple, fontSize: '14px' }}>
              {t(locale, 'setPassword.backToLogin')}
            </Link>
          </>
        ) : success ? (
          <p style={{ color: C.synergy, fontSize: '14px' }}>{t(locale, 'setPassword.ok')}</p>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.65, marginBottom: '20px' }}>
              {t(locale, 'setPassword.intro', { email: emailMasked })}
            </p>
            <label
              htmlFor="set-password-new"
              style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}
            >
              {t(locale, 'setPassword.newPassword')}
            </label>
            <input
              id="set-password-new"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <label
              htmlFor="set-password-confirm"
              style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}
            >
              {t(locale, 'setPassword.confirmPassword')}
            </label>
            <input
              id="set-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
              style={inputStyle}
            />
            {error ? (
              <p style={{ color: C.tension, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              style={{
                width: '100%',
                minHeight: '44px',
                border: 'none',
                borderRadius: '12px',
                background: C.purple,
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t(locale, 'common.loading') : t(locale, 'setPassword.submit')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
