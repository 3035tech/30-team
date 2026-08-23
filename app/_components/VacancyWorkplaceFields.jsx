'use client';

import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { BrStateSelect } from './BrStateSelect';
import { BrCitySelect } from './BrCitySelect';
import {
  VACANCY_WORKPLACE_MODALITIES,
  workplaceModalityLabelKey,
} from '../../lib/vacancy-workplace';

const fieldLabelClass =
  'flex flex-col gap-1.5 font-mono text-[11px] text-ink-faint';

/**
 * Modalidade + UF + cidade (IBGE autocomplete) para create/edit de vaga.
 */
export function VacancyWorkplaceFields({
  locale,
  workplaceModality = '',
  workplaceState = '',
  workplaceCity = '',
  onChange,
  compact = false,
}) {
  const controlClass = cn(
    'box-border w-full rounded-control border border-ink/12 bg-ink/[0.03] font-mono text-ink-muted',
    compact ? 'px-2.5 py-2 text-[13px]' : 'px-3 py-2.5 text-xs'
  );

  return (
    <div className="grid max-w-[640px] grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      <label className={fieldLabelClass}>
        {t(locale, 'recruiting.workplaceModalityLabel')}
        <select
          value={workplaceModality || ''}
          onChange={(e) => onChange?.({ workplaceModality: e.target.value })}
          aria-label={t(locale, 'recruiting.workplaceModalityLabel')}
          className={cn(controlClass, 'cursor-pointer')}
        >
          <option value="">{t(locale, 'recruiting.workplaceModalityNone')}</option>
          {VACANCY_WORKPLACE_MODALITIES.map((mod) => (
            <option key={mod} value={mod}>
              {t(locale, workplaceModalityLabelKey(mod))}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldLabelClass}>
        {t(locale, 'recruiting.workplaceStateLabel')}
        <BrStateSelect
          locale={locale}
          value={workplaceState || ''}
          onChange={(uf) =>
            onChange?.({
              workplaceState: uf,
              workplaceCity: uf === workplaceState ? workplaceCity : '',
            })
          }
          aria-label={t(locale, 'recruiting.workplaceStateLabel')}
          className={cn(controlClass, 'cursor-pointer')}
        />
      </label>
      <label className={fieldLabelClass}>
        {t(locale, 'recruiting.workplaceCityLabel')}
        <BrCitySelect
          mode="autocomplete"
          locale={locale}
          uf={workplaceState || ''}
          value={workplaceCity || ''}
          onChange={(city) => onChange?.({ workplaceCity: city })}
          aria-label={t(locale, 'recruiting.workplaceCityLabel')}
          className={controlClass}
        />
        <span className="text-[10px] leading-[1.35] text-ink-faint">
          {t(locale, 'recruiting.workplaceCityHelp')}
        </span>
      </label>
    </div>
  );
}
