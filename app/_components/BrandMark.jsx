'use client';

import { brandMarkSrc } from '../../lib/brand';
import { cn } from '../../lib/cn';

/**
 * Official 30Team mark (person + petals).
 * Pass `href` or `onClick` to make the mark a home / nav control.
 * @param {{
 *   size?: number,
 *   withWordmark?: boolean,
 *   wordmark?: string,
 *   style?: object,
 *   className?: string,
 *   href?: string,
 *   onClick?: Function,
 *   title?: string,
 *   'aria-label'?: string,
 * }} props
 */
export function BrandMark({
  size = 32,
  withWordmark = false,
  wordmark = '30Team',
  style,
  className,
  href,
  onClick,
  title,
  'aria-label': ariaLabel,
}) {
  const src = brandMarkSrc(size);
  const radius = Math.max(6, Math.round(size * 0.22));
  const interactive = Boolean(href || onClick);
  const gap = withWordmark ? Math.max(8, Math.round(size * 0.28)) : 0;

  const inner = (
    <>
      <img
        src={src}
        width={size}
        height={size}
        alt={interactive ? '' : wordmark}
        className="block shrink-0 object-cover"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
        }}
      />
      {withWordmark ? (
        <span
          className="font-display leading-none tracking-[-0.02em] text-ink"
          style={{ fontSize: Math.max(14, Math.round(size * 0.55)) }}
        >
          {wordmark}
        </span>
      ) : null}
    </>
  );

  const layoutClass = cn('inline-flex items-center', className);
  const layoutStyle = { gap, ...style };

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel || wordmark}
        className={cn(layoutClass, 'cursor-pointer text-inherit no-underline')}
        style={layoutStyle}
      >
        {inner}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={ariaLabel || wordmark}
        className={cn(layoutClass, 'm-0 cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit')}
        style={layoutStyle}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={layoutClass} style={layoutStyle}>
      {inner}
    </span>
  );
}
