'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errorMessage, t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { DateField } from '../../_components/DateField';
import { BR_STATES } from '../../../lib/candidate-profile';

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
    try {
      const res = await fetch('/api/employee/me');
      if (res.status === 401) {
        router.replace('/colaborador/login');
        return;
      }
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
    } finally {
      setLoading(false);
    }
  }, [locale, router, toast, load2fa]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/colaborador" className="font-mono text-[12px] text-brand-600 no-underline">
        ← {t(locale, 'employeeHome.backHome')}
      </Link>
      <h1 className="mt-3 font-display text-2xl text-ink">{t(locale, 'employeeHome.profileTitle')}</h1>
      <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'employeeHome.profileHint')}</p>

      <form className="mt-6 flex flex-col gap-3" onSubmit={saveProfile}>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.fullNameLabel')}
          <input
            className={cn(S.input, 'mt-1 w-full')}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.emailLabel')}
          <input className={cn(S.input, 'mt-1 w-full opacity-70')} value={form.email} disabled readOnly />
        </label>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.phoneLabel')}
          <input
            className={cn(S.input, 'mt-1 w-full')}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.linkedinLabel')}
          <input
            className={cn(S.input, 'mt-1 w-full')}
            value={form.linkedinUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            disabled={busy}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-ink-muted">
            {t(locale, 'employeeHome.cityLabel')}
            <input
              className={cn(S.input, 'mt-1 w-full')}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="block text-xs text-ink-muted">
            {t(locale, 'employeeHome.stateLabel')}
            <select
              className={cn(S.select, 'mt-1 w-full')}
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              disabled={busy}
            >
              <option value="">—</option>
              {BR_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.uf}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <span className="block text-xs text-ink-muted">{t(locale, 'employeeHome.birthDateLabel')}</span>
          <DateField
            className={cn(S.input, 'mt-1 w-full')}
            value={form.birthDate}
            onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value || '' }))}
            disabled={busy}
          />
        </div>
        <button type="submit" disabled={busy} className={cn(S.btnPrimary, 'min-h-touch justify-center')}>
          {t(locale, 'employeeHome.saveProfile')}
        </button>
      </form>

      <form className="mt-10 flex flex-col gap-3 border-t border-ink/10 pt-8" onSubmit={changePassword}>
        <h2 className={cn(S.label, 'm-0')}>{t(locale, 'employeeHome.changePasswordTitle')}</h2>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.currentPasswordLabel')}
          <input
            type="password"
            autoComplete="current-password"
            className={cn(S.input, 'mt-1 w-full')}
            value={pwd.current}
            onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
            disabled={busy}
            required
          />
        </label>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.passwordLabel')}
          <input
            type="password"
            autoComplete="new-password"
            className={cn(S.input, 'mt-1 w-full')}
            value={pwd.next}
            onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
            disabled={busy}
            required
          />
        </label>
        <label className="block text-xs text-ink-muted">
          {t(locale, 'employeeHome.confirmPasswordLabel')}
          <input
            type="password"
            autoComplete="new-password"
            className={cn(S.input, 'mt-1 w-full')}
            value={pwd.confirm}
            onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
            disabled={busy}
            required
          />
        </label>
        <button type="submit" disabled={busy} className={cn(S.btnBrandSoft, 'min-h-touch justify-center')}>
          {t(locale, 'employeeHome.changePasswordSubmit')}
        </button>
      </form>

      <div className="mt-10 border-t border-ink/10 pt-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className={cn(S.label, 'm-0')}>{t(locale, 'dashboard.profile2faSection')}</h2>
          <span className="rounded-full border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-muted">
            {t(locale, 'dashboard.profile2faOptionalBadge')}
          </span>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-ink-muted">{t(locale, 'dashboard.profile2faIntro')}</p>
        {twoFaEnabled ? (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs text-success">{t(locale, 'dashboard.profile2faEnabled')}</p>
            <label className="block text-xs text-ink-muted">
              {t(locale, 'dashboard.profile2faCode')}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                className={cn(S.input, 'mt-1 w-full')}
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={twoFaBusy}
              />
            </label>
            <label className="block text-xs text-ink-muted">
              {t(locale, 'dashboard.profile2faDisablePassword')}
              <input
                type="password"
                autoComplete="current-password"
                className={cn(S.input, 'mt-1 w-full')}
                value={twoFaDisablePassword}
                onChange={(e) => setTwoFaDisablePassword(e.target.value)}
                disabled={twoFaBusy}
              />
            </label>
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
            <p className="text-xs leading-relaxed text-ink-muted">{t(locale, 'dashboard.profile2faSecretHint')}</p>
            <code className="block break-all rounded-control border border-ink/12 bg-ink/[0.04] px-3 py-2 font-mono text-[11px]">
              {twoFaSetupSecret}
            </code>
            <label className="block text-xs text-ink-muted">
              {t(locale, 'dashboard.profile2faCode')}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                className={cn(S.input, 'mt-1 w-full')}
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={twoFaBusy}
              />
            </label>
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
            <p className="text-xs text-ink-muted">{t(locale, 'dashboard.profile2faDisabled')}</p>
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
      </div>
    </div>
  );
}
