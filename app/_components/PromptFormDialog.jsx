'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import {
  dialogBtnGhost,
  dialogBtnPrimary,
  dialogCardStyle,
  dialogFieldStyle,
  dialogOverlayStyle,
} from './app-dialog-styles';

/**
 * Multi-field form dialog (replaces window.prompt chains).
 * fields: [{ key, label, defaultValue?, type?: 'text'|'password' }]
 */
export function PromptFormDialog({
  open,
  title,
  message,
  fields = [],
  locale = 'pt-BR',
  confirmLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}) {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const init = {};
    for (const f of fields) {
      init[f.key] = f.defaultValue != null ? String(f.defaultValue) : '';
    }
    setValues(init);
    // Reset only when opening; callers pass a fresh fields array per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  const heading = title || t(locale, 'panel.common.editTitle');

  return createPortal(
    <div
      style={dialogOverlayStyle}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-form-title"
        style={{ ...dialogCardStyle, maxWidth: '460px' }}
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
          30Team
        </span>
        <h2
          id="prompt-form-title"
          style={{
            margin: '8px 0 0',
            fontSize: '20px',
            fontWeight: 'normal',
            fontFamily: 'Georgia, serif',
            color: C.text,
            lineHeight: 1.25,
          }}
        >
          {heading}
        </h2>
        {message ? (
          <p style={{ margin: '12px 0 0', fontSize: '14px', color: C.muted, lineHeight: 1.55 }}>{message}</p>
        ) : null}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: 'block' }}>
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>{f.label}</span>
              <input
                type={f.type === 'password' ? 'password' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                style={dialogFieldStyle}
                autoComplete={f.type === 'password' ? 'new-password' : 'off'}
              />
            </label>
          ))}
        </div>
        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onCancel} style={dialogBtnGhost}>
            {cancelLabel || t(locale, 'panel.common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit?.(values)}
            autoFocus
            style={dialogBtnPrimary(C.purple)}
          >
            {confirmLabel || t(locale, 'panel.common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
