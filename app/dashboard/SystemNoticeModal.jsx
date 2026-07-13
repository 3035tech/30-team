'use client';

import { useEffect } from 'react';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 10060,
  background: 'rgba(26,22,37,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
};

const cardStyle = {
  width: '100%',
  maxWidth: '420px',
  background: '#fff',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px 26px',
  boxShadow: '0 24px 64px rgba(26,22,37,.18)',
};

/**
 * In-app notice dialog (replaces browser alert).
 * @param {{ open: boolean, title?: string, message: string, locale?: string, tone?: 'ok'|'error'|'info', onClose: () => void }} props
 */
export function SystemNoticeModal({
  open,
  title,
  message,
  locale = 'pt-BR',
  tone = 'info',
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !message) return null;

  const accent = tone === 'ok' ? C.synergy : tone === 'error' ? C.tension : C.purple;
  const heading = title || t(locale, 'panel.common.noticeTitle');

  return (
    <div
      style={overlayStyle}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-notice-title"
        style={cardStyle}
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
          <button
            type="button"
            onClick={onClose}
            autoFocus
            style={{
              background: accent,
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {t(locale, 'panel.common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}
