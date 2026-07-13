'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { REJECTION_REASONS, normalizeStartDate } from '../../lib/pipeline';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { rejectionReasonLabel } from './pipeline-prompts';

const PipelineExtrasContext = createContext(null);

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 10050,
  background: 'rgba(26,22,37,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
};

const cardStyle = {
  width: '100%',
  maxWidth: '440px',
  background: '#fff',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px 26px',
  boxShadow: '0 24px 64px rgba(26,22,37,.18)',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontFamily: 'monospace',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: C.muted,
  marginBottom: '8px',
};

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: C.inputBg,
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '12px 14px',
  color: C.text,
  fontSize: '14px',
  fontFamily: 'Georgia, serif',
};

const btnPrimary = {
  background: C.purple,
  border: 'none',
  borderRadius: '10px',
  padding: '10px 16px',
  color: '#fff',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'monospace',
};

const btnGhost = {
  background: 'transparent',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '10px 16px',
  color: C.muted,
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'monospace',
};

function PipelineExtrasDialog({ locale, mode, onConfirm, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [reason, setReason] = useState('profile_fit');
  const [startDate, setStartDate] = useState(today);
  const [error, setError] = useState('');

  const title =
    mode === 'rejected'
      ? t(locale, 'recruiting.rejectModalTitle')
      : t(locale, 'recruiting.hireModalTitle');
  const body =
    mode === 'rejected'
      ? t(locale, 'recruiting.rejectModalIntro')
      : t(locale, 'recruiting.hireModalIntro');

  const submit = () => {
    setError('');
    if (mode === 'rejected') {
      if (!reason) {
        setError(t(locale, 'recruiting.rejectReasonRequired'));
        return;
      }
      onConfirm({ rejectionReason: reason });
      return;
    }
    const normalized = normalizeStartDate(startDate);
    if (!normalized) {
      setError(t(locale, 'recruiting.hireStartDateRequired'));
      return;
    }
    onConfirm({ startDate: normalized });
  };

  return (
    <div
      style={overlayStyle}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-extras-title"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: C.purple,
            fontFamily: 'monospace',
          }}
        >
          {t(locale, 'recruiting.pipelineShort')}
        </span>
        <h2
          id="pipeline-extras-title"
          style={{
            margin: '8px 0 0',
            fontSize: '22px',
            fontWeight: 'normal',
            fontFamily: 'Georgia, serif',
            color: C.text,
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>{body}</p>

        <div style={{ marginTop: '20px' }}>
          {mode === 'rejected' ? (
            <>
              <label htmlFor="pipeline-reject-reason" style={labelStyle}>
                {t(locale, 'recruiting.rejectionReasonLabel')}
              </label>
              <select
                id="pipeline-reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ ...fieldStyle, cursor: 'pointer' }}
              >
                {REJECTION_REASONS.map((code) => (
                  <option key={code} value={code}>
                    {rejectionReasonLabel(locale, code)}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label htmlFor="pipeline-hire-date" style={labelStyle}>
                {t(locale, 'recruiting.startDateLabel')}
              </label>
              <input
                id="pipeline-hire-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ ...fieldStyle, cursor: 'pointer' }}
              />
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.faint, lineHeight: 1.5 }}>
                {t(locale, 'recruiting.hireDateHint')}
              </p>
            </>
          )}
        </div>

        {error ? (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.tension, fontFamily: 'monospace' }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          <button type="button" onClick={onCancel} style={btnGhost}>
            {t(locale, 'recruiting.modalCancel')}
          </button>
          <button type="button" onClick={submit} style={btnPrimary}>
            {t(locale, 'recruiting.modalConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PipelineExtrasProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const close = useCallback((payload) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setState(null);
    if (resolve) resolve(payload);
  }, []);

  const requestPipelineExtras = useCallback((locale, stage) => {
    if (stage !== 'rejected' && stage !== 'hired') {
      return Promise.resolve({});
    }
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ locale, mode: stage });
    });
  }, []);

  const value = useMemo(() => ({ requestPipelineExtras }), [requestPipelineExtras]);

  return (
    <PipelineExtrasContext.Provider value={value}>
      {children}
      {state ? (
        <PipelineExtrasDialog
          locale={state.locale}
          mode={state.mode}
          onConfirm={(payload) => close(payload)}
          onCancel={() => close(null)}
        />
      ) : null}
    </PipelineExtrasContext.Provider>
  );
}

export function usePipelineExtras() {
  const ctx = useContext(PipelineExtrasContext);
  if (!ctx) {
    throw new Error('usePipelineExtras must be used within PipelineExtrasProvider');
  }
  return ctx;
}
