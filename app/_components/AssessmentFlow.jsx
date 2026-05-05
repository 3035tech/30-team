'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { computeAssessmentFromAnswers } from '../../lib/assessment-score';
import { drawLocalizedQuestions, getScaleLabels, getTypeData, localizeAreaLabel } from '../../lib/i18n-data';
import { errorMessage, t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { C, FONTS, RADIAL_GLOW, GRADIENT, SHADOW } from '../../lib/theme';
import LanguageSelect from './LanguageSelect';

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
    overflow: 'hidden',
  },
  glow: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    background: RADIAL_GLOW,
  },
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
    fontSize: 'clamp(28px,5vw,44px)',
    fontWeight: 'normal',
    lineHeight: 1.15,
    marginBottom: '12px',
    background: GRADIENT.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  p: { fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '32px', fontStyle: 'italic' },
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
};

const Bar = ({ value, max, color, h = 6 }) => (
  <div style={{ width: '100%', height: h, background: 'rgba(26,22,37,.08)', borderRadius: h / 2, overflow: 'hidden' }}>
    <div
      style={{
        height: '100%',
        width: `${(value / Math.max(max, 1)) * 100}%`,
        background: `linear-gradient(90deg,${color}99,${color})`,
        borderRadius: h / 2,
      }}
    />
  </div>
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function HomeScreen({ onStart, notice = null, startDisabled = false, requireCandidateEmail = false, locale, setLocale }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [areaKey, setAreaKey] = useState('');
  const [areaOptions, setAreaOptions] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState('');
  const [consent, setConsent] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [startError, setStartError] = useState('');
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
    if (areaOptions.length === 0) return;
    setAreaKey((k) => (k && areaOptions.some((a) => a.key === k) ? k : areaOptions[0].key));
  }, [areaOptions]);

  const emailOk = !requireCandidateEmail || EMAIL_RE.test(email.trim());
  const ready = name.trim().length > 1 && !!areaKey && consent && emailOk;
  const canStart = ready && !startDisabled && !areasLoading && !areasError && areaOptions.length > 0 && !startBusy;
  const startPayload = { name: name.trim(), email: email.trim(), areaKey, consent };
  const handleSubmitStart = async () => {
    if (!canStart) return;
    setStartBusy(true);
    setStartError('');
    try {
      const err = await onStart(startPayload);
      if (err) setStartError(err);
    } catch (e) {
      console.error('Erro ao iniciar teste:', e);
      setStartError(t(locale, 'candidate.startValidationError'));
    } finally {
      setStartBusy(false);
    }
  };

  return (
    <div style={S.app}>
      <div style={S.glow} />
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ ...S.label, marginBottom: 0 }}>{t(locale, 'candidate.brand')}</span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1 style={S.h1}>
          {t(locale, 'candidate.mapTitle').split('\n').map((line, i) => (
            <span key={line}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </h1>
        <p style={S.p}>
          {t(locale, 'candidate.intro').split('\n').map((line, i) => (
            <span key={line}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>

        {notice ? (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              background: notice.kind === 'warning' ? 'rgba(232,71,71,.06)' : 'rgba(26,22,37,.04)',
              border: notice.kind === 'warning' ? '1px solid rgba(232,71,71,.22)' : `1px solid ${C.border}`,
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: notice.kind === 'warning' ? C.tension : C.faint,
                fontFamily: 'monospace',
                marginBottom: '6px',
              }}
            >
              {notice.title}
            </div>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>{notice.message}</div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '28px', marginBottom: '36px', flexWrap: 'wrap' }}>
          {[
            ['54', t(locale, 'candidate.statsQuestions')],
            ['~12', t(locale, 'candidate.statsMinutes')],
            ['9', t(locale, 'candidate.statsTypes')],
            ['300', t(locale, 'candidate.statsBank')],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: '24px', color: C.purpleLight }}>{n}</div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {l}
              </div>
            </div>
          ))}
        </div>

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}>{t(locale, 'candidate.fullName')}</label>
        <input
          style={S.input}
          placeholder={t(locale, 'candidate.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmitStart()}
        />

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}>{t(locale, 'candidate.area')}</label>
        {areasLoading ? (
          <div style={{ ...S.input, color: C.muted, marginBottom: '16px' }}>{t(locale, 'candidate.loadingAreas')}</div>
        ) : areasError ? (
          <div
            style={{
              ...S.input,
              borderColor: 'rgba(232,71,71,.35)',
              background: 'rgba(232,71,71,.06)',
              color: '#b91c1c',
              marginBottom: '16px',
            }}
          >
            {areasError}
          </div>
        ) : (
          <select
            value={areaKey}
            onChange={(e) => setAreaKey(e.target.value)}
            style={{ ...S.input, appearance: 'none', cursor: 'pointer' }}
          >
            {areaOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {localizeAreaLabel(a, locale)}
              </option>
            ))}
          </select>
        )}

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '4px' }}>
          {requireCandidateEmail ? t(locale, 'candidate.emailRequired') : t(locale, 'candidate.emailOptional')}
        </label>
        <p style={{ fontSize: '11px', color: C.faint, lineHeight: 1.5, margin: '0 0 8px' }}>
          {requireCandidateEmail
            ? t(locale, 'candidate.emailHelpRequired')
            : t(locale, 'candidate.emailHelpOptional')}
        </p>
        <input
          style={{ ...S.input, marginBottom: '16px', borderColor: requireCandidateEmail && !emailOk && email.length > 0 ? 'rgba(232,71,71,.4)' : undefined }}
          placeholder={t(locale, 'candidate.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode={requireCandidateEmail ? 'email' : undefined}
          autoComplete="email"
        />

        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12px', color: C.muted, lineHeight: 1.5, marginBottom: '16px' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '2px' }} />
          {t(locale, 'candidate.consent')}
        </label>

        {startError ? (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 14px',
              background: 'rgba(232,71,71,.06)',
              border: '1px solid rgba(232,71,71,.22)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#b91c1c',
              lineHeight: 1.5,
            }}
          >
            {startError}
          </div>
        ) : null}

        <button
          disabled={!canStart}
          style={{
            ...S.btn(),
            opacity: canStart ? 1 : 0.4,
            cursor: startBusy ? 'wait' : canStart ? 'pointer' : 'not-allowed',
          }}
          onClick={handleSubmitStart}
        >
          {startBusy ? t(locale, 'common.validating') : t(locale, 'candidate.start')}
        </button>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: '11px', color: C.faint }}>{t(locale, 'candidate.manager')} </span>
          <span style={{ fontSize: '11px', color: C.purpleLight, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/login')}>
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
  const q = questions[idx];
  const progress = (idx / questions.length) * 100;
  const scaleLabels = getScaleLabels(locale);

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
          onComplete({ name, answers: nextAnswers });
        }
      }, 280);
    },
    [fade, answers, q.id, idx, questions.length, name, onComplete]
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
    <div style={S.app}>
      <div style={S.glow} />
      <div style={{ ...S.card, maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ ...S.label, marginBottom: 0 }}>
            {t(locale, 'candidate.questionProgress', { current: idx + 1, total: questions.length })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {idx > 0 ? (
              <button
                type="button"
                onClick={goBack}
                style={{
                  background: 'rgba(26,22,37,.04)',
                  border: `1px solid ${C.border}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: C.muted,
                  cursor: 'pointer',
                  fontFamily: FONTS.serif,
                }}
              >
                {t(locale, 'candidate.previous')}
              </button>
            ) : null}
            <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>{Math.round(progress)}%</span>
          </div>
        </div>
        <div style={{ height: '2px', background: 'rgba(26,22,37,.08)', borderRadius: '1px', marginBottom: '12px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg,${C.purpleDark},${C.purpleLight})`,
              transition: 'width .4s',
            }}
          />
        </div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: C.faint, marginBottom: '24px', cursor: 'pointer' }}>
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
        <p style={{ fontSize: '20px', lineHeight: 1.6, marginBottom: '36px', fontWeight: 'normal', opacity: fade ? 0.3 : 1, transition: 'opacity .28s' }}>
          "{q.text}"
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {scaleLabels.map((label, i) => {
            const val = i + 1;
            const isSel = selected === val;
            return (
              <button
                key={i}
                type="button"
                onClick={() => chooseOption(val)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '13px 18px',
                  background: isSel ? `${C.purple}22` : 'rgba(26,22,37,.03)',
                  border: isSel ? `1px solid ${C.purple}88` : `1px solid ${C.border}`,
                  borderRadius: '10px',
                  cursor: fade ? 'default' : 'pointer',
                  color: isSel ? C.purpleLight : C.text,
                  fontSize: '14px',
                  fontFamily: FONTS.serif,
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSel ? C.purple : 'rgba(26,22,37,.06)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: isSel ? '#fff' : C.muted,
                    border: isSel ? 'none' : `1px solid ${C.border}`,
                  }}
                >
                  {val}
                </span>
                {label}
              </button>
            );
          })}
        </div>
        {carefulMode && pendingVal !== null && !fade ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
            <button type="button" style={{ ...S.btn(), fontSize: '13px' }} onClick={() => advanceWithAnswer(pendingVal)}>
              {t(locale, 'candidate.confirmAdvance')}
            </button>
            <button
              type="button"
              style={{
                background: 'rgba(26,22,37,.04)',
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                padding: '14px 20px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: FONTS.serif,
                color: C.muted,
              }}
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

function ResultScreen({ result, onRestart, saveError = null, onRetrySave = null, retryBusy = false, locale }) {
  const { name, scores, topType } = result;
  const typeData = getTypeData(locale);
  const d = typeData[topType];
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([t, s]) => ({ type: parseInt(t), score: s }));
  const maxScore = sorted[0].score;
  const second = sorted[1];

  return (
    <div style={{ ...S.app, justifyContent: 'flex-start', paddingTop: '40px' }}>
      <div style={S.glow} />
      <div style={{ ...S.card, maxWidth: '700px' }}>
        <span style={S.label}>{t(locale, 'candidate.resultFor', { name: name.split(' ')[0] })}</span>
        {saveError ? (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              background: 'rgba(232,71,71,.08)',
              border: '1px solid rgba(232,71,71,.25)',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#b91c1c',
              lineHeight: 1.5,
            }}
          >
            {t(locale, 'candidate.saveErrorPrefix')} {saveError}
            {onRetrySave ? (
              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  disabled={retryBusy}
                  style={{
                    ...S.btn(),
                    opacity: retryBusy ? 0.6 : 1,
                    cursor: retryBusy ? 'wait' : 'pointer',
                  }}
                  onClick={onRetrySave}
                >
                  {retryBusy ? t(locale, 'candidate.sending') : t(locale, 'candidate.retrySave')}
                </button>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '10px', lineHeight: 1.5 }}>
                  {t(locale, 'candidate.retryHelp')}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '42px', marginBottom: '4px' }}>{d.emoji}</div>
          <div style={{ fontSize: '13px', color: C.muted, fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            {t(locale, 'candidate.type', { type: topType })}
          </div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 'normal', color: d.color, marginBottom: '16px' }}>{d.name}</h2>
          <p style={{ ...S.p, marginBottom: 0 }}>{d.desc}</p>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px', marginBottom: '22px' }}>
          <span style={S.label}>{t(locale, 'candidate.strengths')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {d.strengths.map((s) => (
              <span key={s} style={{ padding: '5px 13px', background: `${d.color}15`, border: `1px solid ${d.color}40`, borderRadius: '20px', fontSize: '12px', color: d.color }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px', marginBottom: '22px' }}>
          <span style={S.label}>{t(locale, 'candidate.challenge')}</span>
          <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>"{d.challenge}"</p>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px', marginBottom: '22px' }}>
          <span style={S.label}>{t(locale, 'candidate.profileByType')}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sorted.map(({ type, score }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '90px', fontSize: '11px', color: typeData[type].color, fontFamily: 'monospace', flexShrink: 0 }}>
                  {typeData[type].emoji} T{type}
                </span>
                <div style={{ flex: 1 }}>
                  <Bar value={score} max={maxScore} color={typeData[type].color} />
                </div>
                <span style={{ width: '24px', fontSize: '11px', color: C.muted, textAlign: 'right', fontFamily: 'monospace' }}>{score}</span>
              </div>
            ))}
          </div>
        </div>

        {second ? (
          <div style={{ background: `${d.color}0a`, border: `1px solid ${d.color}25`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <span style={{ ...S.label, marginBottom: '6px', color: `${d.color}80` }}>{t(locale, 'candidate.wing')}</span>
            <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, margin: 0 }}>
              {t(locale, 'candidate.wingText', { typeName: typeData[second.type].name })}
            </p>
          </div>
        ) : null}

        <div style={{ background: `${d.color}0a`, border: `1px solid ${d.color}25`, borderRadius: '12px', padding: '16px 20px', marginBottom: '28px' }}>
          <span style={{ ...S.label, marginBottom: '6px', color: `${d.color}80` }}>{t(locale, 'candidate.teamContribution')}</span>
          <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.7, margin: 0 }}>{d.team}</p>
        </div>

        <button style={{ ...S.btn(), fontSize: '13px' }} onClick={onRestart}>
          {t(locale, 'common.backHome')}
        </button>
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
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [retryPayload, setRetryPayload] = useState(null);
  const [retryBusy, setRetryBusy] = useState(false);

  const handleStart = async (c) => {
    setSaveError(null);
    setRetryPayload(null);
    if (vacancyToken) {
      try {
        const params = new URLSearchParams({ token: vacancyToken, email: c.email });
        const res = await fetch(`/api/public/vacancy-link?${params.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          return body?.errorCode ? errorMessage(locale, body.errorCode, body.error) : body?.error || t(locale, 'candidate.vacancyValidationError');
        }
      } catch (e) {
        console.error('Erro ao validar inscrição da vaga:', e);
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
      if (!res.ok) errMsg = body.errorCode ? errorMessage(locale, body.errorCode, body.error) : body.error || `Erro ${res.status}`;
    } catch (e) {
      console.error('Erro ao reenviar resultado:', e);
      errMsg = 'Falha de rede ao salvar';
    }
    setRetryBusy(false);
    setSaveError(errMsg);
    setRetryPayload(errMsg ? retryPayload : null);
  }, [retryPayload, locale]);

  const handleComplete = async (data) => {
    const computed = computeAssessmentFromAnswers(data.answers);
    if (!computed.ok) {
      console.error(computed.error);
      setSaveError(computed.error);
      setRetryPayload(null);
      setResult(null);
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
        errMsg = body.errorCode ? errorMessage(locale, body.errorCode, body.error) : body.error || `Erro ${res.status}`;
      }
    } catch (e) {
      console.error('Erro ao salvar resultado:', e);
      errMsg = 'Falha de rede ao salvar';
    }
    setSaveError(errMsg);
    setRetryPayload(errMsg ? payload : null);
    setResult({ name: candidate?.name || data.name || '', scores: computed.scores, topType: computed.topType });
    setScreen('result');
  };

  if (screen === 'test') return <TestScreen name={candidate?.name || ''} onComplete={handleComplete} locale={locale} />;
  if (screen === 'result') {
    if (!result) {
      return (
        <div style={S.app}>
          <div style={S.glow} />
          <div style={S.card}>
            <span style={S.label}>◈ 30Team</span>
            <p style={{ ...S.p, marginBottom: 0 }}>{saveError || t(locale, 'candidate.finishErrorFallback')}</p>
            <button
              type="button"
              style={{ ...S.btn(), marginTop: '24px' }}
              onClick={() => {
                setSaveError(null);
                setRetryPayload(null);
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
      <ResultScreen
        result={result}
        saveError={saveError}
        retryBusy={retryBusy}
        onRetrySave={retryPayload ? retrySave : null}
        locale={locale}
        onRestart={() => {
          setSaveError(null);
          setRetryPayload(null);
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
      locale={locale}
      setLocale={setLocale}
    />
  );
}

