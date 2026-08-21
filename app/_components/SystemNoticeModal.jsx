'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import {
  dialogBtnPrimary,
  dialogCardStyle,
  dialogOverlayStyle,
} from './app-dialog-styles';

/**
 * In-app notice dialog (replaces browser alert).
 * Portaled to document.body so the backdrop covers the full viewport.
 */
export function SystemNoticeModal({
  open,
  title,
  message,
  locale = 'pt-BR',
  tone = 'info',
  onClose,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open || !message) return null;

  const accent = tone === 'ok' ? C.synergy : tone === 'error' ? C.tension : C.purple;
  const heading = title || t(locale, 'panel.common.noticeTitle');

  return createPortal(
    <div
      className="app-dialog-overlay"
      style={dialogOverlayStyle}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-notice-title"
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
          id="system-notice-title"
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
        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} autoFocus style={dialogBtnPrimary(accent)}>
            {t(locale, 'panel.common.ok')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
