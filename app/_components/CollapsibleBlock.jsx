'use client';

import { useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { Icon } from './Icon';

/**
 * Canonical Expand / Collapse label (pt-BR + en via `panel.common.*`).
 * Use everywhere content disclosure appears — never invent ▾ / + / − alone.
 */
export function disclosureActionLabel(locale, open) {
  return open
    ? t(locale, 'panel.common.collapse')
    : t(locale, 'panel.common.expand');
}

/**
 * Shared Expand/Collapse + chevron chrome (visible label in every locale).
 */
export function DisclosureToggle({
  locale = 'pt-BR',
  open = false,
  className = '',
  labelClassName = '',
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1.5 text-ink-muted', className)}
    >
      <span className={cn('font-mono text-2xs font-medium tracking-wide', labelClassName)}>
        {disclosureActionLabel(locale, open)}
      </span>
      <Icon
        name="chevronDown"
        className={cn(
          'shrink-0 transition-transform duration-150',
          open && 'rotate-180'
        )}
        aria-hidden
      />
    </span>
  );
}

/** Standalone toggle button (Overview cards, etc.) wrapping {@link DisclosureToggle}. */
export const disclosureToggleButtonClass =
  'inline-flex min-h-touch shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-ink/12 bg-transparent px-3 py-2 text-ink-muted hover:bg-ink/[0.03] disabled:cursor-default disabled:opacity-60';

/**
 * Lightweight disclosure for dense panels.
 * Prefer this (or {@link DisclosureToggle} on a custom header) over ad-hoc +/− / ▾.
 *
 * @param {'plain'|'card'|'panel'} [variant='plain']
 *   plain = border-t row (briefing/dossier)
 *   card  = rounded bordered header (employee home sections)
 *   panel = drawer form section (vacancy create/edit)
 */
export function CollapsibleBlock({
  locale = 'pt-BR',
  title,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
  className,
  count = null,
  bordered = true,
  variant = 'plain',
  collapsedHint = null,
  headerAside = null,
  titleClassName = '',
  id,
}) {
  const uncontrolled = openProp === undefined;
  const [internalOpen, setInternalOpen] = useState(Boolean(defaultOpen));
  const open = uncontrolled ? internalOpen : Boolean(openProp);
  const setOpen = (next) => {
    const v = typeof next === 'function' ? next(open) : next;
    if (uncontrolled) setInternalOpen(Boolean(v));
    onOpenChange?.(Boolean(v));
  };
  const panelId = useId();
  const label =
    count != null && Number.isFinite(Number(count))
      ? `${title} (${count})`
      : title;

  const headerBtn = (
    <button
      type="button"
      className={cn(
        'flex min-h-touch w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent text-left',
        variant === 'plain' && 'px-0 py-2.5 hover:bg-ink/[0.03]',
        variant === 'card' &&
          'rounded-control border border-ink/12 bg-canvas/60 px-3 py-2.5 hover:bg-ink/[0.03]',
        variant === 'panel' &&
          'rounded-none bg-ink/[0.02] px-3 py-2.5'
      )}
      aria-expanded={open}
      aria-controls={panelId}
      id={id}
      onClick={() => setOpen((v) => !v)}
    >
      <span
        className={cn(
          'min-w-0 font-mono text-2xs uppercase tracking-wider text-ink-muted',
          titleClassName
        )}
      >
        {label}
      </span>
      <span className="inline-flex shrink-0 items-center gap-2">
        {headerAside}
        <DisclosureToggle locale={locale} open={open} />
      </span>
    </button>
  );

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-control border border-ink/12',
          className
        )}
      >
        {headerBtn}
        {open ? (
          <div
            id={panelId}
            className="flex flex-col gap-3 border-t border-ink/10 bg-surface px-3 py-3"
          >
            {children}
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(className)}>
        {headerBtn}
        {!open && collapsedHint ? (
          <p className="m-0 mt-2 font-mono text-2xs text-ink-faint">{collapsedHint}</p>
        ) : null}
        {open ? (
          <div id={panelId} className="mt-3">
            {children}
          </div>
        ) : null}
      </div>
    );
  }

  // plain
  return (
    <div className={cn(bordered && 'border-t border-ink/10', className)}>
      {headerBtn}
      {!open && collapsedHint ? (
        <p className="m-0 mb-2 font-mono text-2xs text-ink-faint">{collapsedHint}</p>
      ) : null}
      {open ? (
        <div id={panelId} className="pb-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
