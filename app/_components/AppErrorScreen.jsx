'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/** HR person stamping a checklist while a gear spins: animation classes live in globals.css (`app-err-*`). */
function HrFixingArt({ label }) {
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-label={label}
      className="app-err-art block h-auto w-[min(260px,72vw)]"
    >
      <circle cx="120" cy="104" r="86" className="fill-ink/[0.04]" />

      <g className="app-err-gear" style={{ transformOrigin: '192px 46px' }}>
        <circle cx="192" cy="46" r="13" className="fill-none stroke-ink/30" strokeWidth="5" strokeDasharray="6 4" />
        <circle cx="192" cy="46" r="5" className="fill-ink/30" />
      </g>

      <g className="app-err-float-a">
        <rect x="30" y="38" width="30" height="38" rx="4" className="fill-surface stroke-ink/20" strokeWidth="2" transform="rotate(-12 45 57)" />
        <path d="M37 50h14M37 57h16M37 64h10" className="stroke-ink/20" strokeWidth="2" strokeLinecap="round" transform="rotate(-12 45 57)" />
      </g>
      <g className="app-err-float-b">
        <rect x="178" y="92" width="26" height="32" rx="4" className="fill-surface stroke-ink/20" strokeWidth="2" transform="rotate(10 191 108)" />
        <path d="M184 102h12M184 109h14" className="stroke-ink/20" strokeWidth="2" strokeLinecap="round" transform="rotate(10 191 108)" />
      </g>

      <path d="M40 170h160" className="stroke-ink/15" strokeWidth="3" strokeLinecap="round" />

      <g>
        <path d="M58 170c0-22 12-36 30-36s30 14 30 36" className="fill-brand-500/80" />
        <circle cx="88" cy="112" r="16" className="fill-warning/30 stroke-ink/40" strokeWidth="2" />
        <path d="M80 108h.01M96 108h.01" className="stroke-ink/70" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M82 118c4 3 8 3 12 0" className="fill-none stroke-ink/60" strokeWidth="2" strokeLinecap="round" />
        <path d="M72 104c2-12 30-14 32 0" className="fill-ink/60" />
        <g className="app-err-stamp" style={{ transformOrigin: '112px 150px' }}>
          <path d="M108 148l20-8" className="stroke-brand-500/80" strokeWidth="9" strokeLinecap="round" />
          <circle cx="131" cy="139" r="5" className="fill-warning/40 stroke-ink/40" strokeWidth="1.5" />
        </g>
      </g>

      <g>
        <rect x="128" y="112" width="44" height="56" rx="5" className="fill-surface stroke-ink/35" strokeWidth="2" />
        <rect x="142" y="107" width="16" height="9" rx="2.5" className="fill-ink/30" />
        {[128, 142, 156].map((y, i) => (
          <g key={y}>
            <path d={`M136 ${y}l3 3 6-6`} className={cn('fill-none stroke-success', `app-err-check app-err-check-${i + 1}`)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
            <path d={`M150 ${y}h14`} className="stroke-ink/25" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ))}
      </g>

      <g>
        <path d="M184 150h18v14a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z" className="fill-ink/15 stroke-ink/35" strokeWidth="2" />
        <path d="M202 154h3a4 4 0 0 1 0 8h-3" className="fill-none stroke-ink/35" strokeWidth="2" />
        <path d="M189 144c-3-4 3-6 0-10" className="app-err-steam fill-none stroke-ink/25" strokeWidth="2" strokeLinecap="round" />
        <path d="M196 144c-3-4 3-6 0-10" className="app-err-steam app-err-steam-2 fill-none stroke-ink/25" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Friendly full-area error state for route / global error boundaries.
 * @param {{ error?: Error & { digest?: string }, onRetry?: Function, homeHref?: string | null, className?: string }} props
 */
export function AppErrorScreen({ error, onRetry, homeHref = '/dashboard', className }) {
  const [locale] = useLocale();

  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  const code = error?.digest ? String(error.digest) : '';

  return (
    <main
      role="alert"
      className={cn('flex min-h-[70vh] w-full items-center justify-center px-5 py-12', className)}
    >
      <div className="ui-content-enter flex max-w-[460px] flex-col items-center gap-4 text-center">
        <HrFixingArt label={t(locale, 'panel.common.appErrorArt')} />
        <p className={cn(S.label, 'm-0')}>{t(locale, 'panel.common.appErrorEyebrow')}</p>
        <h1 className="m-0 font-display text-xl font-semibold sm:text-2xl leading-tight text-ink">
          {t(locale, 'panel.common.appErrorTitle')}
        </h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">{t(locale, 'panel.common.appErrorBody')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {typeof onRetry === 'function' ? (
            <button type="button" onClick={() => onRetry()} className={S.btnPrimary}>
              {t(locale, 'panel.common.appErrorRetry')}
            </button>
          ) : null}
          {homeHref ? (
            <a href={homeHref} className={cn(S.btnGhost, 'no-underline')}>
              {t(locale, 'panel.common.appErrorHome')}
            </a>
          ) : null}
        </div>
        {code ? (
          <p className="m-0 font-code text-xs text-ink-faint">{t(locale, 'panel.common.appErrorCode', { code })}</p>
        ) : null}
      </div>
    </main>
  );
}
