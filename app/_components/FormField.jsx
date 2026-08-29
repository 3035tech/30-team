'use client';

import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/**
 * Labeled form control for dashboard grids and system forms.
 * Always keeps label above the control; use on flex/grid parents with `items-start`
 * so a tall hint never stretches sibling fields.
 *
 * @param {{
 *   label: string,
 *   children: import('react').ReactNode,
 *   hint?: string,
 *   className?: string,
 *   labelClassName?: string,
 *   htmlFor?: string,
 *   as?: 'label' | 'div',
 * }} props
 */
export function FormField({
  label,
  children,
  hint = null,
  className = '',
  labelClassName = '',
  htmlFor,
  as = 'label',
}) {
  const Tag = as === 'div' ? 'div' : 'label';
  return (
    <Tag
      htmlFor={as === 'label' ? htmlFor : undefined}
      className={cn(
        /* w-full: em coluna, self-start sozinho encolhe o campo ao conteúdo (e-mail ≠ senha). */
        'flex w-full min-w-0 flex-col gap-1',
        className
      )}
    >
      <span className={cn(S.label, 'mb-0', labelClassName)}>{label}</span>
      <div className="w-full min-w-0">{children}</div>
      {hint ? (
        <p className="m-0 font-mono text-2xs leading-snug text-ink-faint">{hint}</p>
      ) : null}
    </Tag>
  );
}

/** Flex row for FormFields — `items-start` prevents height bleed across columns. */
export const formFieldRowClass = 'flex flex-wrap items-start gap-2.5';

/** Shared control width in profile / candidate grids. */
export const formFieldGrowClass = 'min-w-0 flex-[1_1_140px]';

/** Softer label for public candidate / Motivators identity screens. */
export const formFieldCandLabelClass =
  'font-ui text-xs font-normal normal-case tracking-normal text-ink-muted';
