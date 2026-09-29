'use client';

import { useId } from 'react';
import { TYPE_DATA } from '../../lib/data';
import { t, t as i18nT, localeHtmlLang } from '../../lib/i18n';
import { cn } from '../../lib/cn';

/**
 * Editor visual de rubrica (pesos T1-T9)
 * Para Job Roles e Vagas
 */
export function RubricEditor({ value = {}, onChange, locale = 'pt-BR', compact = false }) {
  const id = useId();
  const types = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
  const explanation = i18nT(locale, 'ui.rubricEditor.eachWeightIsIndependentFrom');
  
  const handleChange = (type, newValue) => {
    const parsed = Number(newValue);
    const numValue = Number.isNaN(parsed) ? 0 : Math.round(Math.min(100, Math.max(0, parsed)));
    const updated = { ...value, [type]: numValue };
    // Remove zero values
    if (numValue === 0) {
      delete updated[type];
    }
    onChange?.(updated);
  };

  const total = types.reduce((sum, type) => sum + (Number(value[type]) || 0), 0);
  const formattedTotal = new Intl.NumberFormat(localeHtmlLang(locale), {
    maximumFractionDigits: 10,
  }).format(total);
  const summary = (
    <>
      <div className="flex items-center justify-between gap-2 border-t border-ink/12 pt-2" role="status" aria-live="polite" aria-atomic="true">
        <span className="font-mono text-prose text-ink-muted">
          {t(locale, 'recruiting.rubricTotal')} ({i18nT(locale, 'ui.rubricEditor.informational')}):
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-ink">{formattedTotal}%</span>
      </div>
      <p id={`${id}-help`} className="m-0 text-prose text-ink-muted">{explanation}</p>
    </>
  );

  if (compact) {
    // Compact mode: horizontal chips
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {types.map((type) => {
            const weight = value[type] || 0;
            if (Number(weight) === 0) return null;
            const typeData = TYPE_DATA[Number(type.slice(1))];
            return (
              <span
                key={type}
                className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full px-2 py-1 text-prose"
                style={{
                  backgroundColor: `${typeData?.color || '#6b7280'}15`,
                }}
              >
                <span className="font-mono text-ink">{type}</span> <span className="text-ink">{typeData?.name || type}</span>
                <span className="font-mono font-semibold">{weight}%</span>
              </span>
            );
          })}
        </div>
        {!types.some(type => Number(value[type]) > 0) ? <span className="text-prose text-ink-muted">{t(locale, 'common.empty')}</span> : null}
        {summary}
      </div>
    );
  }

  // Full mode: sliders
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
        {types.map((type) => {
          const weight = value[type] || 0;
          const typeData = TYPE_DATA[Number(type.slice(1))];
          
          return (
            <div key={type} className="flex min-w-0 flex-col gap-2">
              <label id={`${id}-${type}-label`} htmlFor={`${id}-${type}-range`} className="flex items-center gap-2 text-prose text-ink-muted">
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded font-mono text-prose font-medium text-ink"
                  style={{ backgroundColor: `${typeData?.color || '#6b7280'}25` }}
                >
                  {type}
                </span>
                <span>
                  {typeData?.name || type} — {i18nT(locale, 'ui.rubricEditor.weight')} (%)
                </span>
              </label>
              
              <div className="flex min-w-0 items-center gap-3">
                <input
                  id={`${id}-${type}-range`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  aria-describedby={`${id}-help`}
                  aria-valuetext={`${weight}%`}
                  value={weight}
                  onChange={(e) => handleChange(type, e.target.value)}
                  className="min-w-0 flex-1"
                  style={{ accentColor: typeData?.color }}
                />

                <input
                  id={`${id}-${type}-number`}
                  aria-labelledby={`${id}-${type}-label`}
                  aria-describedby={`${id}-help`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={weight}
                  onChange={(e) => handleChange(type, e.target.value)}
                  className={cn(
                    'w-20 shrink-0 rounded border border-ink/12 px-2 py-1 text-center font-mono text-sm tabular-nums',
                    weight > 0 && 'font-semibold'
                  )}
                />
                <span aria-hidden="true" className="text-prose text-ink-muted">%</span>
              </div>
            </div>
          );
        })}
      </div>

      {summary}
    </div>
  );
}
