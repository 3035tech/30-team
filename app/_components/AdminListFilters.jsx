'use client';

import { cn } from '../../lib/cn';
import { fieldSelectCompactClass } from './form-control-styles';
import { FormField } from './FormField';

/**
 * Single-row filter bar for admin listagens.
 * Keep controls on one horizontal line (overflow-x on narrow viewports).
 * Children: AdminListSearch + AdminListFilterSelect (column-aligned filters only).
 */
export function AdminListFilters({ children, className = '', 'aria-label': ariaLabel }) {
  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className={cn(
        'mb-3 flex flex-nowrap items-start gap-2.5 overflow-x-auto pb-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Compact select filter for a listing column (label above via FormField).
 */
export function AdminListFilterSelect({
  label,
  value,
  onChange,
  children,
  className = '',
  selectClassName = '',
  disabled = false,
}) {
  return (
    <FormField label={label} className={cn('min-w-[9.5rem] max-w-[14rem] shrink-0', className)}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label={label}
        className={cn(fieldSelectCompactClass, 'w-full min-w-[9.5rem]', selectClassName)}
      >
        {children}
      </select>
    </FormField>
  );
}
