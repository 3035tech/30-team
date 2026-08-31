'use client';

import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/**
 * Shared chrome for lean distribution charts (B-3020).
 */
export function ChartPanel({ title, hint, children, className = '', actions = null }) {
  return (
    <div
      className={cn(
        'rounded-control border border-ink/10 bg-canvas-alt/40 px-3 py-3',
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
          {title ? <div className={cn(S.label, 'mb-0')}>{title}</div> : <span />}
          {actions}
        </div>
      )}
      {hint ? (
        <p className="mb-2.5 mt-0 font-mono text-2xs leading-snug text-ink-faint">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Compact color legend with optional % of total (salary / succession stacks).
 * @param {{ items: Array<{ id: string, toneClass: string, label: string, value: number }>, total?: number|null, className?: string }} props
 */
export function ChartLegend({ items = [], total = null, className = '' }) {
  const rows = (Array.isArray(items) ? items : []).filter((i) => i);
  if (rows.length === 0) return null;
  const totalN =
    total != null && Number.isFinite(Number(total)) && Number(total) > 0
      ? Number(total)
      : null;

  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-4 gap-y-1 font-mono text-2xs text-ink-muted',
        className
      )}
    >
      {rows.map((leg) => {
        const n = Number(leg.value) || 0;
        const pct = totalN != null ? Math.round((n / totalN) * 100) : null;
        return (
          <span key={leg.id} className="inline-flex items-center gap-1.5">
            <span
              className={cn('inline-block h-2 w-2 shrink-0 rounded-sm', leg.toneClass)}
              aria-hidden
            />
            <span>
              {leg.label}: {n}
              {pct != null ? (
                <span className="text-ink-faint"> ({pct}%)</span>
              ) : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}
