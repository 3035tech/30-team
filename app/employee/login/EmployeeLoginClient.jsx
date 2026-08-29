'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { BrandMark } from '../../_components/BrandMark';
import { FormField } from '../../_components/FormField';

/**
 * Collaborator login — password primary (invite = set-password email).
 * Optional: forgot password · magic link for those who prefer.
 */
export function EmployeeLoginClient({ locale = 'pt-BR' }) {
  const router = useRouter();
  const { toast } = useAppFeedback();
  const [mode, setMode] = useState('login'); // login | forgot | magic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [companies, setCompanies] = useState(null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');

  const verify2fa = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/employee/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: twoFaCode, locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || t(locale, 'login.twoFaVerifying'));
      setRequires2fa(false);
      setChallengeToken('');
      router.replace('/employee');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.loginError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const login = async (companyId = null) => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          locale,
          ...(companyId ? { companyId } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.ambiguous && Array.isArray(json.companies)) {
        setCompanies(json.companies);
        toast(t(locale, 'employeeHome.pickCompany'), 'info');
        return;
      }
      if (!res.ok) throw new Error(json?.error || t(locale, 'employeeHome.loginError'));
      if (json.requires2fa && json.challengeToken) {
        setRequires2fa(true);
        setChallengeToken(json.challengeToken);
        setCompanies(null);
        return;
      }
      setCompanies(null);
      router.replace('/employee');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.loginError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendForgot = async (companyId = null) => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/employee/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          ...(companyId ? { companyId } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'send');
      if (json.ambiguous && Array.isArray(json.companies)) {
        setCompanies(json.companies);
        toast(t(locale, 'employeeHome.pickCompany'), 'info');
        return;
      }
      setCompanies(null);
      setSent(true);
      toast(t(locale, 'employeeHome.forgotSent'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.linkError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = async (companyId = null) => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/employee/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          ...(companyId ? { companyId } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'send');
      if (json.ambiguous && Array.isArray(json.companies)) {
        setCompanies(json.companies);
        toast(t(locale, 'employeeHome.pickCompany'), 'info');
        return;
      }
      setCompanies(null);
      setSent(true);
      toast(t(locale, 'employeeHome.linkSent'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.linkError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onCompanyPick = (companyId) => {
    if (mode === 'login') void login(companyId);
    else if (mode === 'forgot') void sendForgot(companyId);
    else void sendMagic(companyId);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <BrandMark size={36} withWordmark />
        <h1 className={cn(S.pageTitle, 'mt-4')}>{t(locale, 'employeeHome.loginTitle')}</h1>
        <p className={cn(S.muted, 'mt-2')}>
          {requires2fa
            ? t(locale, 'login.twoFaIntro')
            : mode === 'forgot'
              ? t(locale, 'employeeHome.forgotHint')
              : mode === 'magic'
                ? t(locale, 'employeeHome.loginHintMagic')
                : t(locale, 'employeeHome.loginHint')}
        </p>
      </div>

      {sent && mode !== 'login' && !requires2fa ? (
        <div className="rounded-control border border-success/30 bg-success/5 p-4 text-sm text-ink">
          {mode === 'forgot' ? t(locale, 'employeeHome.forgotSentBody') : t(locale, 'employeeHome.linkSentBody')}
        </div>
      ) : requires2fa ? (
        <div className="flex flex-col gap-3">
          <FormField label={t(locale, 'login.twoFaCode')}>
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
          <button
            type="button"
            disabled={busy || twoFaCode.length !== 6}
            className={cn(S.btnPrimary, 'min-h-touch w-full justify-center')}
            onClick={verify2fa}
          >
            {busy ? t(locale, 'login.twoFaVerifying') : t(locale, 'login.twoFaSubmit')}
          </button>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-0 font-ui text-xs text-ink-muted"
            onClick={() => {
              setRequires2fa(false);
              setChallengeToken('');
              setTwoFaCode('');
            }}
          >
            ← {t(locale, 'employeeHome.backToPasswordLogin')}
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'login') void login();
            else if (mode === 'forgot') void sendForgot();
            else void sendMagic();
          }}
        >
          <FormField label={t(locale, 'employeeHome.emailLabel')}>
            <input
              type="email"
              required
              autoComplete="email"
              className={cn(S.input, 'w-full')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </FormField>
          {mode === 'login' ? (
            <FormField label={t(locale, 'employeeHome.passwordLabel')}>
              <input
                type="password"
                required
                autoComplete="current-password"
                className={cn(S.input, 'w-full')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </FormField>
          ) : null}

          {companies?.length ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-xs text-ink-muted">{t(locale, 'employeeHome.pickCompany')}</p>
              {companies.map((c) => (
                <button
                  key={c.companyId}
                  type="button"
                  disabled={busy}
                  className={cn(S.btnBrandSoft, 'min-h-touch w-full justify-center')}
                  onClick={() => onCompanyPick(c.companyId)}
                >
                  {c.companyName}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="submit"
              disabled={busy || !email.trim() || (mode === 'login' && !password)}
              className={cn(S.btnPrimary, 'min-h-touch w-full justify-center')}
            >
              {mode === 'login'
                ? t(locale, 'employeeHome.enter')
                : mode === 'forgot'
                  ? t(locale, 'employeeHome.sendReset')
                  : t(locale, 'employeeHome.sendLink')}
            </button>
          )}
        </form>
      )}

      <div className="mt-6 flex flex-col gap-2 text-center text-prose">
        {!requires2fa && mode === 'login' ? (
          <>
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 font-ui text-brand-600"
              onClick={() => {
                setMode('forgot');
                setSent(false);
                setCompanies(null);
              }}
            >
              {t(locale, 'employeeHome.forgotPassword')}
            </button>
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 font-ui text-ink-muted"
              onClick={() => {
                setMode('magic');
                setSent(false);
                setCompanies(null);
              }}
            >
              {t(locale, 'employeeHome.useMagicLink')}
            </button>
          </>
        ) : !requires2fa ? (
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-0 font-ui text-ink-muted"
            onClick={() => {
              setMode('login');
              setSent(false);
              setCompanies(null);
            }}
          >
            {t(locale, 'employeeHome.backToPasswordLogin')}
          </button>
        ) : null}
        {!requires2fa ? (
          <Link href="/login" className="mt-2 font-ui text-brand-600 hover:underline">
            {t(locale, 'employeeHome.managerLogin')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
