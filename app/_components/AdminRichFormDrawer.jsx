'use client';

import { useEffect, useRef, useState } from 'react';
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
  fullPage = false,
  headerMeta = null,
  headerActions = null,
}) {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef(null);

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
  }, [fullPage, open, onClose]);

  useEffect(() => {
    if (!open || !fullPage) return;
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [fullPage, open, title]);

  if (!mounted || !open) return null;

  const backLabel = locale === 'en' ? 'Back to team' : 'Voltar para equipe';
  const closeLabel = locale === 'en' ? 'Close profile' : 'Fechar perfil';

  return createPortal(
    <div
      className={cn('app-dialog-overlay', fullPage ? 'bg-canvas' : dialogOverlayClass)}
      role="presentation"
      onClick={(e) => {
        if (fullPage) return;
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role={fullPage ? 'main' : 'dialog'}
        {...(!fullPage ? { 'aria-modal': 'true' } : {})}
        aria-labelledby="rich-form-drawer-title"
        className={cn(
          'admin-rich-drawer-panel flex flex-col overflow-hidden border border-ink/12 bg-white',
          fullPage
            ? 'h-screen w-full border-0 bg-canvas shadow-none'
            : 'mx-6 my-6 max-h-[92vh] rounded-[18px] shadow-dialog'
        )}
        style={fullPage ? undefined : { width: `min(100%, ${maxWidth})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          'flex flex-shrink-0 items-start justify-between gap-3 border-b border-ink/12 px-[22px] pb-3.5 pt-[18px]',
          fullPage && 'mx-auto w-full max-w-[1180px] px-4 sm:px-8 lg:px-10'
        )}>
          <div className="min-w-0">
            {fullPage ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={backLabel}
                className="mb-3 inline-flex min-h-touch items-center rounded-control border border-ink/12 bg-transparent px-3 py-1.5 font-ui text-xs text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
              >
                ← {backLabel}
              </button>
            ) : null}
            <span className="font-mono text-2xs uppercase tracking-[2px] text-brand-500">
              {fullPage ? (locale === 'en' ? 'PERSON PROFILE' : 'PERFIL DA PESSOA') : '30Team'}
            </span>
            <h2
              id="rich-form-drawer-title"
              className={cn(
                'mb-0 mt-1.5 font-display font-normal leading-tight text-ink',
                fullPage ? 'text-3xl sm:text-4xl' : 'text-2xl'
              )}
            >
              {title}
            </h2>
            {headerMeta ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                {headerMeta}
              </div>
            ) : null}
          </div>
          <div className={cn('flex shrink-0 items-start gap-2', fullPage && 'mt-8')}>
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label={fullPage ? closeLabel : t(locale, 'panel.common.cancel')}
              title={fullPage ? closeLabel : undefined}
              className={cn(dialogBtnGhostClass, 'min-h-touch min-w-10 px-3 py-2')}
            >
              ×
            </button>
          </div>
        </div>
        <div ref={contentRef} className={cn(
          'flex-1 overflow-y-auto px-[22px] py-[18px]',
          fullPage && 'mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10'
        )}>{children}</div>
        {footer ? (
          <div className={cn(
            'flex flex-shrink-0 flex-wrap justify-end gap-2.5 border-t border-ink/12 px-[22px] pb-[18px] pt-3.5',
            fullPage && 'mx-auto w-full max-w-[1180px] px-4 sm:px-8 lg:px-10'
          )}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export { dialogBtnGhostClass, dialogBtnPrimaryClass } from './app-dialog-styles';
