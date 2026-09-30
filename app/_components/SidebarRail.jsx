'use client';

import Link from 'next/link';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';
import { IconActionTip } from './IconActionTip';

/**
 * Icon button with tooltip for the collapsed `SidebarNav` (icon-only desktop menu).
 *
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
  id,
  onIntent,
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
    <IconActionTip label={label} side="right">
      {href ? (
        <Link id={id} href={href} onClick={onClick} onMouseEnter={onIntent} onFocus={onIntent} aria-label={label} aria-current={active ? 'page' : undefined} className={classes}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          id={id}
          onClick={onClick}
          onMouseEnter={onIntent}
          onFocus={onIntent}
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
