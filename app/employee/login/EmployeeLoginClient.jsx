'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { errorMessage, t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { BrandMark } from '../../_components/BrandMark';
import { FormField } from '../../_components/FormField';
import { InlineCallout } from '../../_components/InlineCallout';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { SegmentedControl } from '../../_components/SegmentedControl';
import TurnstileField from '../../_components/TurnstileField';
import { EMPLOYEE_PATH } from '../../../lib/employee-paths';

/**
 * Collaborator login — password primary; forgot + magic via SegmentedControl.
 * Multi-empresa: código (slug) digitado — nunca lista de empresas na API.
 */
export function EmployeeLoginClient({ locale = 'pt-BR', reason: reasonProp = '' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState('login'); // login | forgot | magic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [needsCompanySlug, setNeedsCompanySlug] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [formError, setFormError] = useState('');
  const [formInfo, setFormInfo] = useState('');
  const sessionReason = reasonProp || searchParams?.get('reason') || '';

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

  // Already signed in → go home (avoid double login)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/employee/session');
        if (cancelled || !res.ok) return;
        router.replace(EMPLOYEE_PATH.HOME);
      } catch {
        /* stay on login */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.title;
    document.title = t(locale, 'employeeHome.loginDocumentTitle');
    return () => {
      document.title = prev;
    };
  }, [locale]);

  const captchaPayload = () => ({
    turnstileToken: turnstileToken || undefined,
  });

  const companyPayload = () => {
    const slug = companySlug.trim();
    return slug ? { companySlug: slug } : {};
  };

  const ensureCaptcha = () => {
    if (turnstileRequired && !turnstileToken) {
      setFormError(t(locale, 'errors.TURNSTILE_FAILED'));
      return false;
    }
    return true;
  };

  const verify2fa = async () => {
    if (!ensureCaptcha()) return;
    setBusy(true);
    setFormError('');
    setFormInfo('');
    try {
      const res = await fetch('/api/auth/employee/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          code: twoFaCode,
          locale,
          ...captchaPayload(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || t(locale, 'login.twoFaVerifying'));
      setRequires2fa(false);
      setChallengeToken('');
      router.replace('/employee');
    } catch (e) {
      setFormError(e?.message || t(locale, 'employeeHome.loginError'));
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    if (!ensureCaptcha()) return;
    setBusy(true);
    setFormError('');
    setFormInfo('');
    try {
      const res = await fetch('/api/auth/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          locale,
          ...companyPayload(),
          ...captchaPayload(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.errorCode === 'COMPANY_SLUG_REQUIRED' || json.needsCompanySlug) {
        setNeedsCompanySlug(true);
        setFormInfo(t(locale, 'employeeHome.companySlugRequired'));
        return;
      }
      if (!res.ok) {
        throw new Error(
          json?.errorCode
            ? errorMessage(locale, json.errorCode, json.error)
            : json?.error || t(locale, 'employeeHome.loginError')
        );
      }
      if (json.requires2fa && json.challengeToken) {
        setRequires2fa(true);
        setChallengeToken(json.challengeToken);
        setNeedsCompanySlug(false);
        return;
      }
      setNeedsCompanySlug(false);
      router.replace('/employee');
    } catch (e) {
      setFormError(e?.message || t(locale, 'employeeHome.loginError'));
    } finally {
      setBusy(false);
    }
  };

  const sendForgot = async () => {
    if (!ensureCaptcha()) return;
    setBusy(true);
    setFormError('');
    setFormInfo('');
    try {
      const res = await fetch('/api/auth/employee/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          ...companyPayload(),
          ...captchaPayload(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'send');
      if (json.needsCompanySlug) {
        setNeedsCompanySlug(true);
        setFormInfo(t(locale, 'employeeHome.companySlugRequired'));
        return;
      }
      setNeedsCompanySlug(false);
      setSent(true);
    } catch (e) {
      setFormError(e?.message || t(locale, 'employeeHome.linkError'));
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = async () => {
    if (!ensureCaptcha()) return;
    setBusy(true);
    setFormError('');
    setFormInfo('');
    try {
      const res = await fetch('/api/auth/employee/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          ...companyPayload(),
          ...captchaPayload(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'send');
      if (json.needsCompanySlug) {
        setNeedsCompanySlug(true);
        setFormInfo(t(locale, 'employeeHome.companySlugRequired'));
        return;
      }
      setNeedsCompanySlug(false);
      setSent(true);
    } catch (e) {
      setFormError(e?.message || t(locale, 'employeeHome.linkError'));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setSent(false);
    setNeedsCompanySlug(false);
    setFormError('');
    setFormInfo('');
  };

  const modeHint =
    requires2fa
      ? t(locale, 'login.twoFaIntro')
      : mode === 'forgot'
        ? t(locale, 'employeeHome.forgotHint')
        : mode === 'magic'
          ? t(locale, 'employeeHome.loginHintMagic')
          : t(locale, 'employeeHome.loginHint');

  return (
    <PublicNarrowShell
      variant="form"
      locale={locale}
      maxWidthClass="max-w-md"
      className="flex min-h-screen flex-col justify-center py-12"
    >
      <div className="mb-6 text-center">
        <BrandMark size={36} withWordmark className="justify-center" />
        <h1 className={cn(S.pageTitle, 'mt-4')}>{t(locale, 'employeeHome.loginTitle')}</h1>
        <p className={cn(S.muted, 'mt-2')}>{modeHint}</p>
      </div>

      {sessionReason === 'expired' ? (
        <InlineCallout tone="warning" emphasis className="mb-4">
          {t(locale, 'employeeHome.sessionExpired')}
        </InlineCallout>
      ) : null}
      {sessionReason === 'logout' ? (
        <InlineCallout tone="info" emphasis className="mb-4">
          {t(locale, 'employeeHome.logoutOk')}
        </InlineCallout>
      ) : null}

      {formError ? (
        <InlineCallout
          tone="danger"
          role="alert"
          emphasis
          title={t(locale, 'employeeHome.loginFailedTitle')}
          className="mb-4"
        >
          {formError}
        </InlineCallout>
      ) : null}
      {formInfo && !formError ? (
        <InlineCallout tone="info" emphasis className="mb-4">
          {formInfo}
        </InlineCallout>
      ) : null}

      {!requires2fa && !sent ? (
        <SegmentedControl
          className="mb-4 w-full justify-center"
          size="sm"
          aria-label={t(locale, 'employeeHome.loginModeAria')}
          value={mode}
          onChange={switchMode}
          options={[
            { id: 'login', label: t(locale, 'employeeHome.enter') },
            { id: 'forgot', label: t(locale, 'employeeHome.forgotPassword') },
            { id: 'magic', label: t(locale, 'employeeHome.useMagicLinkShort') },
          ]}
        />
      ) : null}

      {sent && mode !== 'login' && !requires2fa ? (
        <InlineCallout tone="success" emphasis className="mb-4">
          {mode === 'forgot' ? t(locale, 'employeeHome.forgotSentBody') : t(locale, 'employeeHome.linkSentBody')}
        </InlineCallout>
      ) : requires2fa ? (
        <div className="flex flex-col gap-3">
          <FormField label={t(locale, 'login.twoFaCode')}>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              className={cn(S.input, 'w-full', formError && 'border-danger')}
              value={twoFaCode}
              onChange={(e) => {
                setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (formError) setFormError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && verify2fa()}
              maxLength={6}
              disabled={busy}
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
            className={cn(S.btnGhost, 'min-h-touch w-full justify-center')}
            onClick={() => {
              setRequires2fa(false);
              setChallengeToken('');
              setTwoFaCode('');
            }}
          >
            {t(locale, 'employeeHome.backToPasswordLogin')}
          </button>
        </div>
      ) : (
        <form
          className="flex w-full flex-col gap-3"
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
              className={cn(S.input, 'w-full', formError && 'border-danger')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError('');
              }}
              disabled={busy}
            />
          </FormField>
          {mode === 'login' ? (
            <FormField label={t(locale, 'employeeHome.passwordLabel')}>
              <input
                type="password"
                required
                autoComplete="current-password"
                className={cn(S.input, 'w-full', formError && 'border-danger')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError('');
                }}
                disabled={busy}
              />
            </FormField>
          ) : null}

          <FormField
            label={t(locale, 'employeeHome.companySlugLabel')}
            hint={needsCompanySlug ? t(locale, 'employeeHome.companySlugRequired') : t(locale, 'employeeHome.companySlugHint')}
          >
            <input
              type="text"
              autoComplete="organization"
              className={cn(S.input, 'w-full', needsCompanySlug && 'border-warning')}
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              disabled={busy}
              placeholder={t(locale, 'employeeHome.companySlugPlaceholder')}
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

          <button
            type="submit"
            disabled={
              busy ||
              !email.trim() ||
              (mode === 'login' && !password) ||
              (needsCompanySlug && !companySlug.trim())
            }
            className={cn(S.btnPrimary, 'min-h-touch w-full justify-center')}
          >
            {mode === 'login'
              ? t(locale, 'employeeHome.enter')
              : mode === 'forgot'
                ? t(locale, 'employeeHome.sendReset')
                : t(locale, 'employeeHome.sendLink')}
          </button>
        </form>
      )}

      {sent && !requires2fa ? (
        <button
          type="button"
          className={cn(S.btnGhost, 'mt-4 min-h-touch w-full justify-center')}
          onClick={() => switchMode('login')}
        >
          {t(locale, 'employeeHome.backToPasswordLogin')}
        </button>
      ) : null}

      {!requires2fa ? (
        <p className="mt-6 text-center">
          <Link href="/login" className="font-ui text-prose text-brand-600 no-underline hover:underline">
            {t(locale, 'employeeHome.managerLogin')}
          </Link>
        </p>
      ) : null}
    </PublicNarrowShell>
  );
}
