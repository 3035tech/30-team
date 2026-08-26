'use client';

import { useState } from 'react';
import { TYPE_DATA } from '../../lib/data';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';

/**
 * Editor visual de rubrica (pesos T1-T9)
 * Para Job Roles e Vagas
 */
export function RubricEditor({ value = {}, onChange, locale = 'pt-BR', compact = false }) {
  const types = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
  
  const handleChange = (type, newValue) => {
    const numValue = parseInt(newValue) || 0;
    const updated = { ...value, [type]: numValue };
    // Remove zero values
    if (numValue === 0) {
      delete updated[type];
    }
    onChange?.(updated);
  };

  const total = Object.values(value).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
  const isOverweight = total > 100;

  if (compact) {
    // Compact mode: horizontal chips
    return (
      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const weight = value[type] || 0;
          if (weight === 0) return null;
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs"
              style={{
                backgroundColor: `${TYPE_DATA[type]?.color}15`,
                color: TYPE_DATA[type]?.color,
              }}
            >
              {type} <span className="font-semibold">{weight}%</span>
            </span>
          );
        })}
        {Object.keys(value).length === 0 && (
          <span className="text-xs text-ink-muted">{t(locale, 'common.empty')}</span>
        )}
      </div>
    );
  }

  // Full mode: sliders
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {types.map((type) => {
          const weight = value[type] || 0;
          const typeData = TYPE_DATA[type];
          
          return (
            <div key={type} className="flex items-center gap-3">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded font-mono text-xs font-medium text-white"
                style={{ backgroundColor: typeData?.color }}
                title={typeData?.name || type}
              >
                {type}
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weight}
                onChange={(e) => handleChange(type, e.target.value)}
                className="flex-1"
                style={{
                  accentColor: typeData?.color,
                }}
              />
              
              <input
                type="number"
                min="0"
                max="100"
                value={weight}
                onChange={(e) => handleChange(type, e.target.value)}
                className={cn(
                  'w-14 rounded border border-ink/12 px-2 py-1 text-center font-mono text-sm tabular-nums',
                  weight > 0 && 'font-semibold'
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t border-ink/12 pt-2">
        <span className="font-mono text-xs text-ink-muted">
          {t(locale, 'recruiting.rubricTotal')}:
        </span>
        <span
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            isOverweight ? 'text-danger' : total === 100 ? 'text-success' : 'text-ink'
          )}
        >
          {total}%
        </span>
      </div>

      {isOverweight && (
        <p className="m-0 text-xs text-danger">
          {t(locale, 'recruiting.rubricOverweight')}
        </p>
      )}
    </div>
  );
}
