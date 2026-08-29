'use client';

import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { StatusToneChip } from './StatusToneChip';

/**
 * Overview insight row (Culture / Exit cards).
 */
export function InsightListItem({
  title,
  body = null,
  tone = null,
  toneLabel = null,
  className = '',
  children,
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-ink/5 bg-canvas-alt/30 p-3',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {tone && toneLabel ? <StatusToneChip tone={tone}>{toneLabel}</StatusToneChip> : null}
          <span className={S.cardRowTitle}>{title}</span>
        </div>
        {body ? <p className={cn(S.cardMuted, 'm-0 mt-1')}>{body}</p> : null}
        {children}
      </div>
    </div>
  );
}
