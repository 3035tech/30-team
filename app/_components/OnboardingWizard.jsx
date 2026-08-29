'use client';

import { useState } from 'react';
import Link from 'next/link';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { BrandMark } from './BrandMark';
import { InlineCallout } from './InlineCallout';
import { Icon } from './Icon';

const STEPS = [
  { id: 'welcome', icon: 'sparkles' },
  { id: 'vacancy', icon: 'vacancies' },
  { id: 'invite', icon: 'team' },
  { id: 'done', icon: 'check' },
];

/**
 * Wizard de onboarding guiado — só cohort early access (/signup).
 * O dashboard só monta este componente quando showOnboardingWizard=true
 * (self-service + onboarding_completed=false; nunca admin/painel legado).
 */
export default function OnboardingWizard({ locale, userName, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = async () => {
    await markComplete();
  };

  const handleComplete = async () => {
    await markComplete();
  };

  const markComplete = async () => {
    setCompleting(true);
    try {
      await fetch('/api/admin/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (onComplete) onComplete();
      // Não precisa de refresh, o dashboard já vai esconder o wizard
    } catch (err) {
      console.error('[onboarding] Complete error:', err);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-[600px] rounded-card border border-ink/12 bg-white shadow-xl">
        {/* Header com steps */}
        <div className="border-b border-ink/8 px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandMark size={28} />
              <span className="font-display text-sm text-ink-muted">
                {t(locale, 'onboarding.title')}
              </span>
            </div>
            <button
              onClick={handleSkip}
              disabled={completing}
              className="rounded-control px-3 py-1.5 text-xs text-ink-muted hover:bg-ink/5"
            >
              {t(locale, 'onboarding.skip')}
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  idx <= currentStep ? 'bg-brand-500' : 'bg-ink/10'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step.id === 'welcome' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 className="mb-3 text-2xl font-normal text-ink">
                {t(locale, 'onboarding.welcome.title', { name: userName })}
              </h2>
              <p className="mb-6 text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.welcome.body')}
              </p>
              <InlineCallout tone="info" className="mb-4 text-left text-sm text-ink-muted">
                <strong className="text-ink">{t(locale, 'onboarding.welcome.trialTitle')}</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• {t(locale, 'onboarding.welcome.trialVacancies')}</li>
                  <li>• {t(locale, 'onboarding.welcome.trialCandidates')}</li>
                  <li>• {t(locale, 'onboarding.welcome.trialUsers')}</li>
                </ul>
              </InlineCallout>
              <button
                onClick={handleNext}
                className="inline-flex min-h-touch items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-6 py-3 text-base text-white"
              >
                {t(locale, 'onboarding.welcome.cta')} →
              </button>
            </div>
          )}

          {step.id === 'vacancy' && (
            <div>
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 className="mb-3 text-center text-2xl font-normal text-ink">
                {t(locale, 'onboarding.vacancy.title')}
              </h2>
              <p className="mb-6 text-center text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.vacancy.body')}
              </p>

              <div className="mb-6 space-y-3 rounded-card border border-ink/8 bg-ink/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-brand-500">
                    <Icon name="pencil" className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-ink">
                      {t(locale, 'onboarding.vacancy.step1Title')}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {t(locale, 'onboarding.vacancy.step1Body')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-brand-500">
                    <Icon name="leadership" className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-ink">
                      {t(locale, 'onboarding.vacancy.step2Title')}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {t(locale, 'onboarding.vacancy.step2Body')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-brand-500">
                    <Icon name="chart" className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-ink">
                      {t(locale, 'onboarding.vacancy.step3Title')}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {t(locale, 'onboarding.vacancy.step3Body')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/dashboard?tab=vacancies"
                  onClick={() => markComplete()}
                  className="flex-1 rounded-control border border-brand-500 bg-brand-500 px-4 py-3 text-center text-base text-white no-underline hover:bg-brand-600"
                >
                  {t(locale, 'onboarding.vacancy.createCta')}
                </Link>
                <button
                  onClick={handleNext}
                  className="flex-1 rounded-control border border-ink/12 bg-white px-4 py-3 text-base text-ink hover:bg-ink/5"
                >
                  {t(locale, 'onboarding.vacancy.skipCta')}
                </button>
              </div>
            </div>
          )}

          {step.id === 'invite' && (
            <div>
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 className="mb-3 text-center text-2xl font-normal text-ink">
                {t(locale, 'onboarding.invite.title')}
              </h2>
              <p className="mb-6 text-center text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.invite.body')}
              </p>

              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-ink/8 bg-ink/[0.02] p-4">
                  <div className="mb-2 text-brand-500">
                    <Icon name="users" className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-ink">
                    {t(locale, 'onboarding.invite.teamTitle')}
                  </h3>
                  <p className="mb-3 text-xs text-ink-muted">
                    {t(locale, 'onboarding.invite.teamBody')}
                  </p>
                  <Link
                    href="/dashboard?tab=users"
                    onClick={() => markComplete()}
                    className="inline-block rounded-control border border-brand-400 bg-brand-50 px-3 py-1.5 text-xs text-brand-700 no-underline hover:bg-brand-100"
                  >
                    {t(locale, 'onboarding.invite.teamCta')}
                  </Link>
                </div>

                <div className="rounded-card border border-ink/8 bg-ink/[0.02] p-4">
                  <div className="mb-2 text-brand-500">
                    <Icon name="externalLink" className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-ink">
                    {t(locale, 'onboarding.invite.linkTitle')}
                  </h3>
                  <p className="mb-3 text-xs text-ink-muted">
                    {t(locale, 'onboarding.invite.linkBody')}
                  </p>
                  <button
                    onClick={handleNext}
                    className="inline-block rounded-control border border-ink/20 bg-white px-3 py-1.5 text-xs text-ink hover:bg-ink/5"
                  >
                    {t(locale, 'onboarding.invite.linkCta')}
                  </button>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full rounded-control border border-ink/12 bg-white px-4 py-3 text-base text-ink hover:bg-ink/5"
              >
                {t(locale, 'onboarding.invite.skipCta')}
              </button>
            </div>
          )}

          {step.id === 'done' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 className="mb-3 text-2xl font-normal text-ink">
                {t(locale, 'onboarding.done.title')}
              </h2>
              <p className="mb-6 text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.done.body')}
              </p>

              <div className="mb-6 grid gap-3 text-left sm:grid-cols-2">
                <Link
                  href="/dashboard?tab=overview"
                  className="rounded-card border border-ink/8 bg-ink/[0.02] p-4 no-underline hover:border-brand-300"
                >
                  <div className="mb-2 text-brand-500">
                    <Icon name="overview" className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-ink">
                    {t(locale, 'onboarding.done.overviewTitle')}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t(locale, 'onboarding.done.overviewBody')}
                  </p>
                </Link>

                <Link
                  href="/dashboard?tab=help"
                  className="rounded-card border border-ink/8 bg-ink/[0.02] p-4 no-underline hover:border-brand-300"
                >
                  <div className="mb-2 text-brand-500">
                    <Icon name="help" className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 text-sm font-medium text-ink">
                    {t(locale, 'onboarding.done.helpTitle')}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t(locale, 'onboarding.done.helpBody')}
                  </p>
                </Link>
              </div>

              <button
                onClick={handleComplete}
                disabled={completing}
                className={cn(
                  'w-full rounded-control bg-gradient-to-br from-brand-500 to-brand-800 px-6 py-3 text-base text-white',
                  completing && 'cursor-default opacity-60'
                )}
              >
                {completing ? t(locale, 'common.loading') : t(locale, 'onboarding.done.cta')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
