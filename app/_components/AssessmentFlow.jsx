'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TYPE_DATA, drawQuestions, SCALE_LABELS } from '../../lib/data';
import { computeAssessmentFromAnswers } from '../../lib/assessment-score';
import { C, FONTS, RADIAL_GLOW, GRADIENT, SHADOW } from '../../lib/theme';

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

function HomeScreen({ onStart, notice = null, startDisabled = false, requireCandidateEmail = false }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [areaKey, setAreaKey] = useState('');
  const [areaOptions, setAreaOptions] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState('');
  const [consent, setConsent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/areas');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Não foi possível carregar as áreas.');
        if (!cancelled) {
          setAreaOptions(Array.isArray(data.areas) ? data.areas : []);
          setAreasError('');
        }
      } catch (e) {
        if (!cancelled) setAreasError(e?.message || 'Erro ao carregar áreas.');
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
  const canStart = ready && !startDisabled && !areasLoading && !areasError && areaOptions.length > 0;

  return (
    <div style={S.app}>
      <div style={S.glow} />
      <div style={S.card}>
        <span style={S.label}>◈ 30Team</span>
        <h1 style={S.h1}>
          Mapa de
          <br />
          Perfil
        </h1>
        <p style={S.p}>
          Um retrato rápido do seu estilo de trabalho.
          <br />
          Descubra padrões de motivação, tomada de decisão e colaboração.
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
            ['54', 'questões'],
            ['~12', 'minutos'],
            ['9', 'tipos'],
            ['300', 'banco de perguntas'],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: '24px', color: C.purpleLight }}>{n}</div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {l}
              </div>
            </div>
          ))}
        </div>

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}>Seu nome completo</label>
        <input
          style={S.input}
          placeholder="Ex: Maria Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ready && onStart({ name: name.trim(), email: email.trim(), areaKey, consent })}
        />

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}>Área (vaga)</label>
        {areasLoading ? (
          <div style={{ ...S.input, color: C.muted, marginBottom: '16px' }}>Carregando áreas…</div>
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
                {a.label}
              </option>
            ))}
          </select>
        )}

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '4px' }}>
          {requireCandidateEmail ? 'E-mail (obrigatório neste link · contato do RH)' : 'E-mail (opcional)'}
        </label>
        <p style={{ fontSize: '11px', color: C.faint, lineHeight: 1.5, margin: '0 0 8px' }}>
          {requireCandidateEmail
            ? 'A empresa configurou este link para exigir e-mail e poder retornar sobre seu processo.'
            : 'Opcional para reduzir dados pessoais. Sem e-mail, o RH pode ter mais dificuldade para contato; alguns links de empresa ou vaga pedem e-mail — neste caso o campo passa a ser obrigatório.'}
        </p>
        <input
          style={{ ...S.input, marginBottom: '16px', borderColor: requireCandidateEmail && !emailOk && email.length > 0 ? 'rgba(232,71,71,.4)' : undefined }}
          placeholder="Ex: maria@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode={requireCandidateEmail ? 'email' : undefined}
          autoComplete="email"
        />

        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12px', color: C.muted, lineHeight: 1.5, marginBottom: '16px' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '2px' }} />
          Autorizo o uso dessas informações para fins de recrutamento e comparação interna (LGPD).
        </label>

        <button
          disabled={!canStart}
          style={{
            ...S.btn(),
            opacity: canStart ? 1 : 0.4,
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
          onClick={() => canStart && onStart({ name: name.trim(), email: email.trim(), areaKey, consent })}
        >
          Começar →
        </button>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: '11px', color: C.faint }}>Gestor? </span>
          <span style={{ fontSize: '11px', color: C.purpleLight, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/login')}>
            Acessar dashboard →
          </span>
        </div>
      </div>
    </div>
  );
}

