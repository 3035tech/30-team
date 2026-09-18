'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { BrandMark } from './BrandMark';
import { InlineCallout } from './InlineCallout';
import { Icon } from './Icon';
import { CompanyModulesField } from './CompanyModulesField';
import {
  COMPANY_MODULE,
  SELECTABLE_COMPANY_MODULE_IDS,
} from '../../lib/company-modules';

const STEPS = [
  { id: 'welcome', icon: 'sparkles' },
  { id: 'objective', icon: 'overview' },
  { id: 'modules', icon: 'clipboard' },
  { id: 'vacancy', icon: 'vacancies' },
  { id: 'invite', icon: 'team' },
  { id: 'done', icon: 'check' },
];

const OBJECTIVE_MODULES = Object.freeze({
  recruiting: Object.freeze([
    COMPANY_MODULE.CORE,
    COMPANY_MODULE.RECRUITING,
    COMPANY_MODULE.JOB_ROLES,
    COMPANY_MODULE.ANALYSIS,
    COMPANY_MODULE.MOTIVATORS,
  ]),
  people: Object.freeze([
    COMPANY_MODULE.CORE,
    COMPANY_MODULE.ANALYSIS,
    COMPANY_MODULE.MOTIVATORS,
    COMPANY_MODULE.CLIMATE,
    COMPANY_MODULE.PERFORMANCE,
    COMPANY_MODULE.SUCCESSION,
    COMPANY_MODULE.EXIT,
    COMPANY_MODULE.LEARNING,
    COMPANY_MODULE.BENEFITS,
    COMPANY_MODULE.COMPANY_FEED,
    COMPANY_MODULE.WHISTLEBLOWING,
  ]),
  complete: Object.freeze([...SELECTABLE_COMPANY_MODULE_IDS]),
});

/**
 * Wizard guiado para todo gestor novo vinculado a uma empresa.
 * Super admin não recebe o wizard e mantém todos os módulos disponíveis.
 */
