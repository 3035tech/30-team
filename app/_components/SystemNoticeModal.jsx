'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import {
  dialogBtnSolidClass,
  dialogCardClass,
  dialogOverlayClass,
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

  const heading = title || t(locale, 'panel.common.noticeTitle');
  const accentClass =
    tone === 'ok' ? 'text-success' : tone === 'error' ? 'text-danger' : 'text-brand-500';
  const btnBgClass =
    tone === 'ok' ? 'bg-success' : tone === 'error' ? 'bg-danger' : 'bg-brand-500';

  return createPortal(
    <div
      className={cn('app-dialog-overlay', dialogOverlayClass)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-notice-title"
        className={dialogCardClass}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={cn('font-mono text-[10px] uppercase tracking-[2px]', accentClass)}>
          30Team
        </span>
        <h2
          id="system-notice-title"
          className="mb-0 mt-2 font-display text-xl font-normal leading-tight text-ink"
        >
          {heading}
        </h2>
        <p className="mb-0 mt-3 text-sm leading-[1.55] text-ink-muted">{message}</p>
        <div className="mt-[22px] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className={cn(dialogBtnSolidClass, btnBgClass)}
          >
            {t(locale, 'panel.common.ok')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
