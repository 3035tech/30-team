'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { BrandMark } from '../../_components/BrandMark';

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
      setCompanies(null);
      router.replace('/colaborador');
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
        <h1 className="mt-4 font-display text-2xl text-ink">{t(locale, 'employeeHome.loginTitle')}</h1>
        <p className={cn(S.muted, 'mt-2 text-sm')}>
          {mode === 'forgot'
            ? t(locale, 'employeeHome.forgotHint')
            : mode === 'magic'
              ? t(locale, 'employeeHome.loginHintMagic')
              : t(locale, 'employeeHome.loginHint')}
        </p>
      </div>

      {sent && mode !== 'login' ? (
        <div className="rounded-control border border-success/30 bg-success/5 p-4 text-sm text-ink">
          {mode === 'forgot' ? t(locale, 'employeeHome.forgotSentBody') : t(locale, 'employeeHome.linkSentBody')}
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
          <label className="block text-xs text-ink-muted">
            {t(locale, 'employeeHome.emailLabel')}
            <input
              type="email"
              required
              autoComplete="email"
              className={cn(S.input, 'mt-1 w-full')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          {mode === 'login' ? (
            <label className="block text-xs text-ink-muted">
              {t(locale, 'employeeHome.passwordLabel')}
              <input
                type="password"
                required
                autoComplete="current-password"
                className={cn(S.input, 'mt-1 w-full')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </label>
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

      <div className="mt-6 flex flex-col gap-2 text-center text-xs">
        {mode === 'login' ? (
          <>
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 font-display text-brand-600"
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
              className="cursor-pointer border-none bg-transparent p-0 font-display text-ink-muted"
              onClick={() => {
                setMode('magic');
                setSent(false);
                setCompanies(null);
              }}
            >
              {t(locale, 'employeeHome.useMagicLink')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-0 font-display text-ink-muted"
            onClick={() => {
              setMode('login');
              setSent(false);
              setCompanies(null);
            }}
          >
            {t(locale, 'employeeHome.backToPasswordLogin')}
          </button>
        )}
        <Link href="/login" className="mt-2 text-brand-600 hover:underline">
          {t(locale, 'employeeHome.managerLogin')}
        </Link>
      </div>
    </div>
  );
}
