'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import {
  dialogBtnGhostClass,
  dialogOverlayClass,
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
      className={cn('app-dialog-overlay', dialogOverlayClass)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rich-form-drawer-title"
        className="admin-rich-drawer-panel mx-6 my-6 flex max-h-[92vh] flex-col overflow-hidden rounded-[18px] border border-ink/12 bg-white shadow-dialog"
        style={{ width: `min(100%, ${maxWidth})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-ink/12 px-[22px] pb-3.5 pt-[18px]">
          <div>
            <span className="font-mono text-2xs uppercase tracking-[2px] text-brand-500">
              30Team
            </span>
            <h2
              id="rich-form-drawer-title"
              className="mb-0 mt-1.5 font-display text-2xl font-normal leading-tight text-ink"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(locale, 'panel.common.cancel')}
            className={cn(dialogBtnGhostClass, 'min-h-touch min-w-10 px-3 py-2')}
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">{children}</div>
        {footer ? (
          <div className="flex flex-shrink-0 flex-wrap justify-end gap-2.5 border-t border-ink/12 px-[22px] pb-[18px] pt-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export { dialogBtnGhostClass, dialogBtnPrimaryClass } from './app-dialog-styles';
