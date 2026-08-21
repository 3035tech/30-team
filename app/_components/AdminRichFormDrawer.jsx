'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';
import {
  dialogBtnGhost,
  dialogBtnPrimary,
  dialogOverlayStyle,
} from './app-dialog-styles';

/**
 * Wide form shell for rich create/edit (vacancies, etc.).
 * Not a field builder — host existing form JSX as children.
 */
export function AdminRichFormDrawer({
  open,
  title,
  locale = 'pt-BR',
  onClose,
  children,
  footer,
  maxWidth = '820px',
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

  if (!mounted || !open) return null;

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
        aria-labelledby="rich-form-drawer-title"
        className="admin-rich-drawer-panel"
        style={{
          width: 'min(100%, ' + maxWidth + ')',
          maxHeight: '92vh',
          margin: '24px auto',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '18px',
          boxShadow: '0 24px 64px rgba(26,22,37,.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 22px 14px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div>
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
              id="rich-form-drawer-title"
              style={{
                margin: '6px 0 0',
                fontSize: '22px',
                fontWeight: 'normal',
                fontFamily: FONTS.serif,
                color: C.text,
                lineHeight: 1.25,
              }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(locale, 'panel.common.cancel')}
            style={{
              ...dialogBtnGhost,
              minWidth: '40px',
              minHeight: '40px',
              padding: '8px 12px',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer ? (
          <div
            style={{
              padding: '14px 22px 18px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export { dialogBtnGhost, dialogBtnPrimary };
