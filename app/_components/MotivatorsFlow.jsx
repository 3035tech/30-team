'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { localizeAreaLabel } from '../../lib/i18n-data';
import { C, FONTS, GRADIENT, RADIAL_GLOW, SHADOW } from '../../lib/theme';
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

const Bar = ({ value, max = 100, color, h = 8 }) => (
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
    const err = await onStart({ name: name.trim(), email: email.trim().toLowerCase(), areaKey, consent });
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div style={S.app}>
      <div style={S.glow} />
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ ...S.label, marginBottom: 0 }}>◈ Motivadores</span>
          <LanguageSelect locale={locale} onChange={setLocale} compact />
        </div>
        <h1 style={S.h1}>Assessment de Motivadores Profissionais</h1>
        <p style={S.p}>
          Descubra o que mais motiva você no trabalho — reconhecimento, autonomia, crescimento e muito mais.
          Não é um teste de personalidade. Reserve cerca de 15 minutos.
        </p>

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
          {[['48', 'Perguntas'], ['~15', 'Minutos'], ['200', 'Banco']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: '22px', color: C.purpleLight }}>{n}</div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>{l}</div>
            </div>
          ))}
        </div>

        <label style={{ fontSize: '12px', color: C.muted }}>Nome completo</label>
        <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />

        <label style={{ fontSize: '12px', color: C.muted }}>E-mail (do convite)</label>
        <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />

        <label style={{ fontSize: '12px', color: C.muted }}>Área / função</label>
        <select style={{ ...S.input, cursor: 'pointer' }} value={areaKey} onChange={(e) => setAreaKey(e.target.value)}>
          {areaOptions.map((a) => (
            <option key={a.key} value={a.key}>{localizeAreaLabel(a, locale)}</option>
          ))}
        </select>

        <label style={{ display: 'flex', gap: '10px', fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Concordo com o uso dos meus dados conforme a política de privacidade da empresa.
        </label>

        {error ? <p style={{ color: C.tension, fontSize: '13px' }}>{error}</p> : null}

        <button type="button" disabled={!ready || busy} style={{ ...S.btn(), opacity: ready ? 1 : 0.45 }} onClick={submit}>
          {busy ? 'Iniciando…' : 'Iniciar assessment'}
        </button>

        <p style={{ marginTop: '20px', fontSize: '11px', color: C.faint }}>
          Gestor?{' '}
          <span style={{ color: C.purpleLight, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/login')}>
            Acessar painel
          </span>
        </p>
      </div>
    </div>
  );
}

function TestScreen({ questions, onComplete }) {
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
        const next = { ...answers, [q.id]: { questionId: q.id, ...answerPart } };
        setAnswers(next);
        if (idx < questions.length - 1) {
          setIdx((i) => i + 1);
          setFade(false);
        } else {
          onComplete(Object.values(next));
        }
      }, 250);
    },
    [fade, answers, q, idx, questions.length, onComplete]
  );

  if (!q) return null;

  return (
    <div style={S.app}>
      <div style={S.glow} />
      <div style={{ ...S.card, maxWidth: '700px', opacity: fade ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <span style={S.label}>
          Pergunta {idx + 1} de {questions.length}
        </span>
        <div style={{ height: '4px', background: 'rgba(26,22,37,.08)', borderRadius: 2, marginBottom: '24px' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: C.purple, borderRadius: 2 }} />
        </div>
        <p style={{ fontSize: '17px', lineHeight: 1.6, marginBottom: '28px', color: C.text }}>{q.text}</p>

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
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.muted, marginBottom: '12px' }}>
              <span>{q.likertScale?.minLabel || 'Discordo'}</span>
              <span>{q.likertScale?.maxLabel || 'Concordo'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
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
            style={{ marginTop: '24px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px' }}
            onClick={() => { setIdx((i) => i - 1); setFade(false); }}
          >
            ← Anterior
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ResultScreen({ result, saveError, onRestart }) {
  const maxScore = Math.max(...(result.ranking || []).map((r) => r.score), 1);
  return (
    <div style={S.app}>
      <div style={S.glow} />
      <div style={{ ...S.card, maxWidth: '720px' }}>
        <span style={S.label}>Seu perfil de motivadores</span>
        <h1 style={{ ...S.h1, fontSize: '32px' }}>Resultado</h1>

        {saveError ? <p style={{ color: C.tension, marginBottom: '16px' }}>{saveError}</p> : null}

        <p style={{ ...S.p, fontStyle: 'normal', marginBottom: '24px' }}>{result.profileSummary}</p>

        <div style={{ marginBottom: '28px' }}>
          {(result.ranking || []).map((dim) => (
            <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ width: '130px', fontSize: '12px', color: dim.color, fontFamily: 'monospace' }}>{dim.label}</span>
              <div style={{ flex: 1 }}><Bar value={dim.score} max={maxScore} color={dim.color} /></div>
              <span style={{ width: '32px', textAlign: 'right', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>{dim.score}</span>
            </div>
          ))}
        </div>

        {result.managerRecommendations ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: `${C.synergy}0a`, border: `1px solid ${C.synergy}33` }}>
              <div style={{ fontSize: '11px', color: C.synergy, marginBottom: '10px', fontFamily: 'monospace' }}>Para seu gestor — Faça</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: C.muted, lineHeight: 1.6 }}>
                {(result.managerRecommendations.do || []).map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <div style={{ padding: '16px', borderRadius: '12px', background: `${C.tension}08`, border: `1px solid ${C.tension}33` }}>
              <div style={{ fontSize: '11px', color: C.tension, marginBottom: '10px', fontFamily: 'monospace' }}>Evite</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: C.muted, lineHeight: 1.6 }}>
                {(result.managerRecommendations.avoid || []).map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
        ) : null}

        <button type="button" style={S.btn()} onClick={onRestart}>Concluir</button>
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
  const [locale, setLocale] = useState(initialLocale);
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const handleStart = async (candidate) => {
    try {
      const res = await fetch('/api/ae/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken, ...candidate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || 'Não foi possível iniciar.';
      setSession({ attemptId: data.attemptId, questions: data.questions });
      setScreen('test');
      return null;
    } catch {
      return 'Falha de rede. Tente novamente.';
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
      if (!res.ok) errMsg = resData.error || 'Erro ao salvar.';
    } catch {
      errMsg = 'Falha de rede ao salvar.';
    }
    setSaveError(errMsg);
    setResult(resData?.ok ? resData : null);
    setScreen('result');
  };

  if (screen === 'test' && session) {
    return <TestScreen questions={session.questions} onComplete={handleComplete} />;
  }
  if (screen === 'result') {
    if (!result && saveError) {
      return (
        <div style={S.app}>
          <div style={S.glow} />
          <div style={S.card}>
            <p style={S.p}>{saveError}</p>
            <button type="button" style={S.btn()} onClick={() => setScreen('home')}>Voltar</button>
          </div>
        </div>
      );
    }
    return (
      <ResultScreen
        result={result}
        saveError={saveError}
        onRestart={() => { setScreen('home'); setResult(null); setSession(null); }}
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
