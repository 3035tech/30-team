'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import {
  dialogBtnGhost,
  dialogBtnPrimary,
  dialogCardStyle,
  dialogOverlayStyle,
} from './app-dialog-styles';

/**
 * Confirm / cancel dialog (replaces window.confirm).
 * @param {{ open: boolean, title?: string, message: string, locale?: string, danger?: boolean, confirmLabel?: string, cancelLabel?: string, onConfirm: () => void, onCancel: () => void }} props
 */
export function ConfirmDialog({
  open,
  title,
  message,
  locale = 'pt-BR',
  danger = false,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !open || !message) return null;

  const accent = danger ? C.tension : C.purple;
  const heading = title || t(locale, 'panel.common.confirmTitle');

  return createPortal(
    <div
      className="app-dialog-overlay"
      style={dialogOverlayStyle}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={dialogCardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: accent,
            fontFamily: 'monospace',
          }}
        >
          30Team
        </span>
        <h2
          id="confirm-dialog-title"
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
        <p style={{ margin: '12px 0 0', fontSize: '14px', color: C.muted, lineHeight: 1.55 }}>{message}</p>
        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onCancel} style={dialogBtnGhost}>
            {cancelLabel || t(locale, 'panel.common.cancel')}
          </button>
          <button type="button" onClick={onConfirm} autoFocus style={dialogBtnPrimary(accent)}>
            {confirmLabel || t(locale, 'panel.common.confirmAction')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
