'use client';

import { useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { Icon } from './Icon';

/**
 * Lightweight disclosure for dense panels (briefing, 1:1 chrome).
 * Prefer this over nested cards for progressive disclosure.
 */
export function CollapsibleBlock({
  locale = 'pt-BR',
  title,
  defaultOpen = false,
  children,
  className,
  count = null,
  bordered = true,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const panelId = useId();
  const label =
    count != null && Number.isFinite(Number(count))
      ? `${title} (${count})`
      : title;
  const actionLabel = open
    ? t(locale, 'panel.common.collapse')
    : t(locale, 'panel.common.expand');

  return (
    <div className={cn(bordered && 'border-t border-ink/10', className)}>
      <button
        type="button"
        className="flex min-h-touch w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent px-0 py-2.5 text-left hover:bg-ink/[0.03]"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 font-mono text-2xs uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-ink-muted">
          <span className="font-mono text-2xs font-medium tracking-wide">{actionLabel}</span>
          <Icon
            name="chevronDown"
            className={cn('shrink-0 transition-transform duration-150', open && 'rotate-180')}
          />
        </span>
      </button>
      {open ? (
        <div id={panelId} className="pb-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
