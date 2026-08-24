'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { sanitizeLoginRedirect } from '../../lib/sanitize-login-redirect';
import { errorMessage, t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { cn } from '../../lib/cn';
import LanguageSelect from '../_components/LanguageSelect';
import { BrandMark } from '../_components/BrandMark';

const inputClass =
  'mb-4 box-border w-full rounded-control border border-ink/12 bg-ink/[0.04] px-[18px] py-3.5 font-display text-[15px] text-ink';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
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
      const data = await res.json();
      if (res.ok) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
      <div className="relative z-[1] w-full max-w-[420px] rounded-[20px] border border-ink/12 bg-white px-12 py-11 shadow-card backdrop-blur-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandMark size={36} withWordmark />
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <p className="mb-3 mt-0 block font-mono text-[10px] uppercase tracking-[3px] text-ink-label">
          {t(locale, 'login.restricted')}
        </p>
        <h2 className="mb-3 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-[32px] font-normal leading-tight text-transparent">
          {(mustChangePassword ? t(locale, 'login.changePasswordTitle') : t(locale, 'login.title')).split('\n').map((line, i) => (
            <span key={line}>{i > 0 ? <br /> : null}{line}</span>
          ))}
        </h2>
        {!mustChangePassword ? (
          <p className="mb-7 text-sm italic leading-[1.7] text-ink-muted">
            {t(locale, 'login.intro')}
          </p>
        ) : null}
        {mustChangePassword ? (
          <>
            <label htmlFor="login-current-password" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'login.changePasswordCurrent')}
            </label>
            <input
              id="login-current-password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <label htmlFor="login-new-password" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'login.changePasswordNew')}
            </label>
            <input
              id="login-new-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <label htmlFor="login-confirm-password" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'login.changePasswordConfirm')}
            </label>
            <input
              id="login-confirm-password"
              type="password"
              autoComplete="new-password"
              className={cn(inputClass, error && 'border-danger')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && changePassword()}
            />
          </>
        ) : (
          <>
            <label htmlFor="login-email" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'login.email')}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className={inputClass}
              value={email}
              placeholder={t(locale, 'login.emailPlaceholder')}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
            />
            <label htmlFor="login-password" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'login.password')}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className={cn(inputClass, error && 'border-danger')}
              value={password}
              placeholder={t(locale, 'login.passwordPlaceholder')}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
            />
          </>
        )}
        {error ? (
          <p className="-mt-2 mb-4 text-xs text-danger">{error}</p>
        ) : null}
        {success ? (
          <p className="-mt-2 mb-4 text-xs text-success">{success}</p>
        ) : null}
        <button
          type="button"
          className={cn(
            'mb-4 cursor-pointer rounded-control border-none bg-gradient-to-br from-brand-500 to-brand-800 px-8 py-3.5 font-display text-sm text-white',
            loading && 'opacity-60'
          )}
          onClick={mustChangePassword ? changePassword : login}
          disabled={loading}
        >
          {loading
            ? t(locale, 'login.entering')
            : mustChangePassword
              ? t(locale, 'login.changePasswordSubmit')
              : t(locale, 'login.enter')}
        </button>
        <br />
        <button
          type="button"
          onClick={() => router.push('/')}
          className="cursor-pointer border-none bg-transparent font-display text-xs text-ink-muted"
        >
          {t(locale, 'login.backToTest')}
        </button>
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
