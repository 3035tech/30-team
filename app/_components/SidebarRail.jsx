'use client';

import Link from 'next/link';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';
import { IconActionTip } from './IconActionTip';

/**
 * Navy icon rail of the app shell (sections + footer actions).
 * The light panel next to it lists the pages of the selected section.
 * Colors come from the `.db-rail` contrast context in globals.css.
 */
export function SidebarRail({ brand, toggle, children, footer, ariaLabel }) {
  return (
    <div className="db-rail flex w-16 flex-shrink-0 flex-col items-center gap-1.5 px-2 pb-4 pt-4">
      <div className="flex h-10 w-10 items-center justify-center">{brand}</div>
      {toggle}
      <div className="mx-auto my-1.5 h-px w-8 bg-ink/15" aria-hidden />
      <nav aria-label={ariaLabel} className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto">
        {children}
      </nav>
      {footer ? <div className="flex flex-shrink-0 flex-col items-center gap-1.5 pt-2">{footer}</div> : null}
    </div>
  );
}

/**
 * @param {{
 *   icon: string, label: string, active?: boolean, selected?: boolean,
 *   badge?: boolean, onClick?: Function, href?: string, disabled?: boolean,
 *   tone?: 'default'|'danger', className?: string, pressed?: boolean,
 * }} props
 */
export function SidebarRailButton({
  icon,
  label,
  active = false,
  selected = false,
  badge = false,
  onClick,
  href,
  disabled = false,
  tone = 'default',
  className,
  pressed,
}) {
  const classes = cn(
    'relative flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-control border-0 no-underline transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-default disabled:opacity-55',
    active
      ? 'bg-brand-500/20 text-brand-700'
      : selected
        ? 'bg-ink/10 text-ink'
        : tone === 'danger'
          ? 'bg-transparent text-ink-faint hover:bg-danger/15 hover:text-danger'
          : 'bg-transparent text-ink-faint hover:bg-ink/[0.08] hover:text-ink',
    className
  );
  const content = (
    <>
      <Icon name={icon} className="h-[18px] w-[18px]" />
      {badge ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" aria-hidden /> : null}
    </>
  );
  return (
    <IconActionTip label={label}>
      {href ? (
        <Link href={href} onClick={onClick} aria-label={label} aria-current={active ? 'page' : undefined} className={classes}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
          aria-current={active ? 'true' : undefined}
          className={classes}
        >
          {content}
        </button>
      )}
    </IconActionTip>
  );
}
