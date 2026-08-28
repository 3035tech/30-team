'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { AppLoading } from '../../_components/AppLoading';

/**
 * Consume magic-link token → set employee cookie (ou desafio 2FA) → redirect /colaborador
 */
export default function EmployeeEnterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [busy, setBusy] = useState(false);
  const locale = params.get('locale') === 'en' ? 'en' : 'pt-BR';

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
        if (!cancelled) router.replace('/colaborador');
      } catch {
        if (!cancelled) setError(t(locale, 'employeeHome.invalidLink'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, locale, router]);

  const verify2fa = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/employee/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: twoFaCode, locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '2fa');
      router.replace('/colaborador');
    } catch {
      setError(t(locale, 'employeeHome.loginError'));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
        <a href="/colaborador/login" className={cn(S.btnBrandSoft, 'mt-4 inline-flex min-h-touch')}>
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
        <label className="mt-6 block text-xs text-ink-muted">
          {t(locale, 'login.twoFaCode')}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className={cn(S.input, 'mt-1 w-full')}
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && verify2fa()}
            maxLength={6}
            disabled={busy}
          />
        </label>
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
