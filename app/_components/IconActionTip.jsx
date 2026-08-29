'use client';

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

const tipClass =
  'pointer-events-none fixed z-[200] max-w-[16rem] rounded-control border border-ink/15 bg-canvas px-2 py-1.5 text-center font-mono text-2xs leading-snug text-ink shadow-md';

/**
 * Immediate hover/focus hint for icon-only controls.
 * Native `title` stays as fallback (slow / easy to miss); this tip shows at once
 * and uses a portal so `overflow` on admin tables does not clip it.
 */
export function IconActionTip({ label, children, className }) {
  const [pos, setPos] = useState(null);
  const text = String(label || '').trim();

  const show = useCallback(
    (el) => {
      if (!text || !el || typeof window === 'undefined') return;
      const r = el.getBoundingClientRect();
      const preferAbove = r.top > 48;
      setPos({
        left: Math.min(Math.max(r.left + r.width / 2, 12), window.innerWidth - 12),
        top: preferAbove ? r.top - 6 : r.bottom + 6,
        place: preferAbove ? 'above' : 'below',
      });
    },
    [text]
  );

  const hide = useCallback(() => setPos(null), []);

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
              role="tooltip"
              className={tipClass}
              style={{
                left: pos.left,
                top: pos.top,
                transform:
                  pos.place === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
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
