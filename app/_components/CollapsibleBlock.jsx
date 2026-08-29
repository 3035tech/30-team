'use client';

import { useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';

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

  return (
    <div className={cn(bordered && 'border-t border-ink/10', className)}>
      <button
        type="button"
        className="flex min-h-touch w-full cursor-pointer items-center justify-between gap-2 border-none bg-transparent px-0 py-2 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-ink-faint" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
        <span className="sr-only">
          {open ? t(locale, 'panel.common.collapse') : t(locale, 'panel.common.expand')}
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
