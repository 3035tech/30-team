'use client';

import { cn } from '../../lib/cn';

// Shared account presentation for employee, HR and administrator views.
export const profilePanelClass = 'rounded-card border border-ink/10 bg-canvas/35 p-5 sm:p-6';
export const profilePanelHeaderClass = 'mb-5 border-b border-ink/10 pb-4';
export const profileMenuPanelClass = 'absolute right-0 top-[calc(100%+8px)] z-40 w-[220px] max-w-[min(320px,92vw)] overflow-hidden rounded-xl border border-ink/12 bg-surface shadow-menu db-dropdown-panel';
export const profileMenuItemClass = 'flex min-h-touch w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-3.5 py-3 text-left font-mono text-xs text-ink no-underline hover:bg-ink/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500';

export function ProfileMenuTrigger({ label, fallback, open, controls, ariaLabel, onClick }) {
  return (
    <button type="button"
      className={cn('db-profile-btn flex h-[42px] max-w-[200px] cursor-pointer items-center gap-2 rounded-xl border border-ink/12 px-3 font-mono text-xs text-ink-muted', open ? 'bg-brand-500/[0.07]' : 'bg-surface/90')}
      onClick={onClick} aria-expanded={open} aria-haspopup="true" aria-controls={controls} aria-label={ariaLabel}>
      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-2xs text-brand-500" aria-hidden="true">{(label || '?').slice(0, 1).toUpperCase()}</span>
      <span className="db-profile-label overflow-hidden text-ellipsis whitespace-nowrap">{label || fallback}</span>
    </button>
  );
}
