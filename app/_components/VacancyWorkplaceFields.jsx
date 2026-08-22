'use client';

import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { BrStateSelect } from './BrStateSelect';
import { BrCitySelect } from './BrCitySelect';
import {
  VACANCY_WORKPLACE_MODALITIES,
  workplaceModalityLabelKey,
} from '../../lib/vacancy-workplace';

const fieldLabel = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '11px',
  color: C.faint,
  fontFamily: 'monospace',
};

const controlBase = {
  width: '100%',
  background: 'rgba(26,22,37,.03)',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '10px 12px',
  color: C.muted,
  fontSize: '12px',
  fontFamily: 'monospace',
  boxSizing: 'border-box',
};

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
  const pad = compact ? '8px 10px' : '10px 12px';
  const control = { ...controlBase, padding: pad, fontSize: compact ? '13px' : '12px' };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        maxWidth: '640px',
      }}
    >
      <label style={fieldLabel}>
        {t(locale, 'recruiting.workplaceModalityLabel')}
        <select
          value={workplaceModality || ''}
          onChange={(e) => onChange?.({ workplaceModality: e.target.value })}
          aria-label={t(locale, 'recruiting.workplaceModalityLabel')}
          style={{ ...control, cursor: 'pointer' }}
        >
          <option value="">{t(locale, 'recruiting.workplaceModalityNone')}</option>
          {VACANCY_WORKPLACE_MODALITIES.map((mod) => (
            <option key={mod} value={mod}>
              {t(locale, workplaceModalityLabelKey(mod))}
            </option>
          ))}
        </select>
      </label>
      <label style={fieldLabel}>
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
          style={{ ...control, cursor: 'pointer' }}
        />
      </label>
      <label style={fieldLabel}>
        {t(locale, 'recruiting.workplaceCityLabel')}
        <BrCitySelect
          mode="autocomplete"
          locale={locale}
          uf={workplaceState || ''}
          value={workplaceCity || ''}
          onChange={(city) => onChange?.({ workplaceCity: city })}
          aria-label={t(locale, 'recruiting.workplaceCityLabel')}
          style={control}
        />
        <span style={{ fontSize: '10px', color: C.faint, lineHeight: 1.35 }}>
          {t(locale, 'recruiting.workplaceCityHelp')}
        </span>
      </label>
    </div>
  );
}
