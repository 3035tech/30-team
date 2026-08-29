'use client';

import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/**
 * KPI / metric tile (big number + mono label). Overview, Leadership, Analytics.
 */
export function StatMetricTile({
  value,
  label,
  color = null,
  onClick = null,
  className = '',
  hero = false,
  hint = null,
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick || undefined}
      className={cn(
        'rounded-control border border-ink/12 bg-ink/[0.02] px-3.5 py-3 text-left',
        onClick && 'min-h-touch cursor-pointer hover:bg-ink/[0.04]',
        className
      )}
    >
      <div
        className={cn(hero ? S.cardMetricHero : S.cardMetric, 'text-ink')}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-2xs uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      {hint ? (
        <div className="mt-1.5 font-ui text-2xs leading-snug text-ink-faint">{hint}</div>
      ) : null}
    </Tag>
  );
}