export default function OnboardingWizard({ locale, userName, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [modulesTouched, setModulesTouched] = useState(false);
  const [objective, setObjective] = useState('');
  const [selectedModules, setSelectedModules] = useState(() => [...SELECTABLE_COMPANY_MODULE_IDS]);
  const stepTitleRef = useRef(null);

  const step = STEPS[currentStep];

  useEffect(() => {
    stepTitleRef.current?.focus();
  }, [currentStep]);

  const chooseObjective = (nextObjective) => {
    setObjective(nextObjective);
    setSelectedModules([...(OBJECTIVE_MODULES[nextObjective] || OBJECTIVE_MODULES.complete)]);
    setModulesTouched(true);
    handleNext();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = async () => {
    await markComplete({ skipModules: true });
  };

  const handleComplete = async () => {
    await markComplete({ skipModules: false });
  };

  const markComplete = async ({ skipModules = false } = {}) => {
    if (completing) return false;
    setCompleting(true);
    setCompleteError('');
    try {
      const body = {};
      if (!skipModules && modulesTouched) {
        // Send the UI selection; the server owns normalization (all selected → unrestricted).
        body.modules = selectedModules;
      }
      const res = await fetch('/api/admin/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t(locale, 'onboarding.completeError'));
      if (onComplete) onComplete();
      return true;
    } catch (err) {
      console.error('[onboarding] Complete error:', err);
      setCompleteError(err?.message || t(locale, 'onboarding.completeError'));
      return false;
    } finally {
      setCompleting(false);
    }
  };

  const completeAndNavigate = async (event, href) => {
    event.preventDefault();
    const completed = await markComplete();
    if (completed && typeof window !== 'undefined') window.location.assign(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step-title"
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[640px] flex-col overflow-hidden rounded-card border border-ink/12 bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
      >
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
              type="button"
              onClick={handleSkip}
              disabled={completing}
              className="min-h-10 rounded-control px-3 py-2 text-xs font-medium text-ink-muted hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-default disabled:opacity-60"
            >
              {t(locale, 'onboarding.skip')}
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="flex gap-2"
            role="progressbar"
            aria-label={t(locale, 'onboarding.progress')}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={currentStep + 1}
          >
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
          <p className="sr-only" aria-live="polite">
            {t(locale, 'onboarding.progressValue', {
              current: currentStep + 1,
              total: STEPS.length,
            })}
          </p>
        </div>

        {/* Content */}
        <div className="min-h-0 overflow-y-auto p-5 sm:p-8">
          {completeError ? (
            <InlineCallout tone="danger" emphasis role="alert" className="mb-5 text-left">
              {completeError}
            </InlineCallout>
          ) : null}
          {step.id === 'welcome' && (
            <div className="text-center">
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 id="onboarding-step-title" ref={stepTitleRef} tabIndex={-1} className="mb-3 text-2xl font-normal text-ink outline-none">
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
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-touch items-center rounded-control bg-brand-500 px-6 py-3 text-base font-medium text-white hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {t(locale, 'onboarding.welcome.cta')}
              </button>
            </div>
          )}

          {step.id === 'objective' && (
            <div>
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 id="onboarding-step-title" ref={stepTitleRef} tabIndex={-1} className="mb-3 text-center text-2xl font-normal text-ink outline-none">
                {t(locale, 'onboarding.objective.title')}
              </h2>
              <p className="mb-6 text-center text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.objective.body')}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {['recruiting', 'people', 'complete'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => chooseObjective(id)}
                    aria-pressed={objective === id}
                    className={cn(
                      'min-h-[108px] rounded-card border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:min-h-[132px]',
                      objective === id
                        ? 'border-brand-500 bg-brand-500/[0.07]'
                        : 'border-ink/10 bg-surface hover:border-brand-500/40'
                    )}
                  >
                    <span className="block font-ui text-sm font-semibold text-ink">
                      {t(locale, `onboarding.objective.${id}Title`)}
                    </span>
                    <span className="mt-1.5 block font-ui text-xs leading-relaxed text-ink-muted">
                      {t(locale, `onboarding.objective.${id}Body`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step.id === 'modules' && (
            <div>
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name="clipboard" className="h-12 w-12" />
              </div>
              <h2 id="onboarding-step-title" ref={stepTitleRef} tabIndex={-1} className="mb-3 text-center text-2xl font-normal text-ink outline-none">
                {t(locale, 'onboarding.modules.title')}
              </h2>
              <p className="mb-4 text-center text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.modules.body')}
              </p>
              <InlineCallout tone="info" className="mb-4 text-left text-xs text-ink-muted">
                {t(locale, 'onboarding.modules.hint')}
              </InlineCallout>
              <div className="mb-6">
                <CompanyModulesField
                  locale={locale}
                  selectedIds={selectedModules}
                  onChange={(next) => {
                    setModulesTouched(true);
                    setSelectedModules(next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setModulesTouched(true);
                  handleNext();
                }}
                className="min-h-touch w-full rounded-control bg-brand-500 px-6 py-3 text-base font-medium text-white hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {t(locale, 'onboarding.modules.cta')}
              </button>
            </div>
          )}

          {step.id === 'vacancy' && (
            <div>
              <div className="mb-4 flex justify-center text-brand-500">
                <Icon name={step.icon} className="h-12 w-12" />
              </div>
              <h2 id="onboarding-step-title" ref={stepTitleRef} tabIndex={-1} className="mb-3 text-center text-2xl font-normal text-ink outline-none">
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard?tab=vacancies"
                  onClick={(event) => void completeAndNavigate(event, '/dashboard?tab=vacancies')}
                  aria-disabled={completing}
                  className="flex-1 rounded-control border border-brand-500 bg-brand-500 px-4 py-3 text-center text-base text-white no-underline hover:bg-brand-600"
                >
                  {t(locale, 'onboarding.vacancy.createCta')}
                </Link>
                <button
                  type="button"
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
              <h2 id="onboarding-step-title" ref={stepTitleRef} tabIndex={-1} className="mb-3 text-center text-2xl font-normal text-ink outline-none">
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
                    onClick={(event) => void completeAndNavigate(event, '/dashboard?tab=users')}
                    aria-disabled={completing}
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
                    type="button"
                    onClick={handleNext}
                    className="inline-block rounded-control border border-ink/20 bg-white px-3 py-1.5 text-xs text-ink hover:bg-ink/5"
                  >
                    {t(locale, 'onboarding.invite.linkCta')}
                  </button>
                </div>
              </div>

              <button
                type="button"
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
              <h2 id="onboarding-step-title" ref={stepTitleRef} tabIndex={-1} className="mb-3 text-2xl font-normal text-ink outline-none">
                {t(locale, 'onboarding.done.title')}
              </h2>
              <p className="mb-6 text-base leading-relaxed text-ink-muted">
                {t(locale, 'onboarding.done.body')}
              </p>

              <div className="mb-6 grid gap-3 text-left sm:grid-cols-2">
                <Link
                  href="/dashboard?tab=overview"
                  onClick={(event) => void completeAndNavigate(event, '/dashboard?tab=overview')}
                  aria-disabled={completing}
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
                  onClick={(event) => void completeAndNavigate(event, '/dashboard?tab=help')}
                  aria-disabled={completing}
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
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className={cn(
                  'min-h-touch w-full rounded-control bg-brand-500 px-6 py-3 text-base font-medium text-white hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
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
