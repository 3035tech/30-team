'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

const triggerClass =
  'inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-control border border-ink/12 bg-transparent text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 disabled:cursor-default disabled:opacity-55';

const itemClass =
  'flex min-h-touch w-full cursor-pointer items-center rounded-control border-none bg-transparent px-3 py-2 text-left font-ui text-sm text-ink-muted hover:bg-ink/[0.04] hover:text-ink focus-visible:bg-ink/[0.06] focus-visible:text-ink focus-visible:outline-none disabled:cursor-default disabled:opacity-55';

const dangerItemClass = 'text-red-800 hover:bg-danger/[0.08] hover:text-red-800 dark:text-danger dark:hover:text-danger';

const MENU_WIDTH = 224;

/**
 * "More actions" menu for table rows. Rendered in a portal so `overflow` on
 * `AdminTableShell` does not clip it; flips above the trigger near the viewport bottom.
 * @param {{ label: string, items: Array<{ id: string, label: string, onSelect: Function, danger?: boolean, disabled?: boolean }>, disabled?: boolean }} props
 */
export function RowActionsMenu({ label, items = [], disabled = false, className }) {
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const open = Boolean(pos);

  const close = useCallback((focusTrigger = false) => {
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    if (open) return close();
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const estHeight = items.length * 44 + 12;
    const above = r.bottom + estHeight + 8 > window.innerHeight && r.top > estHeight + 8;
    setPos({
      left: Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      top: above ? r.top - estHeight - 6 : r.bottom + 6,
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('button:not([disabled])')?.focus();
    const onPointer = (e) => {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const buttons = [...(menuRef.current?.querySelectorAll('button:not([disabled])') || [])];
      if (!buttons.length) return;
      e.preventDefault();
      const idx = buttons.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
      buttons[next].focus();
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(triggerClass, className)}
      >
        <Icon name="moreHorizontal" className="h-4 w-4" />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className="ui-content-enter fixed z-[150] grid gap-0.5 rounded-control border border-ink/12 bg-surface p-1.5 shadow-menu"
              style={{ left: pos.left, top: pos.top, width: MENU_WIDTH }}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    close(true);
                    item.onSelect?.();
                  }}
                  className={cn(itemClass, item.danger && dangerItemClass)}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
