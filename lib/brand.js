/**
 * 30Team brand assets and logo-derived color references.
 * Master mark: public/brand/logo-mark.png (person + four petals).
 */

/** Paths under /public */
export const BRAND_ASSETS = {
  mark: '/brand/logo-mark.png',
  s16: '/brand/logo-16.png',
  s32: '/brand/logo-32.png',
  s64: '/brand/logo-64.png',
  s128: '/brand/logo-128.png',
  s192: '/brand/logo-192.png',
  s256: '/brand/logo-256.png',
  s512: '/brand/logo-512.png',
  favicon: '/favicon.ico',
};

/**
 * Palette sampled from the official logo (violet / lavender petals + figure).
 * Prefer these when building brand UI moments; keep C.purple for product chrome.
 */
export const LOGO = {
  figure: '#502574',
  petalDeep: '#76339B',
  petalMid: '#8930B8',
  petalBright: '#9944C0',
  petalSoft: '#AD5DCD',
  petalLavender: '#C79ADB',
  canvas: '#FAF9FA',
  /** Primary CTA aligned to logo mid tone */
  primary: '#8930B8',
  primaryDeep: '#76339B',
  primarySoft: '#C79ADB',
};

export function brandMarkSrc(size = 64) {
  if (size <= 16) return BRAND_ASSETS.s16;
  if (size <= 32) return BRAND_ASSETS.s32;
  if (size <= 64) return BRAND_ASSETS.s64;
  if (size <= 128) return BRAND_ASSETS.s128;
  if (size <= 192) return BRAND_ASSETS.s192;
  if (size <= 256) return BRAND_ASSETS.s256;
  return BRAND_ASSETS.s512;
}
