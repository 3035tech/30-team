'use client';

import { cn } from '../../lib/cn';
import { copyToClipboard } from '../../lib/clipboard';
import { t } from '../../lib/i18n';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedbackOptional } from './AppFeedback';

/**
 * Shareable URL for managers: clickable link + copy (toast via AppFeedback when present).
 *
 * @param {{
 *   url: string,
 *   locale?: string,
 *   label?: string,
 *   showUrl?: boolean,
 *   openable?: boolean,
 *   disabled?: boolean,
 *   compact?: boolean,
 *   className?: string,
 *   copyLabel?: string,
 *   openLabel?: string,
 * }} props
 */
export function CopyableLink({
  url,
  locale = 'pt-BR',
  label,
  showUrl = true,
  openable = true,
  disabled = false,
  compact = false,
  className,
  copyLabel,
  openLabel,
}) {
  const feedback = useAppFeedbackOptional();
  const href = String(url || '').trim();
  const canUse = Boolean(href) && !disabled;

  const onCopy = async () => {
    if (!canUse) return;
    const ok = await copyToClipboard(href);
    const toast = feedback?.toast;
    if (typeof toast === 'function') {
      toast(
        t(locale, ok ? 'panel.common.copied' : 'panel.common.copyFailed'),
        ok ? 'ok' : 'error'
      );
    }
  };

  const btnCopy = cn(
    compact ? 'min-h-[36px] px-2.5 py-1.5 text-[11px]' : 'min-h-touch px-3 py-2 text-xs',
    S.btnBrandSoft,
    !canUse && 'cursor-default opacity-50'
  );
  const btnOpen = cn(
    compact ? 'min-h-[36px] px-2.5 py-1.5 text-[11px]' : 'min-h-touch px-3 py-2 text-xs',
    S.btnGhost,
    !canUse && 'cursor-default opacity-50'
  );

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label ? (
        <span className="font-mono text-[11px] tracking-[0.02em] text-ink-faint">{label}</span>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {showUrl ? (
          canUse && openable ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 break-all font-mono text-xs text-brand-500 underline underline-offset-2"
            >
              {href}
            </a>
          ) : (
            <span
              className={cn(
                'min-w-0 break-all font-mono text-xs',
                canUse ? 'text-ink-muted' : 'text-ink-faint'
              )}
            >
              {href || t(locale, 'panel.common.notApplicable')}
            </span>
          )
        ) : null}
        <button
          type="button"
          onClick={onCopy}
          disabled={!canUse}
          className={btnCopy}
          aria-label={copyLabel || t(locale, 'panel.common.copyLink')}
        >
          {copyLabel || t(locale, 'panel.common.copyLink')}
        </button>
        {openable && !showUrl && canUse ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(btnOpen, 'inline-flex items-center no-underline')}
          >
            {openLabel || t(locale, 'panel.common.openLink')}
          </a>
        ) : null}
      </div>
    </div>
  );
}
