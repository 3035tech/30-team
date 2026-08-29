'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading } from '../../_components/AppLoading';
import { FormField } from '../../_components/FormField';
import TurnstileField from '../../_components/TurnstileField';

/**
 * Consume magic-link token → set employee cookie (ou desafio 2FA se ativo) → redirect /employee
 */
export default function EmployeeEnterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const locale = params.get('locale') === 'en' ? 'en' : 'pt-BR';

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
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError(t(locale, 'employeeHome.invalidLink'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/employee/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, locale }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'session');
        if (json.requires2fa && json.challengeToken) {
          if (!cancelled) {
            setRequires2fa(true);
            setChallengeToken(json.challengeToken);
          }
          return;
        }
        if (!cancelled) router.replace('/employee');
      } catch {
        if (!cancelled) setError(t(locale, 'employeeHome.invalidLink'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, locale, router]);

  const verify2fa = async () => {
    if (turnstileRequired && !turnstileToken) {
      setError(t(locale, 'errors.TURNSTILE_FAILED'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/employee/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          code: twoFaCode,
          locale,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '2fa');
      router.replace('/employee');
    } catch {
      setError(t(locale, 'employeeHome.loginError'));
    } finally {
      setBusy(false);
    }
  };

  if (error && !requires2fa) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
        <a href="/employee/login" className={cn(S.btnBrandSoft, 'mt-4 inline-flex min-h-touch')}>
          {t(locale, 'employeeHome.backToLogin')}
        </a>
      </div>
    );
  }

  if (requires2fa) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <h1 className="font-display text-2xl text-ink">{t(locale, 'login.twoFaTitle')}</h1>
        <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'login.twoFaIntro')}</p>
        <FormField label={t(locale, 'login.twoFaCode')} className="mt-6">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className={cn(S.input, 'w-full')}
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && verify2fa()}
            maxLength={6}
            disabled={busy}
          />
        </FormField>
        {turnstileRequired && turnstileSiteKey ? (
          <div className="mt-4">
            <TurnstileField
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
              onError={() => setTurnstileError(true)}
              errorMessage={turnstileError ? t(locale, 'errors.TURNSTILE_FAILED') : ''}
            />
          </div>
        ) : null}
        {error ? <p className="mt-3 m-0 text-prose text-danger">{error}</p> : null}
        <button
          type="button"
          disabled={busy || twoFaCode.length !== 6}
          className={cn(S.btnPrimary, 'mt-4 min-h-touch w-full justify-center')}
          onClick={verify2fa}
        >
          {busy ? t(locale, 'login.twoFaVerifying') : t(locale, 'login.twoFaSubmit')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <AppLoading variant="panel" />
    </div>
  );
}