function TestScreen({ name, onComplete }) {
  const [questions] = useState(() => drawQuestions());
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [pendingVal, setPendingVal] = useState(null);
  const [carefulMode, setCarefulMode] = useState(false);
  const [fade, setFade] = useState(false);
  const q = questions[idx];
  const progress = (idx / questions.length) * 100;

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
            Questão {idx + 1} de {questions.length}
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
                ← Anterior
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
          Confirmar cada resposta antes de avançar (menos risco de clique errado)
        </label>
        <p style={{ fontSize: '20px', lineHeight: 1.6, marginBottom: '36px', fontWeight: 'normal', opacity: fade ? 0.3 : 1, transition: 'opacity .28s' }}>
          "{q.text}"
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SCALE_LABELS.map((label, i) => {
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
              Confirmar e avançar
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
              Escolher outra opção
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultScreen({ result, onRestart, saveError = null, onRetrySave = null, retryBusy = false }) {
  const { name, scores, topType } = result;
  const d = TYPE_DATA[topType];
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([t, s]) => ({ type: parseInt(t), score: s }));
  const maxScore = sorted[0].score;
  const second = sorted[1];

  return (
    <div style={{ ...S.app, justifyContent: 'flex-start', paddingTop: '40px' }}>
      <div style={S.glow} />
      <div style={{ ...S.card, maxWidth: '700px' }}>
        <span style={S.label}>◈ Seu resultado, {name.split(' ')[0]}</span>
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
            Não foi possível registrar suas respostas no servidor: {saveError}
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
                  {retryBusy ? 'Enviando…' : 'Tentar enviar novamente'}
                </button>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '10px', lineHeight: 1.5 }}>
                  Os mesmos dados são reenviados; não é preciso refazer o teste.
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '42px', marginBottom: '4px' }}>{d.emoji}</div>
          <div style={{ fontSize: '13px', color: C.muted, fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Tipo {topType}
          </div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 'normal', color: d.color, marginBottom: '16px' }}>{d.name}</h2>
          <p style={{ ...S.p, marginBottom: 0 }}>{d.desc}</p>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px', marginBottom: '22px' }}>
          <span style={S.label}>Pontos fortes</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {d.strengths.map((s) => (
              <span key={s} style={{ padding: '5px 13px', background: `${d.color}15`, border: `1px solid ${d.color}40`, borderRadius: '20px', fontSize: '12px', color: d.color }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px', marginBottom: '22px' }}>
          <span style={S.label}>Desafio de crescimento</span>
          <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>"{d.challenge}"</p>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px', marginBottom: '22px' }}>
          <span style={S.label}>Perfil por tipo</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sorted.map(({ type, score }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '90px', fontSize: '11px', color: TYPE_DATA[type].color, fontFamily: 'monospace', flexShrink: 0 }}>
                  {TYPE_DATA[type].emoji} T{type}
                </span>
                <div style={{ flex: 1 }}>
                  <Bar value={score} max={maxScore} color={TYPE_DATA[type].color} />
                </div>
                <span style={{ width: '24px', fontSize: '11px', color: C.muted, textAlign: 'right', fontFamily: 'monospace' }}>{score}</span>
              </div>
            ))}
          </div>
        </div>

        {second ? (
          <div style={{ background: `${d.color}0a`, border: `1px solid ${d.color}25`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <span style={{ ...S.label, marginBottom: '6px', color: `${d.color}80` }}>Ala secundária</span>
            <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, margin: 0 }}>
              Segundo tipo mais forte: <span style={{ color: TYPE_DATA[second.type].color }}>{TYPE_DATA[second.type].name}</span> — molda como você expressa seu tipo principal no dia a dia.
            </p>
          </div>
        ) : null}

        <div style={{ background: `${d.color}0a`, border: `1px solid ${d.color}25`, borderRadius: '12px', padding: '16px 20px', marginBottom: '28px' }}>
          <span style={{ ...S.label, marginBottom: '6px', color: `${d.color}80` }}>Contribuição para a equipe</span>
          <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.7, margin: 0 }}>{d.team}</p>
        </div>

        <button style={{ ...S.btn(), fontSize: '13px' }} onClick={onRestart}>
          ← Voltar ao início
        </button>
      </div>
    </div>
  );
}

export default function AssessmentFlow({
  companyToken = '',
  vacancyToken = '',
  notice = null,
  startDisabled = false,
  requireCandidateEmail = false,
}) {
  const [screen, setScreen] = useState('home'); // home | test | result
  const [candidate, setCandidate] = useState(null); // { name, email, areaKey, consent }
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [retryPayload, setRetryPayload] = useState(null);
  const [retryBusy, setRetryBusy] = useState(false);

  const handleStart = (c) => {
    setSaveError(null);
    setRetryPayload(null);
    setCandidate(c);
    setScreen('test');
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
      if (!res.ok) errMsg = body.error || `Erro ${res.status}`;
    } catch (e) {
      console.error('Erro ao reenviar resultado:', e);
      errMsg = 'Falha de rede ao salvar';
    }
    setRetryBusy(false);
    setSaveError(errMsg);
    setRetryPayload(errMsg ? retryPayload : null);
  }, [retryPayload]);

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
    const payload = { ...data, ...candidate, companyToken, vacancyToken, answers: data.answers };
    let errMsg = null;
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        errMsg = body.error || `Erro ${res.status}`;
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

  if (screen === 'test') return <TestScreen name={candidate?.name || ''} onComplete={handleComplete} />;
  if (screen === 'result') {
    if (!result) {
      return (
        <div style={S.app}>
          <div style={S.glow} />
          <div style={S.card}>
            <span style={S.label}>◈ 30Team</span>
            <p style={{ ...S.p, marginBottom: 0 }}>{saveError || 'Não foi possível concluir o teste.'}</p>
            <button
              type="button"
              style={{ ...S.btn(), marginTop: '24px' }}
              onClick={() => {
                setSaveError(null);
                setRetryPayload(null);
                setScreen('home');
              }}
            >
              ← Voltar ao início
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
        onRestart={() => {
          setSaveError(null);
          setRetryPayload(null);
          setScreen('home');
        }}
      />
    );
  }
  return <HomeScreen onStart={handleStart} notice={notice} startDisabled={startDisabled} requireCandidateEmail={requireCandidateEmail} />;
}

