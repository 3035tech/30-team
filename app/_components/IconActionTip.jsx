'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

const tipClass =
  'pointer-events-none fixed z-[200] max-w-[16rem] rounded-control border border-ink/15 bg-canvas px-2 py-1.5 text-center font-mono text-2xs leading-snug text-ink shadow-md';

const EDGE = 8;

/**
 * Immediate hover/focus hint for icon-only controls.
 * Native `title` stays as fallback (slow / easy to miss); this tip shows at once
 * and uses a portal so `overflow` on admin tables does not clip it.
 * `side="right"` places it beside the control (e.g. the navy sidebar rail at the viewport edge).
 * The tip is clamped inside the viewport after measuring its width.
 */
export function IconActionTip({ label, children, className, side }) {
  const [pos, setPos] = useState(null);
  const tipRef = useRef(null);
  const text = String(label || '').trim();

  const show = useCallback(
    (el) => {
      if (!text || !el || typeof window === 'undefined') return;
      const r = el.getBoundingClientRect();
      if (side === 'right') {
        setPos({ left: r.right + EDGE, top: r.top + r.height / 2, place: 'right' });
        return;
      }
      const preferAbove = r.top > 48;
      setPos({
        left: r.left + r.width / 2,
        top: preferAbove ? r.top - 6 : r.bottom + 6,
        place: preferAbove ? 'above' : 'below',
      });
    },
    [text, side]
  );

  const hide = useCallback(() => setPos(null), []);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!pos || !tip) return;
    const { width } = tip.getBoundingClientRect();
    const maxLeft = window.innerWidth - EDGE - width;
    const desired = pos.place === 'right' ? pos.left : pos.left - width / 2;
    tip.style.left = `${Math.max(EDGE, Math.min(desired, maxLeft))}px`;
  }, [pos, text]);

  if (!text) return children;

  return (
    <span
      className={cn('inline-flex', className)}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={hide}
      onFocusCapture={(e) => show(e.currentTarget)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) hide();
      }}
    >
      {children}
      {pos && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={tipRef}
              role="tooltip"
              className={tipClass}
              style={{
                left: pos.left,
                top: pos.top,
                transform:
                  pos.place === 'above'
                    ? 'translateY(-100%)'
                    : pos.place === 'right'
                      ? 'translateY(-50%)'
                      : undefined,
              }}
            >
              {text}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
