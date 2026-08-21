'use client';

import { brandMarkSrc } from '../../lib/brand';
import { C, FONTS } from '../../lib/theme';

/**
 * Official 30Team mark (person + petals).
 * Pass `href` or `onClick` to make the mark a home / nav control.
 * @param {{
 *   size?: number,
 *   withWordmark?: boolean,
 *   wordmark?: string,
 *   style?: object,
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
  href,
  onClick,
  title,
  'aria-label': ariaLabel,
}) {
  const src = brandMarkSrc(size);
  const radius = Math.max(6, Math.round(size * 0.22));
  const interactive = Boolean(href || onClick);

  const inner = (
    <>
      <img
        src={src}
        width={size}
        height={size}
        alt={interactive ? '' : wordmark}
        style={{
          display: 'block',
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
      {withWordmark ? (
        <span
          style={{
            fontFamily: FONTS.serif,
            fontSize: Math.max(14, Math.round(size * 0.55)),
            color: C.text,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {wordmark}
        </span>
      ) : null}
    </>
  );

  const layoutStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: withWordmark ? Math.max(8, Math.round(size * 0.28)) : 0,
    ...style,
  };

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel || wordmark}
        style={{
          ...layoutStyle,
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
        }}
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
        style={{
          ...layoutStyle,
          margin: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        {inner}
      </button>
    );
  }

  return <span style={layoutStyle}>{inner}</span>;
}
