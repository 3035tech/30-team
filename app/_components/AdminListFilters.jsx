'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { fieldSelectCompactClass } from './form-control-styles';
import { FormField } from './FormField';
import { ContentEnter } from './AppLoading';

const clearBtnClass =
  'inline-flex min-h-touch shrink-0 cursor-pointer items-center justify-center rounded-control border border-ink/12 bg-transparent px-3.5 py-2.5 font-mono text-xs text-ink-muted disabled:cursor-default disabled:opacity-45';

/**
 * Single-row filter bar for admin listagens.
 * Children: AdminListSearch + AdminListFilterSelect only — never AdminCreateButton.
 * Optional `onClear` renders “Limpar filtros” at the end (standard; no Buscar button).
 * Search submits on Enter when AdminListSearch has onSubmit; filtering is live via onChange.
 */
export function AdminListFilters({
  children,
  className = '',
  'aria-label': ariaLabel,
  locale = 'pt-BR',
  onClear,
  clearEnabled = false,
}) {
  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className={cn(
        'mb-3 flex flex-nowrap items-end gap-2.5 overflow-x-auto pb-0.5',
        className
      )}
    >
      {children}
      {typeof onClear === 'function' ? (
        <button
          type="button"
          onClick={onClear}
          disabled={!clearEnabled}
          className={clearBtnClass}
        >
          {t(locale, 'panel.common.clearFilters')}
        </button>
      ) : null}
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

/**
 * Wraps list results (table / empty / pager block) so filter changes re-trigger ContentEnter.
 */
export function AdminListResults({ animKey, children, className = '' }) {
  if (animKey === undefined || animKey === null || animKey === '') {
    return <div className={className}>{children}</div>;
  }
  return (
    <ContentEnter animKey={String(animKey)} className={cn('w-full', className)}>
      {children}
    </ContentEnter>
  );
}
