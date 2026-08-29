'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOTIVATORS_DEFINITION } from '../../lib/ae/motivators-dimensions.js';
import { localizeAreaLabel } from '../../lib/i18n-data';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { titleCasePersonName } from '../../lib/person-name';
import { cn } from '../../lib/cn';
import LanguageSelect from './LanguageSelect';
import { FormField, formFieldCandLabelClass } from './FormField';

const SESSION_CFG = MOTIVATORS_DEFINITION.config;
const SESSION_QUESTIONS = SESSION_CFG.questions_per_session ?? 30;
const SESSION_MINUTES = Math.max(10, Math.round(SESSION_QUESTIONS * 0.4));


const SC = {
  app: 'cand-flow relative box-border flex min-h-screen flex-col items-center justify-center overflow-auto bg-canvas p-6 font-display text-ink [color-scheme:light]',
  glow: 'pointer-events-none fixed inset-0 bg-radial-glow',
  card: 'cand-flow-card relative z-[1] box-border w-full max-w-[34rem] rounded-[20px] border border-ink/12 bg-white px-7 py-9 shadow-card backdrop-blur-3xl sm:px-9 sm:py-10',
  label: 'mb-4 block font-mono text-2xs uppercase tracking-[3px] text-ink-label',
  h1: 'mb-3 bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text text-[clamp(26px,4.5vw,36px)] font-normal leading-[1.15] text-transparent',
  p: 'mb-7 text-base italic leading-[1.65] text-ink-muted',
  btn: 'cursor-pointer rounded-control border-none bg-gradient-to-br from-brand-500 to-brand-800 px-8 py-3.5 font-display text-sm text-white',
  input: 'ui-field box-border w-full rounded-control border border-ink/12 bg-ink/[0.04] px-4 py-3 font-display text-base text-ink',
  select: 'ui-select box-border w-full cursor-pointer rounded-control border border-ink/12 bg-ink/[0.04] px-4 py-3 font-display text-base text-ink',
  fields: 'cand-flow-fields flex flex-col gap-4',
};


