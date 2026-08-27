'use client';

import { cn } from '../../lib/cn';

/**
 * Shared date / datetime control for dashboard forms.
 * Prefer this over raw `<input type="date">` so styling and a11y stay consistent.
 *
 * @param {'date'|'datetime-local'} [mode='date']
 */
export function DateField({
  mode = 'date',
  value = '',
  onChange,
  id,
  name,
  className = '',
  disabled = false,
  required = false,
  min,
  max,
  step,
  placeholder,
  'aria-label': ariaLabel,
  title,
}) {
  const inputType = mode === 'datetime-local' ? 'datetime-local' : 'date';

  return (
    <input
      type={inputType}
      id={id}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'box-border min-h-touch w-full cursor-pointer rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-2.5 font-mono text-[13px] text-ink',
        'disabled:cursor-default disabled:opacity-55',
        className
      )}
    />
  );
}
