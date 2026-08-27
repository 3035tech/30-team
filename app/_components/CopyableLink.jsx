'use client';

import { cn } from '../../lib/cn';
import { copyToClipboard } from '../../lib/clipboard';
import { t } from '../../lib/i18n';
import { useAppFeedbackOptional } from './AppFeedback';
import { Icon } from './Icon';

const iconActionClass =
  'inline-flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-control border p-0 disabled:cursor-default disabled:opacity-50';

/**
 * Shareable URL for managers: clickable link + icon actions (copy / open).
 * Labels stay in aria-label + title; toast via AppFeedback when present.
 *
 * When `showUrl` is false and `label` is set, the label itself opens the URL
 * (compact list rows — no long URL wrapping).
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
  const copyText = copyLabel || t(locale, 'panel.common.copyLink');
  const openText = openLabel || t(locale, 'panel.common.openLink');
  const hit = compact ? 'min-h-9 min-w-9' : 'min-h-touch min-w-touch';
  const labelAsLink = Boolean(label) && !showUrl && openable;

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

  const labelClass = 'font-mono text-[11px] tracking-[0.02em]';

  return (
    <div
      className={cn(
        'flex min-w-0',
        labelAsLink ? 'flex-row flex-wrap items-center gap-1.5' : 'flex-col gap-1',
        className
      )}
    >
      {label && labelAsLink ? (
        canUse ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(labelClass, 'text-brand-500 underline underline-offset-2')}
            title={openText}
          >
            {label}
          </a>
        ) : (
          <span className={cn(labelClass, 'text-ink-faint')}>{label}</span>
        )
      ) : label ? (
        <span className={cn(labelClass, 'text-ink-faint')}>{label}</span>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {showUrl ? (
          canUse && openable ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 max-w-full break-all font-mono text-xs text-brand-500 underline underline-offset-2"
              title={openText}
            >
              {href}
            </a>
          ) : (
            <span
              className={cn(
                'min-w-0 max-w-full break-all font-mono text-xs',
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
          className={cn(
            iconActionClass,
            hit,
            'border-brand-500/35 bg-brand-500/[0.09] text-brand-600'
          )}
          aria-label={copyText}
          title={copyText}
        >
          <Icon name="copy" />
        </button>
        {openable && !showUrl && !labelAsLink && canUse ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              iconActionClass,
              hit,
              'border-ink/12 bg-transparent text-ink-muted no-underline'
            )}
            aria-label={openText}
            title={openText}
          >
            <Icon name="externalLink" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
