'use client';

import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { t } from '../../lib/i18n';
import { Icon } from './Icon';

/**
 * Compact preview of a stored signature stroke (PNG data URL).
 */
export function SignatureStrokePreview({
  src,
  alt = '',
  className = '',
  maxHeightClass = 'max-h-20',
}) {
  if (!src) return null;
  return (
    <figure
      className={cn(
        'mt-2 overflow-hidden rounded-control border border-ink/10 bg-white',
        className
      )}
    >
      {/* data URL stroke — not a remote asset */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'block w-full object-contain object-left px-2 py-1.5',
          maxHeightClass
        )}
      />
    </figure>
  );
}

/**
 * Pointer-friendly signature pad (mouse / touch / stylus) via `signature_pad`.
 * Ref API: clear(), isEmpty(), toDataURL().
 */
export function SignaturePadField({
  locale = 'pt-BR',
  className = '',
  height = 180,
  disabled = false,
  padRef = null,
  onEmptyChange = null,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const padInstanceRef = useRef(null);
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;
  const [empty, setEmpty] = useState(true);

  const setEmptyState = (next) => {
    setEmpty(next);
    onEmptyChangeRef.current?.(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(15, 23, 42)',
      minWidth: 0.7,
      maxWidth: 2.4,
      velocityFilterWeight: 0.7,
      throttle: 16,
    });
    padInstanceRef.current = pad;

    const syncEmpty = () => setEmptyState(pad.isEmpty());
    pad.addEventListener('endStroke', syncEmpty);
    pad.addEventListener('beginStroke', () => setEmptyState(false));

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(height));
      const data = pad.isEmpty() ? null : pad.toData();
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      pad.clear();
      if (data?.length) {
        pad.fromData(data);
        setEmptyState(pad.isEmpty());
      } else {
        setEmptyState(true);
      }
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => resize())
      : null;
    ro?.observe(wrap);
    window.addEventListener('resize', resize);

    if (padRef) {
      padRef.current = {
        clear: () => {
          pad.clear();
          setEmptyState(true);
        },
        isEmpty: () => pad.isEmpty(),
        toDataURL: (type = 'image/png', encoderOptions) =>
          pad.toDataURL(type, encoderOptions),
      };
    }

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      pad.off();
      padInstanceRef.current = null;
      if (padRef) padRef.current = null;
    };
    // padRef is a stable useRef from parent; height is the only remount trigger we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid remounting when parent re-renders
  }, [height]);

  useEffect(() => {
    const pad = padInstanceRef.current;
    if (!pad) return;
    if (disabled) pad.off();
    else pad.on();
  }, [disabled]);

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={wrapRef}
        className={cn(
          'relative overflow-hidden rounded-control border bg-white',
          'border-ink/15 shadow-sm',
          'focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20',
          !empty && 'border-success/35',
          disabled && 'opacity-60'
        )}
      >
        <canvas
          ref={canvasRef}
          className="relative z-[1] block w-full touch-none cursor-crosshair"
          style={{ height }}
          tabIndex={disabled ? -1 : 0}
          aria-label={t(locale, 'panel.dp.sigPadAria')}
        />
        {/* Signature guideline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 z-0 border-b border-dashed border-ink/15"
          style={{ bottom: Math.max(36, Math.round(height * 0.28)) }}
        />
        {empty ? (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-4 text-center font-mono text-2xs text-ink-faint"
          >
            {t(locale, 'panel.dp.sigPadEmpty')}
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            'm-0 font-mono text-2xs',
            empty ? 'text-ink-faint' : 'text-success'
          )}
          aria-live="polite"
        >
          {empty
            ? t(locale, 'panel.dp.sigPadHintStatus')
            : t(locale, 'panel.dp.sigPadDrawn')}
        </p>
        <button
          type="button"
          className={cn(S.btnGhost, 'inline-flex min-h-touch items-center gap-1.5 text-2xs')}
          disabled={disabled || empty}
          onClick={() => {
            padInstanceRef.current?.clear();
            setEmptyState(true);
          }}
          aria-label={t(locale, 'panel.dp.sigPadClear')}
        >
          <Icon name="refresh" className="h-3.5 w-3.5" />
          {t(locale, 'panel.dp.sigPadClear')}
        </button>
      </div>
    </div>
  );
}
