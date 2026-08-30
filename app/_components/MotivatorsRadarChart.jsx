'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { t } from '../../lib/i18n';
import { LOGO } from '../../lib/brand';
import { C } from '../../lib/theme';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import {
  buildMotivatorsRadarPoints,
  pickMotivatorsRadarPeaks,
} from '../../lib/ae/motivators-radar';

function RadarTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-control border border-ink/12 bg-surface px-2.5 py-1.5 shadow-sm">
      <div className="font-mono text-2xs text-ink-faint">{row.label}</div>
      <div className="mt-0.5 text-prose font-medium text-ink">
        {Math.round(Number(row.score) || 0)}
        <span className="ml-1 font-normal text-ink-muted">
          {t(locale, 'panel.team.motivatorsRadarScore')}
        </span>
      </div>
    </div>
  );
}

function AngleTick({ x, y, payload }) {
  const label = payload?.value ?? '';
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="middle"
      fill={C.neutral}
      fontSize={10}
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
    >
      {label}
    </text>
  );
}

/**
 * Spider / radar for Motivadores (13 dims) — Equipe ficha.
 *
 * @param {{
 *   locale?: string,
 *   dimensionScores?: Record<string, number>|null,
 *   dimensions?: Array<{ key: string, label?: string, score?: number, color?: string }>|null,
 *   className?: string,
 *   compact?: boolean,
 *   hideHeader?: boolean,
 *   showPeaks?: boolean,
 * }} props
 */
export function MotivatorsRadarChart({
  locale = 'pt-BR',
  dimensionScores = null,
  dimensions = null,
  className = '',
  compact = false,
  hideHeader = false,
  showPeaks = true,
}) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(!!mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const data = useMemo(() => {
    if (Array.isArray(dimensions) && dimensions.length) {
      const asMap = Object.fromEntries(
        dimensions.map((d) => [d.key, Number(d.score) || 0])
      );
      const base = buildMotivatorsRadarPoints(asMap, locale);
      const colorByKey = Object.fromEntries(
        dimensions.map((d) => [d.key, d.color || null])
      );
      return base.map((p) => ({
        ...p,
        color: colorByKey[p.key] || p.color,
      }));
    }
    return buildMotivatorsRadarPoints(dimensionScores, locale);
  }, [dimensionScores, dimensions, locale]);

  const peaks = useMemo(
    () => (showPeaks ? pickMotivatorsRadarPeaks(data, 3) : []),
    [data, showPeaks]
  );

  const hasSignal = data.some((d) => d.score > 0);
  if (!hasSignal) return null;

  const height = compact ? 240 : 300;
  const outerRadius = compact ? '68%' : '70%';
  const fill = LOGO.primary;
  const stroke = LOGO.petalDeep;

  return (
    <div className={cn('w-full', className)}>
      {!hideHeader ? (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className={S.label}>{t(locale, 'panel.team.motivatorsRadarTitle')}</span>
          <span className="font-mono text-2xs text-ink-faint">
            {t(locale, 'panel.team.motivatorsRadarHint')}
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          'relative w-full overflow-hidden rounded-control border border-ink/8 bg-canvas/80',
          compact ? 'px-1 py-1' : 'px-2 py-2'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background: `radial-gradient(ellipse at 50% 45%, ${LOGO.petalLavender}33 0%, transparent 62%)`,
          }}
          aria-hidden
        />
        <div
          className="relative w-full"
          style={{ height }}
          role="img"
          aria-label={t(locale, 'panel.team.motivatorsRadarTitle')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="52%" outerRadius={outerRadius} data={data} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
              <PolarGrid stroke={C.border} gridType="polygon" radialLines />
              <PolarAngleAxis dataKey="shortLabel" tick={<AngleTick />} tickLine={false} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={5}
                tick={{ fill: C.faint, fontSize: 9 }}
                axisLine={false}
                tickFormatter={(v) => (v === 0 || v === 100 ? String(v) : '')}
              />
              <Radar
                name={t(locale, 'panel.team.motivatorsRadarSeries')}
                dataKey="score"
                stroke={stroke}
                fill={fill}
                fillOpacity={0.22}
                strokeWidth={2}
                dot={{ r: 2.5, fill: stroke, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: fill, stroke: stroke, strokeWidth: 1 }}
                isAnimationActive={!reduceMotion}
                animationDuration={reduceMotion ? 0 : 420}
              />
              <Tooltip
                content={<RadarTooltip locale={locale} />}
                cursor={{ stroke: LOGO.petalSoft, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {peaks.length > 0 ? (
        <div className="mt-2.5">
          <span className={cn(S.label, 'mb-1.5')}>
            {t(locale, 'panel.team.motivatorsRadarPeaks')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {peaks.map((d) => (
              <span
                key={d.key}
                className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-control border bg-surface px-2.5 text-xs text-ink',
                  !d.color && 'border-ink/12'
                )}
                style={d.color ? { borderColor: d.color } : undefined}
              >
                <span className="max-w-[12rem] truncate">{d.label}</span>
                <span className="font-mono text-2xs text-ink-faint">{Math.round(d.score)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {hideHeader ? (
        <p className="mb-0 mt-2 font-mono text-2xs text-ink-faint">
          {t(locale, 'panel.team.motivatorsRadarHint')}
        </p>
      ) : null}
    </div>
  );
}
