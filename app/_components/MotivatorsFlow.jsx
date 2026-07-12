'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOTIVATORS_DEFINITION } from '../../lib/ae/motivators-dimensions.js';
import { localizeAreaLabel } from '../../lib/i18n-data';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { titleCasePersonName } from '../../lib/person-name';
import { C, FONTS, GRADIENT, RADIAL_GLOW, SHADOW } from '../../lib/theme';
import LanguageSelect from './LanguageSelect';

const SESSION_CFG = MOTIVATORS_DEFINITION.config;
const SESSION_QUESTIONS = SESSION_CFG.questions_per_session ?? 30;
const SESSION_MINUTES = Math.max(10, Math.round(SESSION_QUESTIONS * 0.4));

const S = {
  app: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: FONTS.serif,
    color: C.text,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'auto',
    boxSizing: 'border-box',
  },
  glow: { position: 'fixed', inset: 0, pointerEvents: 'none', background: RADIAL_GLOW },
  card: {
    maxWidth: '660px',
    width: '100%',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '20px',
    padding: '44px 48px',
    backdropFilter: 'blur(24px)',
    boxShadow: SHADOW.cardElevated,
    position: 'relative',
    zIndex: 1,
    boxSizing: 'border-box',
  },
  label: {
    fontSize: '10px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: 'rgba(124,58,237,.55)',
    fontFamily: FONTS.mono,
    marginBottom: '16px',
    display: 'block',
  },
  h1: {
    fontSize: 'clamp(26px,5vw,40px)',
    fontWeight: 'normal',
    lineHeight: 1.15,
    marginBottom: '12px',
    background: GRADIENT.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  p: { fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '28px', fontStyle: 'italic' },
  input: {
    width: '100%',
    background: 'rgba(26,22,37,.04)',
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    padding: '14px 18px',
    color: C.text,
    fontSize: '15px',
    fontFamily: FONTS.serif,
    boxSizing: 'border-box',
    marginBottom: '16px',
  },
  btn: (bg = C.purple) => ({
    background: GRADIENT.primaryBtn(bg, C.purpleDark),
    border: 'none',
    borderRadius: '10px',
    padding: '14px 32px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: FONTS.serif,
  }),
};

