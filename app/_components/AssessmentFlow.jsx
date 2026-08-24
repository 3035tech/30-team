'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { computeAssessmentFromAnswers } from '../../lib/assessment-score';
import { drawLocalizedQuestions, getScaleLabels, localizeAreaLabel } from '../../lib/i18n-data';
import { errorMessage, t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { cn } from '../../lib/cn';
import LanguageSelect from './LanguageSelect';
import { BrStateSelect } from './BrStateSelect';
import { BrCitySelect } from './BrCitySelect';
import { formatPhoneBr, stripPhone } from '../../lib/br-masks';
import { titleCasePersonName } from '../../lib/person-name';


const SC = {
  app: 'cand-flow relative box-border flex min-h-screen flex-col items-center justify-center overflow-auto bg-canvas p-6 font-display text-ink',
  glow: 'pointer-events-none fixed inset-0 bg-radial-glow',
  card: 'cand-flow-card relative z-[1] box-border w-full max-w-[34rem] rounded-[20px] border border-ink/12 bg-white px-7 py-9 shadow-card backdrop-blur-3xl sm:px-9 sm:py-10',
  label: 'mb-4 block font-mono text-[10px] uppercase tracking-[3px] text-ink-label',
  h1: 'mb-3 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-[clamp(26px,4.5vw,36px)] font-normal leading-[1.15] text-transparent',
  p: 'mb-7 text-[15px] italic leading-[1.65] text-ink-muted',
  btn: 'cursor-pointer rounded-control border-none bg-gradient-to-br from-brand-500 to-brand-800 px-8 py-3.5 font-display text-sm text-white',
  input: 'mb-4 box-border w-full rounded-control border border-ink/12 bg-ink/[0.04] px-4 py-3 font-display text-[15px] text-ink',
  fieldLabel: 'mb-2 block text-xs text-ink-muted',
  fields: 'cand-flow-fields',
};


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function HomeScreen({
  onStart,
  notice = null,
  startDisabled = false,
  requireCandidateEmail = false,
  inviteToken = '',
  vacancyToken = '',
  locale,
  setLocale,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [areaKey, setAreaKey] = useState('');
  const [areaOptions, setAreaOptions] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState('');
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [startBusy, setStartBusy] = useState(false);
  const [startError, setStartError] = useState('');
  const [inviteIdentity, setInviteIdentity] = useState(null);
  const [inviteIdentityLoading, setInviteIdentityLoading] = useState(Boolean(inviteToken));
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/areas');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'errors.AREAS_LOAD'));
        if (!cancelled) {
          setAreaOptions(Array.isArray(data.areas) ? data.areas : []);
          setAreasError('');
        }
      } catch (e) {
        if (!cancelled) setAreasError(e?.message || t(locale, 'errors.AREAS_LOAD'));
      } finally {
        if (!cancelled) setAreasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!inviteToken) {
      setInviteIdentity(null);
      setInviteIdentityLoading(false);
      return;
    }
    let cancelled = false;
    setInviteIdentityLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ token: inviteToken });
        if (vacancyToken) params.set('vacancyToken', vacancyToken);
        const res = await fetch(`/api/public/candidate-invite?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.ok && data?.candidateName && data?.candidateEmail) {
            const nextPhone = stripPhone(data.phone) || '';
            const nextLinkedin = String(data.linkedinUrl || '').trim();
            const nextCity = String(data.city || '').trim();
            const nextState = String(data.state || '').trim();
            setInviteIdentity({
              candidateName: String(data.candidateName),
              candidateEmail: String(data.candidateEmail),
              phone: nextPhone,
              linkedinUrl: nextLinkedin,
              city: nextCity,
              state: nextState,
            });
            if (nextPhone) setPhone(nextPhone);
            if (nextLinkedin) setLinkedinUrl(nextLinkedin);
            if (nextState) setStateUf(nextState);
            if (nextCity) setCity(nextCity);
          } else {
            setInviteIdentity(null);
          }
        }
      } catch {
        if (!cancelled) setInviteIdentity(null);
      } finally {
        if (!cancelled) setInviteIdentityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken, vacancyToken]);

  useEffect(() => {
    if (areaOptions.length === 0) return;
    setAreaKey((k) => (k && areaOptions.some((a) => a.key === k) ? k : areaOptions[0].key));
  }, [areaOptions]);

  const identityLocked = Boolean(
    inviteIdentity?.candidateName?.trim()?.length > 1 &&
      inviteIdentity?.candidateEmail &&
      EMAIL_RE.test(String(inviteIdentity.candidateEmail).trim())
  );
  const effectiveName = identityLocked ? String(inviteIdentity.candidateName) : name;
  const effectiveEmail = identityLocked ? String(inviteIdentity.candidateEmail).trim() : email.trim();
  const phoneFromHr = Boolean(identityLocked && inviteIdentity?.phone);
  const linkedinFromHr = Boolean(identityLocked && inviteIdentity?.linkedinUrl);
  const locationFromHr = Boolean(identityLocked && inviteIdentity?.state && inviteIdentity?.city);
  const hrProfileBits = [];
  if (phoneFromHr) hrProfileBits.push(formatPhoneBr(inviteIdentity.phone));
  if (linkedinFromHr) hrProfileBits.push(t(locale, 'candidate.linkedinShort'));
  if (locationFromHr) {
    hrProfileBits.push([inviteIdentity.city, inviteIdentity.state].filter(Boolean).join(' / '));
  }

  const emailOk = !requireCandidateEmail || EMAIL_RE.test(effectiveEmail);
  const ready = effectiveName.trim().length > 1 && !!areaKey && consent && emailOk;
  const canStart =
    ready &&
    !startDisabled &&
    !areasLoading &&
    !areasError &&
    areaOptions.length > 0 &&
    !startBusy &&
    !inviteIdentityLoading;
  const startPayload = {
    name: titleCasePersonName(effectiveName),
    email: effectiveEmail,
    areaKey,
    consent,
    phone: stripPhone(phone) || '',
    linkedinUrl: linkedinUrl.trim(),
    city: city.trim(),
    state: stateUf.trim(),
  };
  const handleSubmitStart = async () => {
    if (!canStart) return;
    setStartBusy(true);
    setStartError('');
    try {
      const err = await onStart(startPayload);
      if (err) setStartError(err);
    } catch (e) {
      console.error('Failed to start test:', e);
      setStartError(t(locale, 'candidate.startValidationError'));
    } finally {
      setStartBusy(false);
    }
  };

  return (
    <div className={SC.app}>
      <div className={SC.glow} />
      <div className={SC.card}>
        <div className="cand-flow-header mb-4">
          <span className={cn(SC.label, 'mb-0')}>{t(locale, 'candidate.brand')}</span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1 className={SC.h1}>
          {t(locale, 'candidate.mapTitle').split('\n').map((line, i) => (
            <span key={line}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </h1>
        <p className={SC.p}>
          {t(locale, 'candidate.intro').split('\n').map((line, i) => (
            <span key={line}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>

        {notice ? (
          <div
            className={cn(
              'mb-[18px] rounded-xl px-3.5 py-3',
              notice.kind === 'warning'
                ? 'border border-danger/20 bg-danger/[0.06]'
                : 'border border-ink/12 bg-ink/[0.04]'
            )}
          >
            <div
              className={cn(
                'mb-1.5 font-mono text-[11px]',
                notice.kind === 'warning' ? 'text-danger' : 'text-ink-faint'
              )}
            >
              {notice.title}
            </div>
            <div className="text-xs leading-relaxed text-ink-muted">{notice.message}</div>
          </div>
        ) : null}

        <div className="mb-7 flex flex-wrap gap-x-5 gap-y-3">
          {[
            ['54', t(locale, 'candidate.statsQuestions')],
            ['~12', t(locale, 'candidate.statsMinutes')],
            ['9', t(locale, 'candidate.statsTypes')],
            ['300', t(locale, 'candidate.statsBank')],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-xl text-brand-600 sm:text-2xl">{n}</div>
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-ink-muted">
                {l}
              </div>
            </div>
          ))}
        </div>

        <div className={SC.fields}>
        {inviteIdentityLoading ? (
          <div className={cn(SC.input, 'mb-4 text-ink-muted')}>{t(locale, 'candidate.inviteIdentityLoading')}</div>
        ) : identityLocked ? (
          <div className="mb-[18px] rounded-xl border border-brand-500/20 bg-brand-500/[0.04] px-4 py-3.5">
            <div className="mb-1.5 text-base text-ink">
              {t(locale, 'candidate.inviteHello', { name: titleCasePersonName(effectiveName).split(' ')[0] })}
            </div>
            <div className="mb-1.5 text-xs leading-relaxed text-ink-muted">
              {hrProfileBits.length > 0
                ? t(locale, 'candidate.inviteIdentityNoteWithProfile')
                : t(locale, 'candidate.inviteIdentityNote')}
            </div>
            <div className="font-mono text-[11px] text-ink-faint">
              {t(locale, 'candidate.inviteIdentityEmail', { email: effectiveEmail })}
            </div>
            {hrProfileBits.length > 0 ? (
              <div className="mt-2 font-mono text-[11px] leading-[1.55] text-ink-muted">
                {hrProfileBits.join(' · ')}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <label className={SC.fieldLabel}>{t(locale, 'candidate.fullName')}</label>
            <input
              className={SC.input}
              placeholder={t(locale, 'candidate.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setName(titleCasePersonName(name))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitStart()}
            />
          </>
        )}

        <label className={SC.fieldLabel}>{t(locale, 'candidate.area')}</label>
        {areasLoading ? (
          <div className={cn(SC.input, 'mb-4 text-ink-muted')}>{t(locale, 'candidate.loadingAreas')}</div>
        ) : areasError ? (
          <div
            className={cn(SC.input, 'mb-4 border-danger/35 bg-danger/[0.06] text-danger')}
          >
            {areasError}
          </div>
        ) : (
          <select
            value={areaKey}
            onChange={(e) => setAreaKey(e.target.value)}
            className={cn(SC.input, 'cursor-pointer appearance-none')}
          >
            {areaOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {localizeAreaLabel(a, locale)}
              </option>
            ))}
          </select>
        )}

        {!inviteIdentityLoading && !identityLocked ? (
          <>
            <label className={cn(SC.fieldLabel, 'mb-1')}>
              {requireCandidateEmail ? t(locale, 'candidate.emailRequired') : t(locale, 'candidate.emailOptional')}
            </label>
            <p className="mb-2 mt-0 text-[11px] leading-normal text-ink-faint">
              {requireCandidateEmail
                ? t(locale, 'candidate.emailHelpRequired')
                : t(locale, 'candidate.emailHelpOptional')}
            </p>
            <input
              className={cn(SC.input, 'mb-4', requireCandidateEmail && !emailOk && email.length > 0 && 'border-danger/40')}
              placeholder={t(locale, 'candidate.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode={requireCandidateEmail ? 'email' : undefined}
              autoComplete="email"
            />
          </>
        ) : null}

        {!phoneFromHr ? (
          <>
            <label className={SC.fieldLabel}>{t(locale, 'candidate.phone')}</label>
            <input
              className={SC.input}
              placeholder={t(locale, 'candidate.phonePlaceholder')}
              value={formatPhoneBr(phone)}
              onChange={(e) => setPhone(stripPhone(e.target.value) || '')}
              inputMode="tel"
              autoComplete="tel"
            />
          </>
        ) : null}

        {!linkedinFromHr ? (
          <>
            <label className={SC.fieldLabel}>{t(locale, 'candidate.linkedin')}</label>
            <input
              className={SC.input}
              placeholder={t(locale, 'candidate.linkedinPlaceholder')}
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              autoComplete="url"
            />
          </>
        ) : null}

        {!locationFromHr ? (
          <div className="flex flex-wrap gap-2.5">
            <div className="min-w-[120px] flex-[1_1_120px]">
              <label className={SC.fieldLabel}>{t(locale, 'candidate.state')}</label>
              <BrStateSelect
                value={stateUf}
                onChange={(uf) => {
                  setStateUf(uf);
                  setCity('');
                }}
                locale={locale}
                className={SC.input}
              />
            </div>
            <div className="min-w-[180px] flex-[2_1_180px]">
              <label className={SC.fieldLabel}>{t(locale, 'candidate.city')}</label>
              <BrCitySelect uf={stateUf} value={city} onChange={setCity} locale={locale} className={SC.input} />
            </div>
          </div>
        ) : null}

        <label className="mb-4 flex items-start gap-2.5 text-xs leading-normal text-ink-muted">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          {t(locale, 'candidate.consent')}
        </label>

        {startError ? (
          <div className="mb-4 rounded-xl border border-danger/20 bg-danger/[0.06] px-3.5 py-3 text-xs leading-normal text-danger">
            {startError}
          </div>
        ) : null}

        <button
          disabled={!canStart}
          className={cn(
            SC.btn,
            !canStart && 'opacity-40',
            startBusy ? 'cursor-wait' : canStart ? 'cursor-pointer' : 'cursor-not-allowed'
          )}
          onClick={handleSubmitStart}
        >
          {startBusy ? t(locale, 'common.validating') : t(locale, 'candidate.start')}
        </button>
        </div>

        <div className="mt-6 border-t border-ink/12 pt-5">
          <span className="text-[11px] text-ink-faint">{t(locale, 'candidate.manager')} </span>
          <span className="cursor-pointer text-[11px] text-brand-600 underline" onClick={() => router.push('/login')}>
            {t(locale, 'candidate.dashboardAccess')}
          </span>
        </div>
      </div>
    </div>
  );
}

function TestScreen({ name, onComplete, locale }) {
  const [questions] = useState(() => drawLocalizedQuestions(locale));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [pendingVal, setPendingVal] = useState(null);
  const [carefulMode, setCarefulMode] = useState(false);
  const [fade, setFade] = useState(false);
  const startedAtRef = useRef(Date.now());
  const copyCountRef = useRef(0);
  const q = questions[idx];
  const progress = (idx / questions.length) * 100;
  const scaleLabels = getScaleLabels(locale);

  useEffect(() => {
    const onCopyLike = () => {
      copyCountRef.current = Math.min(9999, copyCountRef.current + 1);
    };
    document.addEventListener('copy', onCopyLike);
    document.addEventListener('cut', onCopyLike);
    return () => {
      document.removeEventListener('copy', onCopyLike);
      document.removeEventListener('cut', onCopyLike);
    };
  }, []);

  const finishWithTelemetry = useCallback(
    (nextAnswers) => {
      const fillDurationMs = Math.max(0, Date.now() - startedAtRef.current);
      onComplete({
        name,
        answers: nextAnswers,
        fillDurationMs,
        copyEventCount: copyCountRef.current,
      });
    },
    [name, onComplete]
  );

  const advanceWithAnswer = useCallback(
    (val) => {
      if (fade) return;
      setFade(true);
      setTimeout(() => {
        const nextAnswers = { ...answers, [q.id]: val };
        setAnswers(nextAnswers);
        setPendingVal(null);
        if (idx < questions.length - 1) {
          setIdx((i) => i + 1);
          setSelected(null);
          setFade(false);
        } else {
          finishWithTelemetry(nextAnswers);
        }
      }, 280);
    },
    [fade, answers, q.id, idx, questions.length, finishWithTelemetry]
  );

  const chooseOption = useCallback(
    (val) => {
      if (fade) return;
      setSelected(val);
      if (carefulMode) {
        setPendingVal(val);
        return;
      }
      advanceWithAnswer(val);
    },
    [fade, carefulMode, advanceWithAnswer]
  );

  const goBack = useCallback(() => {
    if (fade) return;
    if (idx <= 0) return;
    setPendingVal(null);
    const newIdx = idx - 1;
    const pq = questions[newIdx];
    setIdx(newIdx);
    setSelected(answers[pq.id] ?? null);
    setFade(false);
  }, [fade, idx, questions, answers]);

  return (
    <div className={SC.app}>
      <div className={SC.glow} />
      <div className={cn(SC.card, 'max-w-[34rem]')}>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <span className={cn(SC.label, 'mb-0')}>
            {t(locale, 'candidate.questionProgress', { current: idx + 1, total: questions.length })}
          </span>
          <div className="flex items-center gap-3">
            {idx > 0 ? (
              <button
                type="button"
                className="cand-tap cursor-pointer rounded-lg border border-ink/12 bg-ink/[0.04] px-3 py-1.5 font-display text-xs text-ink-muted"
                onClick={goBack}
              >
                {t(locale, 'candidate.previous')}
              </button>
            ) : null}
            <span className="font-mono text-[11px] text-ink-muted">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="mb-3 h-0.5 overflow-hidden rounded-sm bg-ink/[0.08]">
          <div
            className="h-full bg-gradient-to-r from-brand-800 to-brand-600 transition-[width] duration-400"
            style={{ width: `${progress}%` }}
          />
        </div>
        <label className="mb-6 flex cursor-pointer items-center gap-2 text-[11px] text-ink-faint">
          <input
            type="checkbox"
            checked={carefulMode}
            onChange={(e) => {
              const on = e.target.checked;
              setCarefulMode(on);
              setPendingVal(null);
              if (!on) {
                setSelected(null);
              }
            }}
          />
          {t(locale, 'candidate.carefulMode')}
        </label>
        <p className={cn('cand-q-text mb-9 text-xl font-normal leading-relaxed transition-opacity duration-[280ms]', fade ? 'opacity-30' : 'opacity-100')}>
          "{q.text}"
        </p>
        <div className="flex flex-col gap-2.5">
          {scaleLabels.map((label, i) => {
            const val = i + 1;
            const isSel = selected === val;
            return (
              <button
                key={i}
                type="button"
                onClick={() => chooseOption(val)}
                className={cn(
                  'cand-scale-btn flex items-center gap-3.5 rounded-control px-[18px] py-[13px] text-left font-display text-sm',
                  fade ? 'cursor-default' : 'cursor-pointer',
                  isSel
                    ? 'border border-brand-500/50 bg-brand-500/[0.13] text-brand-600'
                    : 'border border-ink/12 bg-ink/[0.03] text-ink'
                )}
              >
                <span
                  className={cn(
                    'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-mono text-[11px]',
                    isSel ? 'border-none bg-brand-500 text-white' : 'border border-ink/12 bg-ink/[0.06] text-ink-muted'
                  )}
                >
                  {val}
                </span>
                {label}
              </button>
            );
          })}
        </div>
        {carefulMode && pendingVal !== null && !fade ? (
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" className={cn(SC.btn, 'text-[13px]')} onClick={() => advanceWithAnswer(pendingVal)}>
              {t(locale, 'candidate.confirmAdvance')}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-control border border-ink/12 bg-ink/[0.04] px-5 py-3.5 font-display text-[13px] text-ink-muted" 
              onClick={() => {
                setPendingVal(null);
                setSelected(null);
              }}
            >
              {t(locale, 'candidate.chooseAnother')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThankYouScreen({ saveError = null, onRetrySave = null, retryBusy = false, onDone, locale }) {
  return (
    <div className={SC.app}>
      <div className={SC.glow} />
      <div className={cn(SC.card, 'max-w-[560px] text-center')}>
        <span className={SC.label}>{t(locale, 'candidate.thankYouLabel')}</span>
        <h1 className={cn(SC.h1, 'mb-4 text-[32px]')}>{t(locale, 'candidate.thankYouTitle')}</h1>
        {saveError ? (
          <div className="mb-[18px] rounded-xl border border-danger/25 bg-danger/[0.08] px-3.5 py-3 text-left text-[13px] leading-normal text-danger">
            {t(locale, 'candidate.saveErrorPrefix')} {saveError}
            {onRetrySave ? (
              <div className="mt-3.5">
                <button
                  type="button"
                  disabled={retryBusy}
                  className={cn(SC.btn, retryBusy ? 'cursor-wait opacity-60' : 'cursor-pointer')}
                  onClick={onRetrySave}
                >
                  {retryBusy ? t(locale, 'candidate.sending') : t(locale, 'candidate.retrySave')}
                </button>
                <div className="mt-2.5 text-[11px] leading-normal text-ink-muted">
                  {t(locale, 'candidate.retryHelp')}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className={cn(SC.p, 'mb-8 not-italic')}>{t(locale, 'candidate.thankYouBody')}</p>
        )}
        {!saveError ? (
          <button type="button" className={SC.btn} onClick={onDone}>
            {t(locale, 'candidate.thankYouDone')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AssessmentFlow({
  companyToken = '',
  vacancyToken = '',
  inviteToken = '',
  notice = null,
  startDisabled = false,
  requireCandidateEmail = false,
  initialLocale = 'pt-BR',
}) {
  const [locale, setLocale] = useLocale(initialLocale);
  const [screen, setScreen] = useState('home'); // home | test | result
  const [candidate, setCandidate] = useState(null); // { name, email, areaKey, consent }
  const [completedOk, setCompletedOk] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [retryPayload, setRetryPayload] = useState(null);
  const [retryBusy, setRetryBusy] = useState(false);

  const handleStart = async (c) => {
    setSaveError(null);
    setRetryPayload(null);
    setCompletedOk(false);
    if (vacancyToken) {
      try {
        const params = new URLSearchParams({ token: vacancyToken, email: c.email });
        const res = await fetch(`/api/public/vacancy-link?${params.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          return body?.errorCode ? errorMessage(locale, body.errorCode, body.error) : body?.error || t(locale, 'candidate.vacancyValidationError');
        }
      } catch (e) {
        console.error('Failed to validate vacancy application:', e);
        return t(locale, 'candidate.vacancyValidationError');
      }
    }
    setCandidate(c);
    setScreen('test');
    return null;
  };

  const retrySave = useCallback(async () => {
    if (!retryPayload) return;
    setRetryBusy(true);
    let errMsg = null;
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryPayload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) errMsg = body.errorCode ? errorMessage(locale, body.errorCode, body.error) : body.error || t(locale, 'errors.HTTP_ERROR', { status: res.status });
    } catch (e) {
      console.error('Failed to resend result:', e);
      errMsg = t(locale, 'candidate.networkSaveError');
    }
    setRetryBusy(false);
    setSaveError(errMsg);
    setRetryPayload(errMsg ? retryPayload : null);
    setCompletedOk(!errMsg);
  }, [retryPayload, locale]);

  const handleComplete = async (data) => {
    const computed = computeAssessmentFromAnswers(data.answers);
    if (!computed.ok) {
      console.error(computed.error);
      setSaveError(computed.error);
      setRetryPayload(null);
      setCompletedOk(false);
      setScreen('result');
      return;
    }
    const payload = {
      ...data,
      ...candidate,
      companyToken,
      vacancyToken,
      ...(inviteToken ? { inviteToken } : {}),
      answers: data.answers,
      fillDurationMs: data.fillDurationMs,
      copyEventCount: data.copyEventCount,
    };
    let errMsg = null;
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        errMsg = body.errorCode ? errorMessage(locale, body.errorCode, body.error) : body.error || t(locale, 'errors.HTTP_ERROR', { status: res.status });
      }
    } catch (e) {
      console.error('Failed to save result:', e);
      errMsg = t(locale, 'candidate.networkSaveError');
    }
    setSaveError(errMsg);
    setRetryPayload(errMsg ? payload : null);
    setCompletedOk(!errMsg);
    setScreen('result');
  };

  if (screen === 'test') return <TestScreen name={candidate?.name || ''} onComplete={handleComplete} locale={locale} />;
  if (screen === 'result') {
    if (!completedOk && !retryPayload) {
      return (
        <div className={SC.app}>
          <div className={SC.glow} />
          <div className={SC.card}>
            <span className={SC.label}>◈ 30Team</span>
            <p className={cn(SC.p, 'mb-0')}>{saveError || t(locale, 'candidate.finishErrorFallback')}</p>
            <button
              type="button"
              className={cn(SC.btn, 'mt-6')}
              onClick={() => {
                setSaveError(null);
                setRetryPayload(null);
                setCompletedOk(false);
                setScreen('home');
              }}
            >
              {t(locale, 'common.backHome')}
            </button>
          </div>
        </div>
      );
    }
    return (
      <ThankYouScreen
        saveError={saveError}
        retryBusy={retryBusy}
        onRetrySave={retryPayload ? retrySave : null}
        locale={locale}
        onDone={() => {
          setSaveError(null);
          setRetryPayload(null);
          setCompletedOk(false);
          setScreen('home');
        }}
      />
    );
  }
  return (
    <HomeScreen
      onStart={handleStart}
      notice={notice}
      startDisabled={startDisabled}
      requireCandidateEmail={requireCandidateEmail || !!vacancyToken}
      inviteToken={inviteToken}
      vacancyToken={vacancyToken}
      locale={locale}
      setLocale={setLocale}
    />
  );
}

