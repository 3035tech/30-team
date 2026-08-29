'use client';

import { cn } from '../../lib/cn';
import { statusToneClass } from './StatusToneChip';

/**
 * Soft inline banner (info / warning / danger / success). Not a modal/toast.
 */
export function InlineCallout({
  tone = 'info',
  children,
  className = '',
  role = 'status',
}) {
  return (
    <div
      role={role}
      className={cn(
        'rounded-control border px-3.5 py-2.5 font-ui text-prose leading-snug',
        statusToneClass(tone),
        className
      )}
    >
      {children}
    </div>
  );
}
