'use client';

import { BR_STATES, BR_UF_SET } from '../../lib/candidate-profile';
import { t } from '../../lib/i18n';

/** Select fixo com as 27 UFs brasileiras. */
export function BrStateSelect({
  value = '',
  onChange,
  locale = 'pt-BR',
  style,
  className,
  id,
  'aria-label': ariaLabel,
}) {
  const uf = String(value || '').trim().toUpperCase();
  const selectValue = BR_UF_SET.has(uf) ? uf : '';

  return (
    <select
      id={id}
      className={className}
      value={selectValue}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel || t(locale, 'recruiting.statePh')}
      style={style}
    >
      <option value="">{t(locale, 'recruiting.statePh')}</option>
      {BR_STATES.map((s) => (
        <option key={s.uf} value={s.uf}>
          {s.uf} — {s.name}
        </option>
      ))}
    </select>
  );
}
