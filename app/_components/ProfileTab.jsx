'use client';

import { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { S } from '../dashboard/dashboard-shared';
import LanguageSelect from './LanguageSelect';

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
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
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

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(26,22,37,.04)',
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    padding: '10px 12px',
    color: C.text,
    fontSize: '13px',
    fontFamily: 'monospace',
  };

  return (
    <div style={{ ...S.card, maxWidth: '560px' }}>
      <span style={S.label}>{t(locale, 'dashboard.profileTitle')}</span>
      <p style={{ fontSize: '13px', color: C.muted, marginTop: '8px', lineHeight: 1.55 }}>
        {t(locale, 'dashboard.profileIntro')}
      </p>

      {loading ? (
        <p style={{ color: C.muted, marginTop: '16px' }}>{t(locale, 'panel.common.loading')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'dashboard.profileDisplayName')}
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ ...inputStyle, marginTop: '6px' }}
              maxLength={120}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'dashboard.profileEmail')}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, marginTop: '6px' }}
            />
          </label>
          <div style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
            {t(locale, 'dashboard.profileRole')}: {role}
            {companyName ? ` · ${companyName}` : ''}
          </div>

          <div>
            <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', display: 'block', marginBottom: '6px' }}>
              {t(locale, 'dashboard.profileLocale')}
            </span>
            <LanguageSelect locale={locale} onChange={onLocaleChange} persistUser compact />
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '14px', marginTop: '4px' }}>
            <span style={{ ...S.label, marginBottom: '10px' }}>{t(locale, 'dashboard.profilePasswordSection')}</span>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                {t(locale, 'dashboard.profileCurrentPassword')}
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                {t(locale, 'dashboard.profileNewPassword')}
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            </label>
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                {t(locale, 'dashboard.profileConfirmPassword')}
              </span>
              <input
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                autoComplete="new-password"
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            </label>
          </div>

          {error ? (
            <p style={{ margin: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>{error}</p>
          ) : null}
          {msg ? (
            <p style={{ margin: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>{msg}</p>
          ) : null}

          <button
            type="button"
            onClick={save}
            disabled={saving || !email.trim()}
            style={{
              alignSelf: 'flex-start',
              background: `${C.purple}18`,
              border: `1px solid ${C.purple}55`,
              borderRadius: '10px',
              padding: '10px 16px',
              color: C.purple,
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              opacity: saving || !email.trim() ? 0.6 : 1,
            }}
          >
            {saving ? t(locale, 'panel.common.loading') : t(locale, 'dashboard.profileSave')}
          </button>
        </div>
      )}
    </div>
  );
}
