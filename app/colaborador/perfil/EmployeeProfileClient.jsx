'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t } from '../../../lib/i18n';
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
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [locale, router, toast]);

  useEffect(() => {
    void load();
  }, [load]);

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
    </div>
  );
}
