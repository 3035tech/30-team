'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errorMessage, t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { DateField } from '../../_components/DateField';
import { FormField, formFieldRowClass } from '../../_components/FormField';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { InlineCallout } from '../../_components/InlineCallout';
import { EmptyState } from '../../_components/EmptyState';
import { BR_STATES } from '../../../lib/candidate-profile';
import { redirectEmployeeIfUnauthorized } from '../../../lib/employee-client-session';

export function EmployeeProfileClient({ locale = 'pt-BR' }) {
  const router = useRouter();
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    city: '',
    state: '',
    birthDate: '',
  });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSetupSecret, setTwoFaSetupSecret] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaDisablePassword, setTwoFaDisablePassword] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load2fa = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/me/2fa');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setTwoFaEnabled(Boolean(data.enabled));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch('/api/employee/me');
      if (redirectEmployeeIfUnauthorized(router, res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      const p = data.person || {};
      setForm({
        fullName: p.fullName || '',
        email: p.email || '',
        phone: p.phone || '',
        linkedinUrl: p.linkedinUrl || '',
        city: p.city || '',
        state: p.state || '',
        birthDate: p.birthDate || '',
      });
      await load2fa();
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.loadError'), 'error');
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [locale, router, toast, load2fa]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.title;
    document.title = t(locale, 'employeeHome.profileDocumentTitle');
    return () => {
      document.title = prev;
    };
  }, [locale]);

  const start2faSetup = async () => {
    setTwoFaBusy(true);
    try {
      const res = await fetch('/api/employee/me/2fa', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || 'setup');
      }
      setTwoFaSetupSecret(data.secret || '');
      setTwoFaCode('');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.profileSaveError'), 'error');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmEnable2fa = async () => {
    setTwoFaBusy(true);
    try {
      const res = await fetch('/api/employee/me/2fa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFaCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || 'enable');
      }
      setTwoFaSetupSecret('');
      setTwoFaCode('');
      setTwoFaEnabled(true);
      toast(t(locale, 'dashboard.profile2faEnabledOk'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.profileSaveError'), 'error');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disable2fa = async () => {
    setTwoFaBusy(true);
    try {
      const res = await fetch('/api/employee/me/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFaCode, password: twoFaDisablePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || 'disable');
      }
      setTwoFaEnabled(false);
      setTwoFaCode('');
      setTwoFaDisablePassword('');
      toast(t(locale, 'dashboard.profile2faDisabledOk'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.profileSaveError'), 'error');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/employee/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          linkedinUrl: form.linkedinUrl,
          city: form.city,
          state: form.state || null,
          birthDate: form.birthDate || null,
        }),
      });
      if (redirectEmployeeIfUnauthorized(router, res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'employeeHome.profileSaved'), 'ok');
      await load();
    } catch (err) {
      toast(err?.message || t(locale, 'employeeHome.profileSaveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.next.length < 8) {
      toast(t(locale, 'errors.PASSWORD_TOO_SHORT'), 'error');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast(t(locale, 'login.changePasswordMismatch'), 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/employee/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.next,
        }),
      });
      if (redirectEmployeeIfUnauthorized(router, res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'employeeHome.loginError'));
      setPwd({ current: '', next: '', confirm: '' });
      toast(t(locale, 'employeeHome.passwordChanged'), 'ok');
    } catch (err) {
      toast(err?.message || t(locale, 'employeeHome.passwordChangeError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="panel" />;

  if (loadFailed) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState
          message={t(locale, 'employeeHome.loadError')}
          actionLabel={t(locale, 'employeeHome.loadRetry')}
          onAction={() => void load()}
        />
      </div>
    );
  }

  return (
    <ContentEnter animKey="ready">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl">
        <Link href="/employee" className={cn(S.cardLink, 'inline-flex')}>
          ← {t(locale, 'employeeHome.backHome')}
        </Link>
        <h1 className={cn(S.pageTitle, 'mt-3')}>{t(locale, 'employeeHome.profileTitle')}</h1>
        <p className={cn(S.muted, 'mt-2')}>{t(locale, 'employeeHome.profileHint')}</p>

        <div className="mt-6 flex flex-col gap-4">
          <CollapsibleBlock
            locale={locale}
            title={t(locale, 'employeeHome.profileSectionContact')}
            variant="card"
            bordered={false}
            defaultOpen
          >
            <form className="flex flex-col gap-3" onSubmit={saveProfile}>
              <FormField label={t(locale, 'employeeHome.fullNameLabel')}>
                <input
                  className={cn(S.input, 'w-full')}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                  disabled={busy}
                />
              </FormField>
              <FormField label={t(locale, 'employeeHome.emailLabel')}>
                <input className={cn(S.input, 'w-full opacity-70')} value={form.email} disabled readOnly />
              </FormField>
              <FormField label={t(locale, 'employeeHome.phoneLabel')}>
                <input
                  className={cn(S.input, 'w-full')}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={busy}
                />
              </FormField>
              <FormField label={t(locale, 'employeeHome.linkedinLabel')}>
                <input
                  className={cn(S.input, 'w-full')}
                  value={form.linkedinUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                  disabled={busy}
                />
              </FormField>
              <div className={cn(formFieldRowClass, 'gap-3')}>
                <FormField label={t(locale, 'employeeHome.cityLabel')} className="min-w-0 flex-1">
                  <input
                    className={cn(S.input, 'w-full')}
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    disabled={busy}
                  />
                </FormField>
                <FormField label={t(locale, 'employeeHome.stateLabel')} className="min-w-0 flex-1">
                  <select
                    className={cn(S.select, 'w-full')}
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    disabled={busy}
                  >
                    <option value="">{t(locale, 'panel.common.notApplicable')}</option>
                    {BR_STATES.map((s) => (
                      <option key={s.uf} value={s.uf}>
                        {s.uf}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField as="div" label={t(locale, 'employeeHome.birthDateLabel')}>
                <DateField
                  className={cn(S.input, 'w-full')}
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value || '' }))}
                  disabled={busy}
                />
              </FormField>
              <button type="submit" disabled={busy} className={cn(S.btnPrimary, 'min-h-touch justify-center')}>
                {t(locale, 'employeeHome.saveProfile')}
              </button>
            </form>
          </CollapsibleBlock>

          <CollapsibleBlock
            locale={locale}
            title={t(locale, 'employeeHome.changePasswordTitle')}
            variant="card"
            bordered={false}
            defaultOpen={false}
          >
            <form className="flex flex-col gap-3" onSubmit={changePassword}>
              <FormField label={t(locale, 'employeeHome.currentPasswordLabel')}>
                <input
                  type="password"
                  autoComplete="current-password"
                  className={cn(S.input, 'w-full')}
                  value={pwd.current}
                  onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                  disabled={busy}
                  required
                />
              </FormField>
              <FormField label={t(locale, 'employeeHome.passwordLabel')}>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={cn(S.input, 'w-full')}
                  value={pwd.next}
                  onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                  disabled={busy}
                  required
                />
              </FormField>
              <FormField label={t(locale, 'employeeHome.confirmPasswordLabel')}>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={cn(S.input, 'w-full')}
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  disabled={busy}
                  required
                />
              </FormField>
              <button type="submit" disabled={busy} className={cn(S.btnBrandSoft, 'min-h-touch justify-center')}>
                {t(locale, 'employeeHome.changePasswordSubmit')}
              </button>
            </form>
          </CollapsibleBlock>

          <CollapsibleBlock
            locale={locale}
            title={t(locale, 'dashboard.profile2faSection')}
            headerAside={
              <StatusToneChip tone={twoFaEnabled ? 'success' : 'neutral'} bordered={false}>
                {t(locale, 'dashboard.profile2faOptionalBadge')}
              </StatusToneChip>
            }
            variant="card"
            bordered={false}
            defaultOpen={false}
          >
            <InlineCallout tone="info" className="mb-3">
              {t(locale, 'dashboard.profile2faIntro')}
            </InlineCallout>
            {twoFaEnabled ? (
              <div className="flex flex-col gap-3">
                <p className="m-0 font-mono text-xs text-success">{t(locale, 'dashboard.profile2faEnabled')}</p>
                <FormField label={t(locale, 'dashboard.profile2faCode')}>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={cn(S.input, 'w-full')}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={twoFaBusy}
                  />
                </FormField>
                <FormField label={t(locale, 'dashboard.profile2faDisablePassword')}>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className={cn(S.input, 'w-full')}
                    value={twoFaDisablePassword}
                    onChange={(e) => setTwoFaDisablePassword(e.target.value)}
                    disabled={twoFaBusy}
                  />
                </FormField>
                <button
                  type="button"
                  disabled={twoFaBusy || twoFaCode.length !== 6 || !twoFaDisablePassword}
                  className={cn(S.btnBrandSoft, 'min-h-touch justify-center border-danger/30 text-danger')}
                  onClick={disable2fa}
                >
                  {twoFaBusy ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profile2faDisable')}
                </button>
              </div>
            ) : twoFaSetupSecret ? (
              <div className="flex flex-col gap-3">
                <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'dashboard.profile2faSecretHint')}</p>
                <code className="block break-all rounded-control border border-ink/12 bg-ink/[0.04] px-3 py-2 font-mono text-2xs">
                  {twoFaSetupSecret}
                </code>
                <FormField label={t(locale, 'dashboard.profile2faCode')}>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={cn(S.input, 'w-full')}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={twoFaBusy}
                  />
                </FormField>
                <button
                  type="button"
                  disabled={twoFaBusy || twoFaCode.length !== 6}
                  className={cn(S.btnPrimary, 'min-h-touch justify-center')}
                  onClick={confirmEnable2fa}
                >
                  {twoFaBusy ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profile2faConfirmEnable')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'dashboard.profile2faDisabled')}</p>
                <button
                  type="button"
                  disabled={twoFaBusy}
                  className={cn(S.btnBrandSoft, 'min-h-touch justify-center')}
                  onClick={start2faSetup}
                >
                  {twoFaBusy ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profile2faSetupStart')}
                </button>
              </div>
            )}
          </CollapsibleBlock>
        </div>
      </div>
    </ContentEnter>
  );
}
