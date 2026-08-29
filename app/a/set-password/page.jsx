'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import LanguageSelect from '../../_components/LanguageSelect';
import { BrandMark } from '../../_components/BrandMark';
import { AppLoading } from '../../_components/AppLoading';
import { FormField } from '../../_components/FormField';
import { InlineCallout } from '../../_components/InlineCallout';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import TurnstileField from '../../_components/TurnstileField';

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
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');

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
        /* Turnstile opcional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (turnstileRequired && !turnstileToken) {
      setError(t(locale, 'errors.TURNSTILE_FAILED'));
      setTurnstileError(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          turnstileToken: turnstileToken || undefined,
        }),
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
    <PublicNarrowShell variant="form" locale={locale} maxWidthClass="max-w-md" className="min-h-screen py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <BrandMark size={32} withWordmark />
        <LanguageSelect locale={locale} onChange={setLocale} compact />
      </div>
      <h1 className={S.pageTitle}>{t(locale, 'setPassword.title')}</h1>

      {checking ? (
        <div className="mt-6">
          <AppLoading locale={locale} variant="panel" />
        </div>
      ) : tokenError ? (
        <div className="mt-6 flex flex-col gap-3">
          <InlineCallout tone="danger" role="alert">
            {errorMessage(locale, tokenError, t(locale, 'setPassword.invalidLink'))}
          </InlineCallout>
          <Link href="/login" className={cn(S.btnBrandSoft, 'min-h-touch justify-center no-underline')}>
            {t(locale, 'setPassword.backToLogin')}
          </Link>
        </div>
      ) : success ? (
        <InlineCallout tone="success" className="mt-6">
          {t(locale, 'setPassword.ok')}
        </InlineCallout>
      ) : (
        <div className="mt-6 flex w-full flex-col gap-3">
          <p className={cn(S.muted, 'm-0')}>
            {t(locale, 'setPassword.intro', { email: emailMasked })}
          </p>
          <FormField htmlFor="set-password-new" label={t(locale, 'setPassword.newPassword')}>
            <input
              id="set-password-new"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(S.input, 'w-full')}
              disabled={loading}
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
              className={cn(S.input, 'w-full')}
              disabled={loading}
            />
          </FormField>
          {turnstileRequired && turnstileSiteKey ? (
            <TurnstileField
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
              onError={() => setTurnstileError(true)}
              errorMessage={turnstileError ? t(locale, 'errors.TURNSTILE_FAILED') : ''}
            />
          ) : null}
          {error ? (
            <InlineCallout tone="danger" role="alert">
              {error}
            </InlineCallout>
          ) : null}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className={cn(S.btnPrimary, 'min-h-touch w-full justify-center', loading && 'opacity-60')}
          >
            {loading ? t(locale, 'common.loading') : t(locale, 'setPassword.submit')}
          </button>
        </div>
      )}
    </PublicNarrowShell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<AppLoading variant="panel" />}>
      <SetPasswordForm />
    </Suspense>
  );
}
