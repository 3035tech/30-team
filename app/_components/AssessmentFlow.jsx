'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TYPE_DATA, drawQuestions, SCALE_LABELS } from '../../lib/data';
import { computeAssessmentFromAnswers } from '../../lib/assessment-score';

const C = {
  bg: '#ffffff',
  card: 'rgba(124,58,237,0.06)',
  border: 'rgba(26,22,37,0.12)',
  purple: '#7C3AED',
  purpleLight: '#6D28D9',
  purpleDark: '#4C1D95',
  text: '#1a1625',
  muted: 'rgba(26,22,37,0.62)',
  faint: 'rgba(26,22,37,0.38)',
};

const S = {
  app: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: "'Georgia','Times New Roman',serif",
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
    background: `radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.07) 0%,transparent 55%),
                radial-gradient(ellipse at 85% 75%,rgba(71,168,232,.05) 0%,transparent 55%)`,
  },
  card: {
    maxWidth: '660px',
    width: '100%',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '20px',
    padding: '44px 48px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 20px 50px rgba(124,58,237,.1), 0 4px 24px rgba(0,0,0,.05)',
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontSize: '10px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: 'rgba(124,58,237,.55)',
    fontFamily: "'Courier New',monospace",
    marginBottom: '16px',
    display: 'block',
  },
  h1: {
    fontSize: 'clamp(28px,5vw,44px)',
    fontWeight: 'normal',
    lineHeight: 1.15,
    marginBottom: '12px',
    background: 'linear-gradient(135deg,#E8E0FF 0%,#A78BFA 55%,#7C3AED 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  p: { fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '32px', fontStyle: 'italic' },
  btn: (bg = C.purple) => ({
    background: `linear-gradient(135deg,${bg} 0%,#4C1D95 100%)`,
    border: 'none',
    borderRadius: '10px',
    padding: '14px 32px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Georgia',serif",
  }),
  input: {
    width: '100%',
    background: 'rgba(26,22,37,.04)',
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    padding: '14px 18px',
    color: C.text,
    fontSize: '15px',
    fontFamily: "'Georgia',serif",
    outline: 'none',
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

function HomeScreen({ onStart, notice = null, startDisabled = false }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [areaKey, setAreaKey] = useState('tecnologia');
  const [consent, setConsent] = useState(false);
  const router = useRouter();
  const ready = name.trim().length > 1 && !!areaKey && consent;
  const canStart = ready && !startDisabled;

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
                color: notice.kind === 'warning' ? '#dc2626' : C.faint,
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
        <select value={areaKey} onChange={(e) => setAreaKey(e.target.value)} style={{ ...S.input, appearance: 'none', cursor: 'pointer' }}>
          <option value="tecnologia">Tecnologia</option>
          <option value="produto">Produto</option>
          <option value="comercial">Comercial</option>
          <option value="marketing">Marketing</option>
          <option value="cs">Customer Success</option>
          <option value="atendimento">Atendimento/Suporte</option>
          <option value="operacoes">Operações/Projetos</option>
          <option value="financeiro">Financeiro</option>
          <option value="rh">RH</option>
          <option value="juridico">Jurídico/Compliance</option>
          <option value="outros">Outros</option>
        </select>

        <label style={{ fontSize: '12px', color: C.muted, display: 'block', marginBottom: '8px' }}>Email (opcional)</label>
        <input style={S.input} placeholder="Ex: maria@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />

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
  const [fade, setFade] = useState(false);
  const q = questions[idx];
  const progress = (idx / questions.length) * 100;

  const handle = useCallback(
    (val) => {
      if (fade) return;
      setSelected(val);
      setFade(true);
      setTimeout(() => {
        const na = { ...answers, [q.id]: val };
        setAnswers(na);
        if (idx < questions.length - 1) {
          setIdx((i) => i + 1);
          setSelected(null);
          setFade(false);
        } else {
          onComplete({ name, answers: na });
        }
      }, 280);
    },
    [fade, answers, q, idx, questions, name, onComplete]
  );

  return (
    <div style={S.app}>
      <div style={S.glow} />
      <div style={{ ...S.card, maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ ...S.label, marginBottom: 0 }}>
            Questão {idx + 1} de {questions.length}
          </span>
          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: '2px', background: 'rgba(26,22,37,.08)', borderRadius: '1px', marginBottom: '36px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg,${C.purpleDark},${C.purpleLight})`,
              transition: 'width .4s',
            }}
          />
        </div>
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
                onClick={() => handle(val)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '13px 18px',
                  background: isSel ? `${C.purple}22` : 'rgba(26,22,37,.03)',
                  border: isSel ? `1px solid ${C.purple}88` : `1px solid ${C.border}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isSel ? C.purpleLight : C.text,
                  fontSize: '14px',
                  fontFamily: "'Georgia',serif",
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
      </div>
    </div>
  );
}

function ResultScreen({ result, onRestart, saveError = null }) {
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

export default function AssessmentFlow({ companyToken = '', vacancyToken = '', notice = null, startDisabled = false }) {
  const [screen, setScreen] = useState('home'); // home | test | result
  const [candidate, setCandidate] = useState(null); // { name, email, areaKey, consent }
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const handleStart = (c) => {
    setSaveError(null);
    setCandidate(c);
    setScreen('test');
  };

  const handleComplete = async (data) => {
    const computed = computeAssessmentFromAnswers(data.answers);
    if (!computed.ok) {
      console.error(computed.error);
      setSaveError(computed.error);
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
            <button type="button" style={{ ...S.btn(), marginTop: '24px' }} onClick={() => { setSaveError(null); setScreen('home'); }}>
              ← Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    return <ResultScreen result={result} saveError={saveError} onRestart={() => { setSaveError(null); setScreen('home'); }} />;
  }
  return <HomeScreen onStart={handleStart} notice={notice} startDisabled={startDisabled} />;
}

