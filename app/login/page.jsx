'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { sanitizeLoginRedirect } from '../../lib/sanitize-login-redirect';
import { errorMessage, t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import LanguageSelect from '../_components/LanguageSelect';
import { BrandMark } from '../_components/BrandMark';
import { FormField } from '../_components/FormField';
import TurnstileField from '../_components/TurnstileField';

function LoginForm() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeLoginRedirect(searchParams.get('redirect'));
  const [locale, setLocale] = useLocale();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/captcha-config');
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setTurnstileRequired(Boolean(data.required));
        setTurnstileSiteKey(String(data.siteKey || '').trim());
      } catch {
        /* Turnstile opcional — login segue sem CAPTCHA */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async () => {
    if (!email || !password) return;
    setLoading(true); setError(''); setSuccess('');
    setTurnstileError(false);
    if (turnstileRequired && !turnstileToken) {
      setError(t(locale, 'errors.TURNSTILE_FAILED'));
      setTurnstileError(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken: turnstileToken || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requires2fa && data.challengeToken) {
          setRequires2fa(true);
          setChallengeToken(data.challengeToken);
          setTwoFaCode('');
          return;
        }
        if (data.mustChangePassword) {
          setCurrentPassword(password);
          setMustChangePassword(true);
        } else {
          router.push(redirect);
        }
      } else {
        setError(data.errorCode ? errorMessage(locale, data.errorCode, data.error) : data.error || t(locale, 'login.wrongPassword'));
      }
    } catch {
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const verify2fa = async () => {
    if (!twoFaCode.trim() || !challengeToken) return;
    setLoading(true);
    setError('');
    setTurnstileError(false);
    if (turnstileRequired && !turnstileToken) {
      setError(t(locale, 'errors.TURNSTILE_FAILED'));
      setTurnstileError(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          code: twoFaCode.trim(),
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.mustChangePassword) {
          setRequires2fa(false);
          setCurrentPassword(password);
          setMustChangePassword(true);
        } else {
          router.push(redirect);
        }
      } else {
        setError(data.errorCode ? errorMessage(locale, data.errorCode, data.error) : data.error || t(locale, 'login.connectionError'));
      }
    } catch {
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    if (!email) {
      setError(errorMessage(locale, 'EMAIL_REQUIRED'));
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setTurnstileError(false);
    if (turnstileRequired && !turnstileToken) {
      setError(t(locale, 'errors.TURNSTILE_FAILED'));
      setTurnstileError(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale, turnstileToken: turnstileToken || undefined }),
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
      setSuccess(t(locale, 'login.forgotOk'));
    } catch {
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setError(t(locale, 'login.changePasswordMismatch'));
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.errorCode ? errorMessage(locale, data.errorCode, data.error) : data.error || t(locale, 'login.connectionError'));
        return;
      }
      setSuccess(t(locale, 'login.changePasswordOk'));
      setTimeout(() => router.push(redirect), 500);
    } catch {
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const titleKey = mustChangePassword
    ? 'login.changePasswordTitle'
    : requires2fa
      ? 'login.twoFaTitle'
      : mode === 'forgot'
        ? 'login.forgotTitle'
        : 'login.title';

  const primaryAction = mustChangePassword
    ? changePassword
    : requires2fa
      ? verify2fa
      : mode === 'forgot'
        ? requestReset
        : login;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 font-ui text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
      <div className="relative z-[1] w-full max-w-[420px] rounded-[20px] border border-ink/12 bg-surface px-8 py-10 shadow-card sm:px-12 sm:py-11">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandMark size={36} withWordmark />
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <p className="mb-3 mt-0 block font-mono text-2xs uppercase tracking-[3px] text-ink-label">
          {t(locale, 'login.restricted')}
        </p>
        <h2 className="mb-3 font-display text-3xl font-normal leading-tight text-brand-600 sm:text-4xl">
          {t(locale, titleKey).split('\n').map((line, i) => (
            <span key={line}>{i > 0 ? <br /> : null}{line}</span>
          ))}
        </h2>
        {!mustChangePassword && !requires2fa ? (
          <p className={cn(S.muted, 'mb-7')}>
            {t(locale, mode === 'forgot' ? 'login.forgotIntro' : 'login.intro')}
          </p>
        ) : null}
        {requires2fa ? (
          <p className={cn(S.muted, 'mb-7')}>{t(locale, 'login.twoFaIntro')}</p>
        ) : null}

        <div className="mb-4 flex w-full flex-col gap-3">
          {mustChangePassword ? (
            <>
              <FormField htmlFor="login-current-password" label={t(locale, 'login.changePasswordCurrent')}>
                <input
                  id="login-current-password"
                  type="password"
                  autoComplete="current-password"
                  className={S.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </FormField>
              <FormField htmlFor="login-new-password" label={t(locale, 'login.changePasswordNew')}>
                <input
                  id="login-new-password"
                  type="password"
                  autoComplete="new-password"
                  className={S.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormField>
              <FormField htmlFor="login-confirm-password" label={t(locale, 'login.changePasswordConfirm')}>
                <input
                  id="login-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  className={cn(S.input, error && 'border-danger')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && changePassword()}
                />
              </FormField>
            </>
          ) : requires2fa ? (
            <FormField htmlFor="login-2fa-code" label={t(locale, 'login.twoFaCode')}>
              <input
                id="login-2fa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={cn(S.input, error && 'border-danger')}
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && verify2fa()}
                maxLength={6}
              />
            </FormField>
          ) : mode === 'forgot' ? (
            <FormField htmlFor="login-email" label={t(locale, 'login.email')}>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                className={S.input}
                value={email}
                placeholder={t(locale, 'login.emailPlaceholder')}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && requestReset()}
              />
            </FormField>
          ) : (
            <>
              <FormField htmlFor="login-email" label={t(locale, 'login.email')}>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  className={S.input}
                  value={email}
                  placeholder={t(locale, 'login.emailPlaceholder')}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && login()}
                />
              </FormField>
              <FormField htmlFor="login-password" label={t(locale, 'login.password')}>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className={cn(S.input, error && 'border-danger')}
                  value={password}
                  placeholder={t(locale, 'login.passwordPlaceholder')}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && login()}
                />
              </FormField>
            </>
          )}
          {error ? (
            <p className="m-0 text-prose text-danger">{error}</p>
          ) : null}
          {success ? (
            <p className="m-0 text-prose text-success">{success}</p>
          ) : null}
        </div>

        {turnstileRequired && turnstileSiteKey && !mustChangePassword ? (
          <div className="mb-4 w-full">
            <TurnstileField
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
              onError={() => setTurnstileError(true)}
              errorMessage={turnstileError ? t(locale, 'errors.TURNSTILE_FAILED') : ''}
            />
          </div>
        ) : null}

        <button
          type="button"
          className={cn(S.btnPrimary, 'mb-4 min-h-touch w-full justify-center', loading && 'opacity-60')}
          onClick={primaryAction}
          disabled={loading}
        >
          {loading
            ? (requires2fa
              ? t(locale, 'login.twoFaVerifying')
              : mode === 'forgot'
                ? t(locale, 'login.forgotSending')
                : t(locale, 'login.entering'))
            : mustChangePassword
              ? t(locale, 'login.changePasswordSubmit')
              : requires2fa
                ? t(locale, 'login.twoFaSubmit')
                : mode === 'forgot'
                  ? t(locale, 'login.forgotSubmit')
                  : t(locale, 'login.enter')}
        </button>

        <div className="flex w-full flex-col gap-2 text-left">
          {requires2fa ? (
            <button
              type="button"
              onClick={() => {
                setRequires2fa(false);
                setChallengeToken('');
                setTwoFaCode('');
                setError('');
              }}
              className="cursor-pointer border-none bg-transparent p-0 text-left font-ui text-prose text-ink-muted"
            >
              {t(locale, 'login.forgotBack')}
            </button>
          ) : null}
          {!mustChangePassword && !requires2fa && mode === 'login' ? (
            <>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                className="cursor-pointer border-none bg-transparent p-0 text-left font-ui text-prose text-brand-600"
              >
                {t(locale, 'login.forgotPassword')}
              </button>
              <a
                href="/employee/login"
                className="font-ui text-prose text-ink-muted underline-offset-2 hover:text-brand-600 hover:underline"
              >
                {t(locale, 'login.employeeLogin')}
              </a>
            </>
          ) : null}
          {!mustChangePassword && !requires2fa && mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="cursor-pointer border-none bg-transparent p-0 text-left font-ui text-prose text-ink-muted"
            >
              {t(locale, 'login.forgotBack')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="cursor-pointer border-none bg-transparent p-0 text-left font-ui text-prose text-ink-muted"
          >
            {t(locale, 'login.backToTest')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
