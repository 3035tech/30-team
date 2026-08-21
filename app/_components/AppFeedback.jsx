'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { C } from '../../lib/theme';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptFormDialog } from './PromptFormDialog';
import { SystemNoticeModal } from './SystemNoticeModal';

const AppFeedbackContext = createContext(null);

/**
 * Global in-app feedback: confirm, notice (alert), promptForm, toast.
 * Replaces window.confirm / alert / prompt.
 */
export function AppFeedbackProvider({ children, locale = 'pt-BR' }) {
  const [confirmState, setConfirmState] = useState(null);
  const [noticeState, setNoticeState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const confirm = useCallback((opts = {}) => {
    const message = typeof opts === 'string' ? opts : opts.message;
    if (!message) return Promise.resolve(false);
    return new Promise((resolve) => {
      setConfirmState({
        title: opts.title,
        message,
        danger: Boolean(opts.danger),
        confirmLabel: opts.confirmLabel,
        cancelLabel: opts.cancelLabel,
        resolve,
      });
    });
  }, []);

  const notice = useCallback((opts = {}) => {
    const message = typeof opts === 'string' ? opts : opts.message;
    if (!message) return Promise.resolve();
    return new Promise((resolve) => {
      setNoticeState({
        title: opts.title,
        message,
        tone: opts.tone || 'info',
        resolve,
      });
    });
  }, []);

  const promptForm = useCallback((opts = {}) => {
    const fields = Array.isArray(opts.fields) ? opts.fields : [];
    if (!fields.length) return Promise.resolve(null);
    return new Promise((resolve) => {
      setPromptState({
        title: opts.title,
        message: opts.message,
        fields,
        confirmLabel: opts.confirmLabel,
        cancelLabel: opts.cancelLabel,
        resolve,
      });
    });
  }, []);

  const toast = useCallback((message, tone = 'ok') => {
    if (!message) return;
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, message: String(message), tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(
    () => ({ confirm, notice, promptForm, toast, locale }),
    [confirm, notice, promptForm, toast, locale]
  );

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      {confirmState ? (
        <ConfirmDialog
          open
          locale={locale}
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          onCancel={() => {
            confirmState.resolve(false);
            setConfirmState(null);
          }}
          onConfirm={() => {
            confirmState.resolve(true);
            setConfirmState(null);
          }}
        />
      ) : null}
      {noticeState ? (
        <SystemNoticeModal
          open
          locale={locale}
          title={noticeState.title}
          message={noticeState.message}
          tone={noticeState.tone}
          onClose={() => {
            noticeState.resolve();
            setNoticeState(null);
          }}
        />
      ) : null}
      {promptState ? (
        <PromptFormDialog
          open
          locale={locale}
          title={promptState.title}
          message={promptState.message}
          fields={promptState.fields}
          confirmLabel={promptState.confirmLabel}
          cancelLabel={promptState.cancelLabel}
          onCancel={() => {
            promptState.resolve(null);
            setPromptState(null);
          }}
          onSubmit={(values) => {
            promptState.resolve(values);
            setPromptState(null);
          }}
        />
      ) : null}
      {typeof document !== 'undefined' && toasts.length > 0
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                right: '16px',
                bottom: '16px',
                zIndex: 10080,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: 'min(360px, calc(100vw - 32px))',
                pointerEvents: 'none',
              }}
            >
              {toasts.map((item) => {
                const accent =
                  item.tone === 'error' ? C.tension : item.tone === 'info' ? C.purple : C.synergy;
                return (
                  <div
                    key={item.id}
                    role="status"
                    style={{
                      pointerEvents: 'auto',
                      background: C.surface || '#fff',
                      border: `1px solid ${accent}55`,
                      borderLeft: `4px solid ${accent}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      boxShadow: '0 12px 32px rgba(26,22,37,.14)',
                      fontSize: '13px',
                      color: C.text,
                      lineHeight: 1.4,
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {item.message}
                  </div>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const ctx = useContext(AppFeedbackContext);
  if (!ctx) {
    throw new Error('useAppFeedback must be used within AppFeedbackProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-ops). Prefer useAppFeedback in dashboard. */
export function useAppFeedbackOptional() {
  return useContext(AppFeedbackContext);
}
