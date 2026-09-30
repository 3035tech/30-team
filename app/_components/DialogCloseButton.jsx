'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { dialogBtnGhostClass } from './app-dialog-styles';

/** Top-right × for create/edit/view modals. Confirm/notice dialogs keep explicit actions only. */
export function DialogCloseButton({ onClick, locale = 'pt-BR', label, disabled = false, className }) {
  const text = label || t(locale, 'panel.common.close');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={text}
      title={text}
      className={cn(dialogBtnGhostClass, 'min-h-touch min-w-10 shrink-0 px-3 py-2', className)}
    >
      <span aria-hidden>×</span>
    </button>
  );
}
