'use client';

import { brandMarkSrc } from '../../lib/brand';
import { C, FONTS } from '../../lib/theme';

/**
 * Official 30Team mark (person + petals).
 * @param {{ size?: number, withWordmark?: boolean, wordmark?: string, style?: object }} props
 */
export function BrandMark({ size = 32, withWordmark = false, wordmark = '30Team', style }) {
  const src = brandMarkSrc(size);
  const radius = Math.max(6, Math.round(size * 0.22));

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: withWordmark ? Math.max(8, Math.round(size * 0.28)) : 0,
        ...style,
      }}
    >
      <img
        src={src}
        width={size}
        height={size}
        alt={wordmark}
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
    </span>
  );
}