function ThankYouScreen({ locale, saveError, onDone }) {
  return (
    <div className={SC.app}>
      <div className={SC.glow} />
      <div className={cn(SC.card, 'max-w-[560px] text-center')}>
        <span className={SC.label}>{t(locale, 'motivators.thankYouLabel')}</span>
        <h1 className={cn(SC.h1, 'mb-4 text-4xl')}>{t(locale, 'motivators.thankYouTitle')}</h1>
        {saveError ? <p className="mb-4 text-sm text-danger">{saveError}</p> : null}
        <p className={cn(SC.p, 'mb-8 not-italic')}>{t(locale, 'motivators.thankYouBody')}</p>
        <button type="button" className={SC.btn} onClick={onDone}>{t(locale, 'motivators.thankYouDone')}</button>
      </div>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function HomeScreen({ inviteInfo, onStart, notice, startDisabled, locale, setLocale }) {
  const [name, setName] = useState(inviteInfo?.candidateName || '');
  const [email, setEmail] = useState(inviteInfo?.candidateEmail || '');
  const [areaKey, setAreaKey] = useState('');
  const [areaOptions, setAreaOptions] = useState([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/public/areas')
      .then((r) => r.json())
      .then((d) => setAreaOptions(d.areas || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (areaOptions.length && !areaKey) setAreaKey(areaOptions[0].key);
  }, [areaOptions, areaKey]);

  useEffect(() => {
    if (inviteInfo?.candidateName) setName(inviteInfo.candidateName);
    if (inviteInfo?.candidateEmail) setEmail(inviteInfo.candidateEmail);
  }, [inviteInfo?.candidateName, inviteInfo?.candidateEmail]);

  const identityLocked = Boolean(
    inviteInfo?.candidateName?.trim()?.length > 1 &&
      inviteInfo?.candidateEmail &&
      EMAIL_RE.test(String(inviteInfo.candidateEmail).trim())
  );
  const effectiveName = identityLocked ? String(inviteInfo.candidateName) : name;
  const effectiveEmail = identityLocked ? String(inviteInfo.candidateEmail).trim().toLowerCase() : email.trim().toLowerCase();

  const ready = effectiveName.trim().length > 1 && EMAIL_RE.test(effectiveEmail) && areaKey && consent && !startDisabled;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    const err = await onStart({
      name: titleCasePersonName(effectiveName),
      email: effectiveEmail,
      areaKey,
      consent,
    });
    if (err) setError(err);
    setBusy(false);
  };

  const stats = [
    [String(SESSION_QUESTIONS), t(locale, 'motivators.statsQuestions')],
    [`~${SESSION_MINUTES}`, t(locale, 'motivators.statsMinutes')],
    ['3', t(locale, 'motivators.statsTypes')],
  ];

  return (
    <div className={SC.app}>
      <div className={SC.glow} />
      <div className={SC.card}>
        <div className="cand-flow-header mb-4">
          <span className={cn(SC.label, 'mb-0')}>{t(locale, 'motivators.brand')}</span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1 className={cn(SC.h1, 'text-[clamp(24px,6vw,40px)]')}>{t(locale, 'motivators.title')}</h1>
        <p className={SC.p}>{t(locale, 'motivators.intro', { minutes: SESSION_MINUTES })}</p>

        {notice ? (
          <div
            className={cn(
              'mb-[18px] rounded-xl px-3.5 py-3 text-xs text-ink-muted',
              notice.kind === 'warning'
                ? 'border border-danger/20 bg-danger/[0.06]'
                : 'border border-ink/12 bg-ink/[0.04]'
            )}
          >
            <strong>{notice.title}</strong>
            <div className="mt-1.5">{notice.message}</div>
          </div>
        ) : null}

        <div className="mb-7 flex flex-wrap gap-x-5 gap-y-3">
          {stats.map(([n, l]) => (
            <div key={l}>
              <div className="text-xl text-brand-600 sm:text-2xl">{n}</div>
              <div className="font-mono text-2xs uppercase tracking-[2px] text-ink-muted">{l}</div>
            </div>
          ))}
        </div>

        <div className={SC.fields}>
        {identityLocked ? (
          <div className="mb-[18px] rounded-xl border border-brand-500/20 bg-brand-500/[0.04] px-4 py-3.5">
            <div className="mb-1.5 text-base text-ink">
              {t(locale, 'motivators.inviteHello', { name: titleCasePersonName(effectiveName).split(' ')[0] })}
            </div>
            <div className="mb-1.5 text-xs leading-relaxed text-ink-muted">
              {inviteInfo?.hasHrProfile
                ? t(locale, 'motivators.inviteIdentityNoteWithProfile')
                : t(locale, 'motivators.inviteIdentityNote')}
            </div>
            <div className="font-mono text-2xs text-ink-faint">
              {t(locale, 'motivators.inviteIdentityEmail', { email: effectiveEmail })}
            </div>
          </div>
        ) : (
          <>
            <FormField label={t(locale, 'candidate.fullName')} labelClassName={formFieldCandLabelClass} className="w-full">
              <input
                className={SC.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName(titleCasePersonName(name))}
                placeholder={t(locale, 'candidate.namePlaceholder')}
              />
            </FormField>

            <FormField label={t(locale, 'motivators.emailInvite')} labelClassName={formFieldCandLabelClass} className="w-full">
              <input className={SC.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(locale, 'candidate.emailPlaceholder')} />
            </FormField>
          </>
        )}

        <FormField label={t(locale, 'motivators.areaLabel')} labelClassName={formFieldCandLabelClass} className="w-full">
          <select className={cn(SC.select, 'cursor-pointer')} value={areaKey} onChange={(e) => setAreaKey(e.target.value)}>
            {areaOptions.map((a) => (
              <option key={a.key} value={a.key}>{localizeAreaLabel(a, locale)}</option>
            ))}
          </select>
        </FormField>

        <label className="mb-4 flex gap-2.5 text-xs text-ink-muted">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t(locale, 'motivators.consent')}
        </label>

        {error ? <p className="text-prose text-danger">{error}</p> : null}

        <button type="button" disabled={!ready || busy} className={cn(SC.btn, !ready && 'opacity-45')} onClick={submit}>
          {busy ? t(locale, 'motivators.starting') : t(locale, 'motivators.startAssessment')}
        </button>
        </div>

        <p className="mt-5 text-2xs text-ink-faint">
          {t(locale, 'candidate.manager')}{' '}
          <span className="cursor-pointer text-brand-600 underline" onClick={() => router.push('/login')}>
            {t(locale, 'motivators.accessPanel')}
          </span>
        </p>
      </div>
    </div>
  );
}

function RankingChoice({ question, onConfirm, locale }) {
  const [order, setOrder] = useState([]);
  const options = question.options || [];
  const complete = order.length === options.length && options.length > 0;

  const toggle = (id) => {
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div>
      <p className="mb-4 text-xs italic text-ink-muted">
        {t(locale, 'motivators.rankingInstruction')}
      </p>
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const pos = order.indexOf(opt.id);
          const ranked = pos >= 0;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-[18px] py-3.5 text-left font-display text-sm text-ink',
                ranked
                  ? 'border border-brand-500 bg-brand-500/[0.08]'
                  : 'border border-ink/12 bg-ink/[0.03]'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-mono text-prose',
                  ranked
                    ? 'border border-brand-500 bg-brand-500 text-white'
                    : 'border border-ink/12 bg-transparent text-ink-muted'
                )}
              >
                {ranked ? pos + 1 : '+'}
              </span>
              <span>
                {opt.text}
                {ranked && pos === 0 ? (
                  <span className="mt-1 block text-2xs text-ink-muted">
                    {t(locale, 'motivators.rankingMost')}
                  </span>
                ) : null}
                {ranked && complete && pos === order.length - 1 && order.length > 1 ? (
                  <span className="mt-1 block text-2xs text-ink-muted">
                    {t(locale, 'motivators.rankingLeast')}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className={cn(
            'cand-tap border-none bg-transparent text-prose',
            order.length === 0 ? 'cursor-default text-ink-faint' : 'cursor-pointer text-ink-muted'
          )}
          disabled={order.length === 0}
          onClick={() => setOrder([])}
        >
          {t(locale, 'motivators.clearRanking')}
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={() => onConfirm(order)}
          className={cn(SC.btn, 'ml-auto', !complete && 'opacity-45')}
        >
          {t(locale, 'motivators.confirmOrder')}
        </button>
      </div>
    </div>
  );
}

function TestScreen({ questions, onComplete, locale }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [fade, setFade] = useState(false);
  const q = questions[idx];
  const progress = ((idx + 1) / questions.length) * 100;

  const advance = useCallback(
    (answerPart) => {
      if (fade) return;
      setFade(true);
      setTimeout(() => {
        setAnswers((prev) => {
          const next = { ...prev, [q.id]: { questionId: q.id, ...answerPart } };
          if (idx < questions.length - 1) {
            setIdx((i) => i + 1);
            setFade(false);
          } else {
            onComplete(Object.values(next));
          }
          return next;
        });
      }, 250);
    },
    [fade, q, idx, questions.length, onComplete]
  );

  if (!q) return null;

  return (
    <div className={SC.app}>
      <div className={SC.glow} />
      <div className={cn(SC.card, 'max-w-[700px] transition-opacity duration-200', fade ? 'opacity-60' : 'opacity-100')}>
        <span className={SC.label}>
          {t(locale, 'motivators.questionProgress', { current: idx + 1, total: questions.length })}
        </span>
        <div className="mb-6 h-1 overflow-hidden rounded-sm bg-ink/[0.08]">
          <div className="h-full rounded-sm bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="cand-q-text mb-7 text-lg leading-relaxed text-ink">{q.text}</p>

        {q.questionType === 'forced_choice' ? (
          <div className="flex flex-col gap-2.5">
            {(q.options || []).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => advance({ optionId: opt.id })}
                className="cursor-pointer rounded-xl border border-ink/12 bg-ink/[0.03] px-[18px] py-3.5 text-left font-display text-sm text-ink" 
              >
                {opt.text}
              </button>
            ))}
          </div>
        ) : q.questionType === 'ranking' ? (
          <RankingChoice key={q.id} question={q} locale={locale} onConfirm={(orderIds) => advance({ ranking: orderIds })} />
        ) : (
          <div>
            <div className="mb-3 flex justify-between gap-2 text-2xs text-ink-muted">
              <span>{q.likertScale?.minLabel || t(locale, 'motivators.likertMinShort')}</span>
              <span>{q.likertScale?.maxLabel || t(locale, 'motivators.likertMaxShort')}</span>
            </div>
            <div className="cand-likert-row">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="cand-likert-btn"
                  onClick={() => advance({ likertValue: v })}
                  className="h-12 w-12 cursor-pointer rounded-full border-2 border-brand-500/25 bg-brand-500/[0.06] text-base text-brand-800"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {idx > 0 ? (
          <button
            type="button"
            className="cand-tap mt-6 cursor-pointer border-none bg-transparent text-prose text-ink-muted"
            onClick={() => { setIdx((i) => i - 1); setFade(false); }}
          >
            {t(locale, 'candidate.previous')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function MotivatorsFlow({
  inviteToken = '',
  inviteInfo = null,
  notice = null,
  startDisabled = false,
  initialLocale = 'pt-BR',
}) {
  const [locale, setLocale] = useLocale(initialLocale);
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [submitOk, setSubmitOk] = useState(false);

  const handleStart = async (candidate) => {
    try {
      const res = await fetch('/api/ae/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken, ...candidate, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || t(locale, 'motivators.startFailed');
      setSession({ attemptId: data.attemptId, questions: data.questions });
      setScreen('test');
      return null;
    } catch {
      return t(locale, 'motivators.networkError');
    }
  };

  const handleComplete = async (answers) => {
    let errMsg = null;
    let resData = null;
    try {
      const res = await fetch('/api/ae/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: session.attemptId,
          inviteToken,
          answers,
          locale,
        }),
      });
      resData = await res.json().catch(() => ({}));
      if (!res.ok) errMsg = resData.error || t(locale, 'motivators.saveFailed');
    } catch {
      errMsg = t(locale, 'motivators.networkSaveError');
    }
    setSaveError(errMsg);
    setSubmitOk(Boolean(resData?.ok));
    setScreen('result');
  };

  if (screen === 'test' && session) {
    return <TestScreen questions={session.questions} onComplete={handleComplete} locale={locale} />;
  }
  if (screen === 'result') {
    if (!submitOk && saveError) {
      return (
        <div className={SC.app}>
          <div className={SC.glow} />
          <div className={SC.card}>
            <p className={SC.p}>{saveError}</p>
            <button type="button" className={SC.btn} onClick={() => setScreen('home')}>{t(locale, 'common.back')}</button>
          </div>
        </div>
      );
    }
    return (
      <ThankYouScreen
        locale={locale}
        saveError={saveError}
        onDone={() => { setScreen('home'); setSubmitOk(false); setSession(null); }}
      />
    );
  }
  return (
    <HomeScreen
      inviteInfo={inviteInfo}
      onStart={handleStart}
      notice={notice}
      startDisabled={startDisabled}
      locale={locale}
      setLocale={setLocale}
    />
  );
}
