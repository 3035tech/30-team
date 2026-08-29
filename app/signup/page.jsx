'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '../../lib/useLocale';
import { t, errorMessage } from '../../lib/i18n';
import { BrandMark } from '../_components/BrandMark';
import LanguageSelect from '../_components/LanguageSelect';
import { cn } from '../../lib/cn';
import { fieldInputClass, fieldSelectClass } from '../_components/form-control-styles';
import TurnstileField from '../_components/TurnstileField';

const TURNSTILE_SITE_KEY = String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim();

const inputClass = `${fieldInputClass} w-full px-4 py-3 text-base placeholder:text-ink-faint focus:border-brand-300 focus:bg-white`;
const selectClass = `${fieldSelectClass} w-full px-4 py-3 text-base`;

export default function SignupPage() {
  const [locale, setLocale] = useLocale();
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    jobTitle: '',
    teamSize: '',
    painPoints: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTurnstileError(false);

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError(t(locale, 'errors.TURNSTILE_FAILED'));
      setTurnstileError(true);
      setLoading(false);
      return;
    }

    try {
      // Captura sessionId de analytics se houver
      const sessionId = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('landing_session_id')
        : null;

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          locale,
          sessionId,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.errorCode ? errorMessage(locale, data.errorCode) : data.error || t(locale, 'login.connectionError'));
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Signup error:', err);
      setError(t(locale, 'login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6 font-display">
        <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
        <div className="relative z-[1] w-full max-w-[540px] rounded-card border border-ink/12 bg-white px-8 py-10 shadow-card">
          <div className="mb-6 text-center">
            <BrandMark size={48} withWordmark />
          </div>
          <h1 className="mb-4 text-center text-2xl font-normal text-ink">
            {t(locale, 'signup.successTitle')}
          </h1>
          <p className="mb-6 text-center text-base leading-relaxed text-ink-muted">
            {t(locale, 'signup.successBody', { email: formData.email })}
          </p>
          <div className="mb-4 rounded-control border border-info/20 bg-info/10 px-4 py-3 text-sm text-ink-muted">
            {t(locale, 'signup.successHint')}
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full rounded-control bg-brand-500 px-4 py-3 text-base text-white hover:bg-brand-600"
          >
            {t(locale, 'signup.goToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 font-display">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow-single" />
      <div className="relative z-[1] w-full max-w-[540px] rounded-card border border-ink/12 bg-white px-8 py-10 shadow-card">
        <div className="mb-6 flex items-center justify-between">
          <BrandMark size={36} withWordmark />
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>

        <h1 className="mb-2 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-600 bg-clip-text text-3xl font-normal leading-tight text-transparent">
          {t(locale, 'signup.title')}
        </h1>
        <p className="mb-4 text-base leading-relaxed text-ink-muted">{t(locale, 'signup.intro')}</p>
        <p className="mb-2 text-sm leading-relaxed text-ink-muted">{t(locale, 'signup.includedBlurb')}</p>
        <p className="mb-6">
          <Link href="/pricing" className="text-sm text-brand-600 underline-offset-2 hover:underline">
            {t(locale, 'signup.seePricing')}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-fullname" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'signup.fullName')} <span className="text-danger">*</span>
            </label>
            <input
              id="signup-fullname"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange('fullName')}
              className={inputClass}
              placeholder={t(locale, 'signup.fullNamePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'signup.email')} <span className="text-danger">*</span>
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange('email')}
              className={inputClass}
              placeholder={t(locale, 'signup.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="signup-company" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'signup.companyName')} <span className="text-danger">*</span>
            </label>
            <input
              id="signup-company"
              type="text"
              required
              value={formData.companyName}
              onChange={handleChange('companyName')}
              className={inputClass}
              placeholder={t(locale, 'signup.companyNamePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="signup-jobtitle" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'signup.jobTitle')}
            </label>
            <input
              id="signup-jobtitle"
              type="text"
              value={formData.jobTitle}
              onChange={handleChange('jobTitle')}
              className={inputClass}
              placeholder={t(locale, 'signup.jobTitlePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="signup-teamsize" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'signup.teamSize')}
            </label>
            <select
              id="signup-teamsize"
              value={formData.teamSize}
              onChange={handleChange('teamSize')}
              className={selectClass}
            >
              <option value="">{t(locale, 'signup.teamSizePlaceholder')}</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201+">201+</option>
            </select>
          </div>

          <div>
            <label htmlFor="signup-pain" className="mb-2 block text-xs text-ink-muted">
              {t(locale, 'signup.painPoints')}
            </label>
            <textarea
              id="signup-pain"
              value={formData.painPoints}
              onChange={handleChange('painPoints')}
              rows={3}
              className={cn(inputClass, 'resize-none')}
              placeholder={t(locale, 'signup.painPointsPlaceholder')}
            />
          </div>

          <div className="rounded-control border border-ink/8 bg-ink/[0.02] px-4 py-3 text-xs leading-relaxed text-ink-muted">
            {t(locale, 'signup.terms')}
          </div>

          {error && (
            <div className="rounded-control border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {TURNSTILE_SITE_KEY ? (
            <TurnstileField
              siteKey={TURNSTILE_SITE_KEY}
              onToken={setTurnstileToken}
              onError={() => setTurnstileError(true)}
              errorMessage={turnstileError ? t(locale, 'errors.TURNSTILE_FAILED') : ''}
            />
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-4 py-3.5 text-base font-medium text-white',
              loading ? 'cursor-default opacity-60' : 'cursor-pointer hover:from-brand-600 hover:to-brand-900'
            )}
          >
            {loading ? t(locale, 'common.loading') : t(locale, 'signup.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">
          {t(locale, 'signup.hasAccount')}{' '}
          <Link href="/login" className="text-brand-600 underline-offset-2 hover:underline">
            {t(locale, 'signup.goToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
