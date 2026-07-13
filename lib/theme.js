/**
 * 30Team design tokens — brand, surfaces, and semantic status colors.
 *
 * Rules:
 * - Brand purple is for identity / CTA / focus — not for pipeline or "neutral" status.
 * - Semantic tokens (success, danger, warning, info, neutral) are for meaning.
 * - synergy / tension remain aliases for compatibility UI (legacy callers).
 */

/** Brand violet scale (Tailwind-like numbering). Primary CTA = 500. */
export const PURPLE = {
  50: '#F5F3FF',
  100: '#EDE9FE',
  200: '#E8E0FF',
  300: '#C4B5FD',
  400: '#A78BFA',
  500: '#7C3AED',
  600: '#6D28D9',
  700: '#5B21B6',
  800: '#4C1D95',
  900: '#3B0764',
};

export const C = {
  // Surfaces — off-white canvas, white cards (lilac reserved for selection / brand moments)
  bg: '#F7F6F9',
  surface: '#ffffff',
  card: '#ffffff',
  cardTint: 'rgba(124,58,237,0.06)',
  border: 'rgba(26,22,37,0.12)',

  // Brand
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
  /** Semantic gray — compatibility "neutral", muted chrome */
  neutral: '#6B7280',

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
  serif: "'Georgia','Times New Roman',serif",
  mono: "'Courier New',monospace",
};

export const RADIAL_GLOW = `radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.06) 0%,transparent 55%),
  radial-gradient(ellipse at 85% 75%,rgba(71,168,232,.04) 0%,transparent 55%)`;

export const RADIAL_GLOW_SINGLE = `radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.06) 0%,transparent 55%)`;

export const GRADIENT = {
  title: `linear-gradient(135deg,${PURPLE[200]} 0%,${PURPLE[400]} 55%,${PURPLE[500]} 100%)`,
  titleLogin: `linear-gradient(135deg,${PURPLE[200]},${PURPLE[400]} 55%,${PURPLE[500]})`,
  primaryBtn: (from = C.purple, to = C.purpleDark) =>
    `linear-gradient(135deg,${from} 0%,${to} 100%)`,
};

export const SHADOW = {
  cardElevated: '0 20px 50px rgba(124,58,237,.08), 0 4px 24px rgba(0,0,0,.04)',
};
