'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';
import { cn } from '../../../lib/cn';
import LanguageSelect from '../../_components/LanguageSelect';
import { BrandMark } from '../../_components/BrandMark';
import { FormField } from '../../_components/FormField';

const inputClass =
  'box-border w-full rounded-xl border border-ink/12 bg-ink/[0.04] px-3.5 py-3 font-display text-base text-ink';

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 font-display text-ink">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
      <div className="relative z-[1] w-full max-w-[420px] rounded-[20px] border border-ink/12 bg-white px-12 py-11 shadow-card backdrop-blur-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandMark size={36} withWordmark />
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1 className="mb-3 mt-0 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-3xl font-normal leading-tight text-transparent">
          {t(locale, 'setPassword.title')}
        </h1>

        {checking ? (
          <p className="text-sm text-ink-muted">{t(locale, 'common.loading')}</p>
        ) : tokenError ? (
          <>
            <p className="text-sm leading-relaxed text-danger">
              {errorMessage(locale, tokenError, t(locale, 'setPassword.invalidLink'))}
            </p>
            <Link href="/login" className="text-sm text-brand-500">
              {t(locale, 'setPassword.backToLogin')}
            </Link>
          </>
        ) : success ? (
          <p className="text-sm text-success">{t(locale, 'setPassword.ok')}</p>
        ) : (
          <>
            <p className="mb-5 text-sm leading-[1.65] text-ink-muted">
              {t(locale, 'setPassword.intro', { email: emailMasked })}
            </p>
            <div className="flex flex-col gap-3">
              <FormField htmlFor="set-password-new" label={t(locale, 'setPassword.newPassword')}>
                <input
                  id="set-password-new"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField htmlFor="set-password-confirm" label={t(locale, 'setPassword.confirmPassword')}>
                <input
                  id="set-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit();
                  }}
                  className={inputClass}
                />
              </FormField>
              {error ? (
                <p className="m-0 text-prose text-danger">{error}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loading}
                className={cn(
                  'min-h-[44px] w-full rounded-xl border-none bg-brand-500 text-base font-semibold text-white',
                  loading ? 'cursor-default opacity-70' : 'cursor-pointer'
                )}
              >
                {loading ? t(locale, 'common.loading') : t(locale, 'setPassword.submit')}
              </button>
            </div>
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
