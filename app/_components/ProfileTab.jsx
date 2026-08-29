'use client';

import { useEffect, useState } from 'react';
import { errorMessage, t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S as dashS } from '../dashboard/dashboard-shared';
import LanguageSelect from './LanguageSelect';

const inputClass =
  'mt-1.5 box-border w-full rounded-control border border-ink/12 bg-ink/[0.04] px-3 py-2.5 font-mono text-prose text-ink';

/**
 * Tela de perfil do usuário logado (hr / direction / admin — dados próprios).
 */
export function ProfileTab({ locale, onLocaleChange, onProfileSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [twoFaCanUse, setTwoFaCanUse] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSetupSecret, setTwoFaSetupSecret] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaDisablePassword, setTwoFaDisablePassword] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  const load2fa = async () => {
    try {
      const res = await fetch('/api/me/2fa');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setTwoFaCanUse(Boolean(data.canUse2Fa));
      setTwoFaEnabled(Boolean(data.enabled));
    } catch {
      /* ignore */
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/me');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.loadFailed'));
      const u = data.user || {};
      setEmail(u.email || '');
      setDisplayName(u.displayName || '');
      setRole(u.role || '');
      setCompanyName(u.companyName || '');
      await load2fa();
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const start2faSetup = async () => {
    setTwoFaBusy(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/me/2fa', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || t(locale, 'panel.common.error'));
      }
      setTwoFaSetupSecret(data.secret || '');
      setTwoFaCode('');
      setMsg('');
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmEnable2fa = async () => {
    if (!twoFaCode.trim()) return;
    setTwoFaBusy(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/me/2fa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFaCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || t(locale, 'panel.common.error'));
      }
      setTwoFaEnabled(true);
      setTwoFaSetupSecret('');
      setTwoFaCode('');
      setMsg(t(locale, 'dashboard.profile2faEnabledOk'));
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!twoFaCode.trim() || !twoFaDisablePassword) return;
    setTwoFaBusy(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/me/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFaCode.trim(), password: twoFaDisablePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || t(locale, 'panel.common.error'));
      }
      setTwoFaEnabled(false);
      setTwoFaSetupSecret('');
      setTwoFaCode('');
      setTwoFaDisablePassword('');
      setMsg(t(locale, 'dashboard.profile2faDisabledOk'));
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setTwoFaBusy(false);
    }
  };

  useEffect(() => { load(); }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      if (newPassword || newPassword2) {
        if (newPassword !== newPassword2) {
          throw new Error(t(locale, 'dashboard.profilePasswordMismatch'));
        }
      }
      const body = {
        email,
        displayName,
        locale,
      };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'dashboard.profileSaveError'));
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
      setMsg(t(locale, 'dashboard.profileSaved'));
      if (data.user?.displayName != null) setDisplayName(data.user.displayName || '');
      if (data.user?.email) setEmail(data.user.email);
      if (typeof onProfileSaved === 'function') onProfileSaved(data.user);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full items-start justify-center">
      <div className={cn(dashS.card, 'box-border w-full max-w-[560px]')}>
        <span className={dashS.label}>{t(locale, 'dashboard.profileTitle')}</span>
        <p className="mt-2 text-prose leading-[1.55] text-ink-muted">
          {t(locale, 'dashboard.profileIntro')}
        </p>

        {loading ? (
          <p className="mt-4 text-ink-muted">{t(locale, 'panel.common.loading')}</p>
        ) : (
          <div className="mt-[18px] flex flex-col gap-3.5">
            <label className="block">
              <span className="font-mono text-2xs text-ink-faint">
                {t(locale, 'dashboard.profileDisplayName')}
              </span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className="font-mono text-2xs text-ink-faint">
                {t(locale, 'dashboard.profileEmail')}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="font-mono text-xs text-ink-muted">
              {t(locale, 'dashboard.profileRole')}: {role}
              {companyName ? ` · ${companyName}` : ''}
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-2xs text-ink-faint">
                {t(locale, 'dashboard.profileLocale')}
              </span>
              <LanguageSelect locale={locale} onChange={onLocaleChange} persistUser compact />
            </div>

            <div className="mt-1 border-t border-ink/12 pt-3.5">
              <span className={cn(dashS.label, 'mb-2.5')}>{t(locale, 'dashboard.profilePasswordSection')}</span>
              <label className="mb-2.5 block">
                <span className="font-mono text-2xs text-ink-faint">
                  {t(locale, 'dashboard.profileCurrentPassword')}
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </label>
              <label className="mb-2.5 block">
                <span className="font-mono text-2xs text-ink-faint">
                  {t(locale, 'dashboard.profileNewPassword')}
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="font-mono text-2xs text-ink-faint">
                  {t(locale, 'dashboard.profileConfirmPassword')}
                </span>
                <input
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
            </div>

            {twoFaCanUse ? (
              <div className="mt-1 border-t border-ink/12 pt-3.5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={cn(dashS.label, 'mb-0')}>{t(locale, 'dashboard.profile2faSection')}</span>
                  <span className="rounded-full border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-2xs text-ink-muted">
                    {t(locale, 'dashboard.profile2faOptionalBadge')}
                  </span>
                </div>
                <p className="mb-3 text-prose leading-relaxed text-ink-muted">
                  {t(locale, 'dashboard.profile2faIntro')}
                </p>
                {twoFaEnabled ? (
                  <div className="space-y-3">
                    <p className="font-mono text-xs text-success">{t(locale, 'dashboard.profile2faEnabled')}</p>
                    <label className="block">
                      <span className="font-mono text-2xs text-ink-faint">
                        {t(locale, 'dashboard.profile2faCode')}
                      </span>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={inputClass}
                        maxLength={6}
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-2xs text-ink-faint">
                        {t(locale, 'dashboard.profile2faDisablePassword')}
                      </span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={twoFaDisablePassword}
                        onChange={(e) => setTwoFaDisablePassword(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={disable2fa}
                      disabled={twoFaBusy || twoFaCode.length !== 6 || !twoFaDisablePassword}
                      className={cn(
                        'min-h-touch cursor-pointer rounded-control border border-danger/30 bg-danger/10 px-4 py-2.5 font-mono text-xs text-danger',
                        (twoFaBusy || twoFaCode.length !== 6 || !twoFaDisablePassword) && 'cursor-default opacity-60'
                      )}
                    >
                      {twoFaBusy ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profile2faDisable')}
                    </button>
                  </div>
                ) : twoFaSetupSecret ? (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-ink-muted">{t(locale, 'dashboard.profile2faSecretHint')}</p>
                    <code className="block break-all rounded-control border border-ink/12 bg-ink/[0.04] px-3 py-2 font-mono text-2xs">
                      {twoFaSetupSecret}
                    </code>
                    <label className="block">
                      <span className="font-mono text-2xs text-ink-faint">
                        {t(locale, 'dashboard.profile2faCode')}
                      </span>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={inputClass}
                        maxLength={6}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={confirmEnable2fa}
                      disabled={twoFaBusy || twoFaCode.length !== 6}
                      className={cn(
                        'min-h-touch cursor-pointer rounded-control border border-brand-500/30 bg-brand-500/10 px-4 py-2.5 font-mono text-xs text-brand-600',
                        (twoFaBusy || twoFaCode.length !== 6) && 'cursor-default opacity-60'
                      )}
                    >
                      {twoFaBusy ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profile2faConfirmEnable')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-muted">{t(locale, 'dashboard.profile2faDisabled')}</p>
                    <button
                      type="button"
                      onClick={start2faSetup}
                      disabled={twoFaBusy}
                      className={cn(
                        'min-h-touch cursor-pointer rounded-control border border-brand-500/30 bg-brand-500/10 px-4 py-2.5 font-mono text-xs text-brand-600',
                        twoFaBusy && 'cursor-default opacity-60'
                      )}
                    >
                      {twoFaBusy ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profile2faSetupStart')}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {error ? (
              <p className="m-0 font-mono text-xs text-danger">{error}</p>
            ) : null}
            {msg ? (
              <p className="m-0 font-mono text-xs text-success">{msg}</p>
            ) : null}

            <button
              type="button"
              onClick={save}
              disabled={saving || !email.trim()}
              className={cn(
                'min-h-touch cursor-pointer self-start rounded-control border border-brand-500/30 bg-brand-500/10 px-4 py-2.5 font-mono text-xs text-brand-500',
                (saving || !email.trim()) && 'cursor-default opacity-60'
              )}
            >
              {saving ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profileSave')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