function ThankYouScreen({ locale, saveError, onDone }) {
  return (
    <div className="cand-flow" style={S.app}>
      <div style={S.glow} />
      <div className="cand-flow-card" style={{ ...S.card, maxWidth: '560px', textAlign: 'center' }}>
        <span style={S.label}>{t(locale, 'motivators.thankYouLabel')}</span>
        <h1 style={{ ...S.h1, fontSize: '32px', marginBottom: '16px' }}>{t(locale, 'motivators.thankYouTitle')}</h1>
        {saveError ? <p style={{ color: C.tension, marginBottom: '16px', fontSize: '14px' }}>{saveError}</p> : null}
        <p style={{ ...S.p, fontStyle: 'normal', marginBottom: '32px' }}>{t(locale, 'motivators.thankYouBody')}</p>
        <button type="button" style={S.btn()} onClick={onDone}>{t(locale, 'motivators.thankYouDone')}</button>
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

  const ready = name.trim().length > 1 && EMAIL_RE.test(email.trim()) && areaKey && consent && !startDisabled;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    const err = await onStart({ name: titleCasePersonName(name), email: email.trim().toLowerCase(), areaKey, consent });
    if (err) setError(err);
    setBusy(false);
  };

  const stats = [
    [String(SESSION_QUESTIONS), t(locale, 'motivators.statsQuestions')],
    [`~${SESSION_MINUTES}`, t(locale, 'motivators.statsMinutes')],
    ['3', t(locale, 'motivators.statsTypes')],
  ];

  return (
    <div className="cand-flow" style={S.app}>
      <div style={S.glow} />
      <div className="cand-flow-card" style={S.card}>
        <div className="cand-flow-header" style={{ marginBottom: '16px' }}>
          <span style={{ ...S.label, marginBottom: 0 }}>{t(locale, 'motivators.brand')}</span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1 style={{ ...S.h1, fontSize: 'clamp(24px, 6vw, 40px)' }}>{t(locale, 'motivators.title')}</h1>
        <p style={S.p}>{t(locale, 'motivators.intro', { minutes: SESSION_MINUTES })}</p>

        {notice ? (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              background: notice.kind === 'warning' ? 'rgba(232,71,71,.06)' : 'rgba(26,22,37,.04)',
              border: `1px solid ${notice.kind === 'warning' ? 'rgba(232,71,71,.22)' : C.border}`,
              borderRadius: '12px',
              fontSize: '12px',
              color: C.muted,
            }}
          >
            <strong>{notice.title}</strong>
            <div style={{ marginTop: '6px' }}>{notice.message}</div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '24px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {stats.map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: '22px', color: C.purpleLight }}>{n}</div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>{l}</div>
            </div>
          ))}
        </div>

        <label style={{ fontSize: '12px', color: C.muted }}>{t(locale, 'candidate.fullName')}</label>
        <input
          style={S.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setName(titleCasePersonName(name))}
          placeholder={t(locale, 'candidate.namePlaceholder')}
        />

        <label style={{ fontSize: '12px', color: C.muted }}>{t(locale, 'motivators.emailInvite')}</label>
        <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(locale, 'candidate.emailPlaceholder')} />

        <label style={{ fontSize: '12px', color: C.muted }}>{t(locale, 'motivators.areaLabel')}</label>
        <select style={{ ...S.input, cursor: 'pointer' }} value={areaKey} onChange={(e) => setAreaKey(e.target.value)}>
          {areaOptions.map((a) => (
            <option key={a.key} value={a.key}>{localizeAreaLabel(a, locale)}</option>
          ))}
        </select>

        <label style={{ display: 'flex', gap: '10px', fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t(locale, 'motivators.consent')}
        </label>

        {error ? <p style={{ color: C.tension, fontSize: '13px' }}>{error}</p> : null}

        <button type="button" disabled={!ready || busy} style={{ ...S.btn(), opacity: ready ? 1 : 0.45 }} onClick={submit}>
          {busy ? t(locale, 'motivators.starting') : t(locale, 'motivators.startAssessment')}
        </button>

        <p style={{ marginTop: '20px', fontSize: '11px', color: C.faint }}>
          {t(locale, 'candidate.manager')}{' '}
          <span style={{ color: C.purpleLight, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/login')}>
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
      <p style={{ fontSize: '12px', color: C.muted, marginBottom: '16px', fontStyle: 'italic' }}>
        {t(locale, 'motivators.rankingInstruction')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {options.map((opt) => {
          const pos = order.indexOf(opt.id);
          const ranked = pos >= 0;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                padding: '14px 18px',
                borderRadius: '12px',
                border: `1px solid ${ranked ? C.purple : C.border}`,
                background: ranked ? 'rgba(124,58,237,.08)' : 'rgba(26,22,37,.03)',
                cursor: 'pointer',
                fontSize: '14px',
                color: C.text,
                fontFamily: FONTS.serif,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontFamily: FONTS.mono,
                  border: `1px solid ${ranked ? C.purple : C.border}`,
                  background: ranked ? C.purple : 'transparent',
                  color: ranked ? '#fff' : C.muted,
                }}
              >
                {ranked ? pos + 1 : '+'}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' }}>
        <button
          type="button"
          className="cand-tap"
          disabled={order.length === 0}
          onClick={() => setOrder([])}
          style={{
            background: 'none',
            border: 'none',
            color: order.length === 0 ? C.faint : C.muted,
            cursor: order.length === 0 ? 'default' : 'pointer',
            fontSize: '13px',
          }}
        >
          {t(locale, 'motivators.clearRanking')}
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={() => onConfirm(order)}
          style={{ ...S.btn(), opacity: complete ? 1 : 0.45, marginLeft: 'auto' }}
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
    <div className="cand-flow" style={S.app}>
      <div style={S.glow} />
      <div className="cand-flow-card" style={{ ...S.card, maxWidth: '700px', opacity: fade ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <span style={S.label}>
          {t(locale, 'motivators.questionProgress', { current: idx + 1, total: questions.length })}
        </span>
        <div style={{ height: '4px', background: 'rgba(26,22,37,.08)', borderRadius: 2, marginBottom: '24px' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: C.purple, borderRadius: 2 }} />
        </div>
        <p className="cand-q-text" style={{ fontSize: '17px', lineHeight: 1.6, marginBottom: '28px', color: C.text }}>{q.text}</p>

        {q.questionType === 'forced_choice' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(q.options || []).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => advance({ optionId: opt.id })}
                style={{
                  textAlign: 'left',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: `1px solid ${C.border}`,
                  background: 'rgba(26,22,37,.03)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: C.text,
                  fontFamily: FONTS.serif,
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>
        ) : q.questionType === 'ranking' ? (
          <RankingChoice key={q.id} question={q} locale={locale} onConfirm={(orderIds) => advance({ ranking: orderIds })} />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.muted, marginBottom: '12px', gap: '8px' }}>
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
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: `2px solid ${C.purple}44`,
                    background: 'rgba(124,58,237,.06)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: C.purpleDark,
                  }}
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
            className="cand-tap"
            style={{ marginTop: '24px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px' }}
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
        body: JSON.stringify({ attemptId: session.attemptId, answers, locale }),
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
        <div className="cand-flow" style={S.app}>
          <div style={S.glow} />
          <div className="cand-flow-card" style={S.card}>
            <p style={S.p}>{saveError}</p>
            <button type="button" style={S.btn()} onClick={() => setScreen('home')}>{t(locale, 'common.back')}</button>
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
