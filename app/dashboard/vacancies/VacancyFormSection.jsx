'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';

/**
 * Progressive section for vacancy create/edit drawers.
 */
export function VacancyFormSection({ locale, titleKey, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-control border border-ink/12">
      <button
        type="button"
        className="flex min-h-touch w-full cursor-pointer items-center justify-between gap-2 border-none bg-ink/[0.02] px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          {t(locale, titleKey)}
        </span>
        <span className="font-mono text-xs text-ink-faint" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div className={cn('flex flex-col gap-3 border-t border-ink/10 bg-white px-3 py-3')}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
