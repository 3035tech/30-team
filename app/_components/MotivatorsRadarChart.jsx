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

function AngleTick({ x, y, cx, cy, payload }) {
  const label = payload?.value ?? '';
  // Nudge labels slightly outward from the chart center.
  let tx = x;
  let ty = y;
  if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(x) && Number.isFinite(y)) {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const push = 6;
    tx = x + (dx / len) * push;
    ty = y + (dy / len) * push;
  }
  return (
    <text
      x={tx}
      y={ty}
      textAnchor="middle"
      dominantBaseline="central"
      fill={C.neutral}
      fontSize={10}
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
    >
      {label}
    </text>
  );
}

function PeakDot(props) {
  const { cx, cy, payload, peakKeys } = props;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const isPeak = peakKeys?.has(payload?.key);
  const fill = isPeak && payload?.color ? payload.color : LOGO.petalDeep;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isPeak ? 3.5 : 2.25}
      fill={fill}
      stroke={isPeak ? C.surface : 'transparent'}
      strokeWidth={isPeak ? 1.5 : 0}
    />
  );
}

/**
 * Spider / radar for Motivadores (13 dims).
 *
 * @param {{
 *   locale?: string,
 *   dimensionScores?: Record<string, number>|null,
 *   dimensions?: Array<{ key: string, label?: string, score?: number, color?: string }>|null,
 *   className?: string,
 *   compact?: boolean,
 *   hideHeader?: boolean,
 *   showPeaks?: boolean,
 *   embedded?: boolean,
 *   title?: string,
 *   hint?: string,
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
  embedded = false,
  title = null,
  hint = null,
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
    () => pickMotivatorsRadarPeaks(data, 3),
    [data]
  );
  const peakKeys = useMemo(() => new Set(peaks.map((p) => p.key)), [peaks]);

  const hasSignal = data.some((d) => d.score > 0);
  if (!hasSignal) return null;

  const height = compact ? 228 : 288;
  const outerRadius = compact ? '66%' : '68%';
  const fill = LOGO.primary;
  const stroke = LOGO.petalDeep;
  const heading = title || t(locale, 'panel.team.motivatorsRadarTitle');
  const sub = hint || t(locale, 'panel.team.motivatorsRadarHint');

  return (
    <div className={cn('w-full', className)}>
      {!hideHeader ? (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className={S.label}>{heading}</span>
          <span className="font-mono text-2xs text-ink-faint">{sub}</span>
        </div>
      ) : null}

      <div
        className={cn(
          'relative w-full overflow-hidden',
          embedded
            ? 'rounded-control bg-canvas/50'
            : 'rounded-control border border-ink/8 bg-canvas/80',
          compact ? 'px-0.5 py-0.5' : 'px-1.5 py-1.5'
        )}
      >
        {!embedded ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.28]"
            style={{
              background: `radial-gradient(ellipse at 50% 45%, ${LOGO.petalLavender}40 0%, transparent 64%)`,
            }}
            aria-hidden
          />
        ) : null}
        <div
          className="relative w-full"
          style={{ height }}
          role="img"
          aria-label={heading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="52%"
              outerRadius={outerRadius}
              data={data}
              margin={{ top: 10, right: 14, bottom: 10, left: 14 }}
            >
              <PolarGrid stroke={C.border} gridType="polygon" radialLines strokeOpacity={0.9} />
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
                fillOpacity={0.2}
                strokeWidth={2}
                dot={(dotProps) => <PeakDot {...dotProps} peakKeys={peakKeys} />}
                activeDot={{ r: 4.5, fill, stroke, strokeWidth: 1 }}
                isAnimationActive={!reduceMotion}
                animationDuration={reduceMotion ? 0 : 380}
              />
              <Tooltip
                content={<RadarTooltip locale={locale} />}
                cursor={{ stroke: LOGO.petalSoft, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showPeaks && peaks.length > 0 ? (
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
    </div>
  );
}
