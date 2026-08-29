'use client';

import { cn } from '../../lib/cn';
import { copyToClipboard } from '../../lib/clipboard';
import { t } from '../../lib/i18n';
import { useAppFeedbackOptional } from './AppFeedback';
import { Icon } from './Icon';
import { IconActionTip } from './IconActionTip';

const iconActionClass =
  'inline-flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-control border p-0 disabled:cursor-default disabled:opacity-50';

/**
 * Shareable URL for managers: clickable link + icon actions (copy / open).
 * Labels stay in aria-label + title + IconActionTip (immediate hover); toast via AppFeedback when present.
 *
 * When `showUrl` is false and `label` is set (and not `iconOnly`), the label
 * itself opens the URL (compact list rows — no long URL wrapping).
 *
 * When `iconOnly` is true (preferred in admin grids): only copy + open icons;
 * `label` enriches tooltips/aria, never shown as text.
 *
 * @param {{
 *   url: string,
 *   locale?: string,
 *   label?: string,
 *   showUrl?: boolean,
 *   iconOnly?: boolean,
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
  iconOnly = false,
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
  const context = String(label || '').trim();
  const copyBase = copyLabel || t(locale, 'panel.common.copyLink');
  const openBase = openLabel || t(locale, 'panel.common.openLink');
  const copyText = context && !copyLabel ? `${copyBase} — ${context}` : copyBase;
  const openText = context && !openLabel ? `${openBase} — ${context}` : openBase;
  const hit = compact ? 'min-h-9 min-w-9' : 'min-h-touch min-w-touch';
  const displayUrl = iconOnly ? false : showUrl;
  const labelAsLink = Boolean(context) && !displayUrl && !iconOnly && openable;
  const showOpenIcon = openable && canUse && (iconOnly || (!displayUrl && !labelAsLink));

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

  const labelClass = 'font-mono text-2xs tracking-[0.02em]';

  return (
    <div
      className={cn(
        'flex min-w-0',
        iconOnly || labelAsLink ? 'flex-row flex-wrap items-center gap-1.5' : 'flex-col gap-1',
        className
      )}
    >
      {context && labelAsLink ? (
        canUse ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(labelClass, 'text-brand-500 underline underline-offset-2')}
            title={openText}
          >
            {context}
          </a>
        ) : (
          <span className={cn(labelClass, 'text-ink-faint')}>{context}</span>
        )
      ) : context && !iconOnly && displayUrl ? (
        <span className={cn(labelClass, 'text-ink-faint')}>{context}</span>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {displayUrl ? (
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
        <IconActionTip label={copyText}>
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
        </IconActionTip>
        {showOpenIcon ? (
          <IconActionTip label={openText}>
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
          </IconActionTip>
        ) : null}
      </div>
    </div>
  );
}
