'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/useLocale';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

/** Stop-motion loop: key poses hold longer, in-betweens are short so the crossfade reads as motion. */
const FRAMES = [
  { name: 'busy', ms: 1100 },
  { name: 'hangup', ms: 450 },
  { name: 'shock', ms: 1100 },
  { name: 'grip', ms: 450 },
  { name: 'scream', ms: 1000, jolt: true },
  { name: 'droop', ms: 550 },
  { name: 'collapse', ms: 1100 },
  { name: 'wake', ms: 600 },
];
const STILL_FRAME = FRAMES.findIndex((f) => f.name === 'shock');
const frameSrc = (name) => `/illustrations/hr-toon-${name}.webp`;

/** Returns the active frame and the previous one, which stays opaque underneath while the next fades in. */
function useFrameLoop() {
  const [frames, setFrames] = useState({ active: STILL_FRAME, prev: -1 });
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let current = STILL_FRAME;
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        const prev = current;
        current = (current + 1) % FRAMES.length;
        setFrames({ active: current, prev });
        schedule();
      }, FRAMES[current].ms);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return frames;
}

const PAPER_LINES = 'M8 12h30M8 20h34M8 28h22';

/** Overlay coordinates follow the photo's pixel grid (1024×768). */
const TOASTS = [
  { y: 186, dot: 'fill-danger', w: 92 },
  { y: 246, dot: 'fill-warning', w: 74 },
  { y: 306, dot: 'fill-danger', w: 84 },
];

function FlyingPaper({ className }) {
  return (
    <g className={className}>
      <g transform="translate(96 560)">
        <rect width="50" height="62" rx="4" className="fill-white stroke-black/15" strokeWidth="2" />
        <path d={PAPER_LINES} className="stroke-black/20" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  );
}

/**
 * Overloaded HR analyst as an 8-frame stop-motion loop with animated layers: notifications pile up
 * on the monitor, the phone rings, papers fly off the pile. Animation classes live in globals.css (`app-err-*`).
 */
function HrOverloadArt({ label }) {
  const { active, prev } = useFrameLoop();
  return (
    <div
      role="img"
      aria-label={label}
      className="app-err-art relative w-[min(440px,88vw)] overflow-hidden rounded-card border border-ink/10 bg-ink/[0.04] shadow-sm"
    >
      <div className={cn('relative isolate', FRAMES[active].jolt && 'app-err-jolt')}>
        <img
          src={frameSrc('shock')}
          alt=""
          width={960}
          height={720}
          decoding="async"
          className="block h-auto w-full"
        />
        {FRAMES.map((frame, i) => (
          <img
            key={frame.name}
            src={frameSrc(frame.name)}
            alt=""
            width={960}
            height={720}
            decoding="async"
            className={cn(
              'absolute inset-0 h-full w-full',
              i === active && 'z-[2] opacity-100 transition-opacity duration-200 ease-out motion-reduce:transition-none',
              i === prev && 'z-[1] opacity-100',
              i !== active && i !== prev && 'opacity-0',
            )}
          />
        ))}
      </div>
      <svg viewBox="0 0 1024 768" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">

        {TOASTS.map((toast, i) => (
          <g key={toast.y} className={`app-err-pop app-err-pop-${i + 1}`} style={{ transformOrigin: `930px ${toast.y + 20}px` }}>
            <rect x="856" y={toast.y} width="148" height="40" rx="8" className="fill-white/95 stroke-black/10" strokeWidth="2" />
            <circle cx="876" cy={toast.y + 20} r="7" className={toast.dot} />
            <path d={`M894 ${toast.y + 14}h${toast.w}M894 ${toast.y + 27}h${toast.w - 30}`} className="stroke-black/25" strokeWidth="5" strokeLinecap="round" />
          </g>
        ))}
        <g className="app-err-pulse" style={{ transformOrigin: '988px 132px' }}>
          <circle cx="988" cy="132" r="28" className="fill-danger stroke-white" strokeWidth="4" />
          <text x="988" y="142" textAnchor="middle" className="fill-white font-ui" fontSize="26" fontWeight="700">
            99+
          </text>
        </g>

        <path
          d="M34 470l-18-18M84 456v-26M134 470l18-18"
          className="app-err-ringwave stroke-danger/80"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path d="M288 560c-8-12 8-18 0-30" className="app-err-steam fill-none stroke-white/80" strokeWidth="5" strokeLinecap="round" />
        <path d="M314 560c-8-12 8-18 0-30" className="app-err-steam app-err-steam-2 fill-none stroke-white/80" strokeWidth="5" strokeLinecap="round" />

        <FlyingPaper className="app-err-fly app-err-fly-1" />
        <FlyingPaper className="app-err-fly app-err-fly-2" />
        <FlyingPaper className="app-err-fly app-err-fly-3" />
      </svg>
    </div>
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
        <HrOverloadArt label={t(locale, 'panel.common.appErrorArt')} />
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
