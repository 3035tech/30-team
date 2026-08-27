'use client';

import { cn } from '../../lib/cn';
import { fieldInputClass } from './form-control-styles';

/**
 * Shared date / datetime control for dashboard forms.
 * Prefer this over raw `<input type="date">` so styling and a11y stay consistent.
 *
 * Click anywhere on the field opens the native picker (not only the calendar icon).
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

  const openPicker = (e) => {
    if (disabled) return;
    const el = e.currentTarget;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
      }
    } catch {
      /* Already open, unsupported, or blocked — native control still works */
    }
  };

  return (
    <input
      type={inputType}
      id={id}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      onClick={openPicker}
      disabled={disabled}
      required={required}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      className={cn(fieldInputClass, 'w-full cursor-pointer', className)}
    />
  );
}
