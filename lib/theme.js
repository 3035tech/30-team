/**
 * 30Team design tokens — brand, surfaces, and semantic status colors.
 *
 * Rules:
 * - Brand purple is for identity / CTA / focus — not for pipeline or "neutral" status.
 * - Semantic tokens (success, danger, warning, info, neutral) are for meaning.
 * - synergy / tension remain aliases for compatibility UI (legacy callers).
 * - Logo mark + LOGO palette: see lib/brand.js (person + four petals).
 */

import { LOGO } from './brand.js';

export { BRAND_ASSETS, LOGO, brandMarkSrc } from './brand.js';

/** Brand violet scale — aligned to official logo petals / figure. Primary CTA = 500. */
export const PURPLE = {
  50: '#FAF5FF',
  100: '#F3E8FF',
  200: '#E9D5FF',
  300: '#C79ADB',
  400: '#AD5DCD',
  500: LOGO.primary,
  600: LOGO.primaryDeep,
  700: LOGO.figure,
  800: '#3B0764',
  900: '#2E0A4A',
};

export const C = {
  // Surfaces — off-white canvas, white cards (lilac reserved for selection / brand moments)
  bg: '#F5F4F7',
  surface: '#ffffff',
  card: '#ffffff',
  /** Soft brand wash — selection / brand moments only (not default card fill) */
  cardTint: 'rgba(137,48,184,0.04)',
  border: 'rgba(26,22,37,0.12)',

  // Brand (logo-aligned)
  purple: PURPLE[500],
  purpleSoft: PURPLE[400],
  /** @deprecated use purpleDeep — historically misnamed (darker than purple) */
  purpleLight: PURPLE[600],
  purpleDeep: PURPLE[600],
  purpleDark: PURPLE[800],

  // Text (violet undertone, high contrast on white)
  text: '#1a1625',
  muted: 'rgba(26,22,37,0.62)',
  faint: 'rgba(26,22,37,0.38)',
  inputBg: 'rgba(26,22,37,0.05)',
  sectionLabel: 'rgba(26,22,37,0.28)',

  // Semantic status (do not reuse brand purple here)
  success: '#15803d',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#0284c7',
  /** Semantic slate — compatibility "neutral", muted chrome */
  neutral: '#64748B',

  // Compatibility aliases
  synergy: '#15803d',
  tension: '#dc2626',
};

/**
 * Pipeline stage colors — brand purple intentionally excluded.
 * test_completed uses slate-indigo so it does not read as a CTA.
 */
export const PIPELINE_STAGE_COLORS = {
  new: 'rgba(26,22,37,.5)',
  test_completed: '#6366F1',
  screening: C.info,
  interview: C.warning,
  approved: C.success,
  hired: '#0f766e',
  rejected: C.danger,
  archived: 'rgba(26,22,37,.3)',
};

export const FONTS = {
  /** UI chrome: buttons, tables, labels — system stack for density */
  ui: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  /** Marketing / titles (login, public hero, dashboard page H1) — prefer FONTS.ui for body */
  serif: "'Georgia','Times New Roman',serif",
  /** IDs, codes, meta, uppercase labels */
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  /** @deprecated alias — prefer FONTS.ui for dashboard chrome; FONTS.serif for titles */
  display: "'Georgia','Times New Roman',serif",
};

/**
 * Tailwind type scale (see `tailwind.config.js` fontSize + `font-ui` / `font-mono` / `font-display`).
 * Prefer classes over hex fontSize in style={{}}.
 *
 * | Token        | Size | Use |
 * |--------------|------|-----|
 * | `text-2xs`   | 11px | Labels, table headers, meta chips (`S.label`) |
 * | `text-xs`    | 12px | Faint secondary (`S.faint`, card muted) |
 * | `text-prose` | 13px | Body muted, primary CTA (`S.muted`, `S.btnPrimary`) |
 * | `text-sm`    | 14px | Card body / row titles |
 * | `text-base+` | 16px+| Page titles (often with `font-display`) |
 */

/** Public/auth atmosphere only — keep off the dashboard canvas. */
export const RADIAL_GLOW = `radial-gradient(ellipse at 15% 25%,rgba(137,48,184,.045) 0%,transparent 55%),
  radial-gradient(ellipse at 85% 75%,rgba(71,168,232,.03) 0%,transparent 55%)`;

export const RADIAL_GLOW_SINGLE = `radial-gradient(ellipse at 15% 25%,rgba(137,48,184,.045) 0%,transparent 55%)`;

export const GRADIENT = {
  /** Marketing / login titles — not dashboard page titles */
  title: `linear-gradient(135deg,${PURPLE[200]} 0%,${PURPLE[400]} 55%,${PURPLE[500]} 100%)`,
  titleLogin: `linear-gradient(135deg,${PURPLE[200]},${PURPLE[400]} 55%,${PURPLE[500]})`,
  primaryBtn: (from = C.purple, to = C.purpleDark) =>
    `linear-gradient(135deg,${from} 0%,${to} 100%)`,
};

/** Prefer Tailwind `shadow-card` / `shadow-dialog` / `shadow-toast` in JSX. */
export const SHADOW = {
  cardElevated: '0 12px 40px rgba(26,22,37,.08), 0 4px 16px rgba(26,22,37,.04)',
  dialog: '0 24px 64px rgba(26,22,37,0.18)',
  toast: '0 12px 32px rgba(26,22,37,.14)',
};
