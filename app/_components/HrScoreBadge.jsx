'use client';

import { cn } from '../../lib/cn';

/**
 * Badge compacto de HR Score e Turnover Risk
 * Para uso na lista da Equipe
 */
export function HrScoreBadge({ score, risk, size = 'sm' }) {
  if (!score && !risk) return null;

  const sizeClasses = {
    xs: 'h-4 min-w-[16px] px-1 text-[9px]',
    sm: 'h-5 min-w-[20px] px-1.5 text-[10px]',
    md: 'h-6 min-w-[24px] px-2 text-[11px]',
  };

  const riskColors = {
    high: 'bg-danger/15 text-danger border-danger/30',
    medium: 'bg-warning/15 text-warning border-warning/30',
    low: 'bg-success/15 text-success border-success/30',
  };

  if (risk) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded border font-mono font-medium tabular-nums',
          sizeClasses[size],
          riskColors[risk] || riskColors.low
        )}
        title={`Turnover risk: ${risk}`}
      >
        {risk === 'high' ? '⚠' : risk === 'medium' ? '⚡' : '✓'}
      </span>
    );
  }

  if (score != null) {
    const colorClass =
      score >= 80
        ? 'bg-success/15 text-success border-success/30'
        : score >= 60
          ? 'bg-info/15 text-info border-info/30'
          : score >= 40
            ? 'bg-warning/15 text-warning border-warning/30'
            : 'bg-danger/15 text-danger border-danger/30';

    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded border font-mono font-medium tabular-nums',
          sizeClasses[size],
          colorClass
        )}
        title={`HR Score: ${score}/100`}
      >
        {score}
      </span>
    );
  }

  return null;
}
