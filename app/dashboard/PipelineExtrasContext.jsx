'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { REJECTION_REASONS, normalizeStartDate } from '../../lib/pipeline';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { rejectionReasonLabel } from './pipeline-prompts';

const PipelineExtrasContext = createContext(null);

const FIELD =
  'box-border w-full rounded-control border border-ink/12 bg-ink/[0.05] px-3.5 py-3 font-display text-sm text-ink';
const BTN_PRIMARY =
  'min-h-touch cursor-pointer rounded-control border-none bg-brand-500 px-4 py-2.5 font-mono text-[13px] text-white';
const BTN_GHOST =
  'min-h-touch cursor-pointer rounded-control border border-ink/12 bg-transparent px-4 py-2.5 font-mono text-[13px] text-ink-muted';

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
      className="fixed inset-0 z-[10050] box-border flex items-center justify-center bg-ink/45 p-6"
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
        className="w-full max-w-[440px] rounded-card border border-ink/12 bg-white px-[26px] py-6 shadow-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-brand-500">
          {t(locale, 'recruiting.pipelineShort')}
        </span>
        <h2
          id="pipeline-extras-title"
          className="mb-0 mt-2 font-display text-[22px] font-normal leading-[1.25] text-ink"
        >
          {title}
        </h2>
        <p className="mb-0 mt-2.5 text-[13px] leading-[1.55] text-ink-muted">{body}</p>

        <div className="mt-5">
          {mode === 'rejected' ? (
            <>
              <label
                htmlFor="pipeline-reject-reason"
                className="mb-2 block font-mono text-[11px] uppercase tracking-[1.5px] text-ink-muted"
              >
                {t(locale, 'recruiting.rejectionReasonLabel')}
              </label>
              <select
                id="pipeline-reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={cn(FIELD, 'cursor-pointer')}
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
              <label
                htmlFor="pipeline-hire-date"
                className="mb-2 block font-mono text-[11px] uppercase tracking-[1.5px] text-ink-muted"
              >
                {t(locale, 'recruiting.startDateLabel')}
              </label>
              <input
                id="pipeline-hire-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(FIELD, 'cursor-pointer')}
              />
              <p className="mb-0 mt-2 text-xs leading-normal text-ink-faint">
                {t(locale, 'recruiting.hireDateHint')}
              </p>
            </>
          )}
        </div>

        {error ? (
          <p className="mb-0 mt-3 font-mono text-xs text-danger">{error}</p>
        ) : null}

        <div className="mt-[22px] flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className={BTN_GHOST}>
            {t(locale, 'recruiting.modalCancel')}
          </button>
          <button type="button" onClick={submit} className={BTN_PRIMARY}>
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
