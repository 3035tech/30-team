'use client';

import { cn } from '../../lib/cn';
import { MeterBar } from './MeterBar';

/**
 * Horizontal category bars (label · meter · value). Lean viz over lists (B-3020).
 *
 * @param {{
 *   items: Array<{ id: string, label: string, value: number, toneClass?: string }>,
 *   max?: number|null,
 *   total?: number|null,
 *   includeZero?: boolean,
 *   className?: string,
 *   labelClassName?: string,
 *   height?: number,
 * }} props
 */
export function CategoryBars({
  items = [],
  max = null,
  total = null,
  includeZero = false,
  valueSuffix = '',
  className = '',
  labelClassName = 'w-[7.5rem] shrink-0 truncate text-prose text-ink sm:w-[9.5rem]',
  height = 8,
}) {
  const rows = (Array.isArray(items) ? items : []).filter((i) => {
    if (!i) return false;
    const v = Number(i.value) || 0;
    return includeZero ? true : v > 0;
  });
  if (rows.length === 0) return null;

  const maxV =
    max != null && Number.isFinite(Number(max))
      ? Math.max(Number(max), 0.01)
      : Math.max(...rows.map((i) => Number(i.value) || 0), 0.01);

  const totalN =
    total != null && Number.isFinite(Number(total)) && Number(total) > 0
      ? Number(total)
      : null;

  return (
    <ul className={cn('m-0 flex list-none flex-col gap-2 p-0', className)}>
      {rows.map((row) => {
        const value = Number(row.value) || 0;
        const pct =
          totalN != null ? Math.round((value / totalN) * 100) : null;
        const suffix = row.valueSuffix != null ? row.valueSuffix : valueSuffix;
        const core = `${value}${suffix}`;
        const valueText = pct != null ? `${core} · ${pct}%` : core;
        return (
          <li key={row.id} className="flex min-h-[1.25rem] items-center gap-2.5 sm:gap-3">
            <div className={labelClassName} title={row.label}>
              {row.label}
            </div>
            <MeterBar
              value={value}
              max={maxV}
              height={height}
              className="min-w-0 flex-1 rounded-full"
              trackClassName="bg-ink/[0.06]"
              toneClass={cn('rounded-full', row.toneClass || 'bg-info')}
              aria-label={
                pct != null
                  ? `${row.label}: ${core} (${pct}%)`
                  : `${row.label}: ${core}`
              }
            />
            <span
              className={cn(
                'shrink-0 text-right font-mono text-2xs tabular-nums text-ink-muted',
                pct != null || suffix ? 'min-w-[2.75rem]' : 'w-8'
              )}
            >
              {valueText}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
