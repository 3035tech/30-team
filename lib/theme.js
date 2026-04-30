/**
 * Tokens de design da UI 30Team — cores, tipografia e superfícies compartilhadas.
 * Mantém landing, login, fluxo de avaliação e dashboard visualmente alinhados.
 */

export const C = {
  bg: '#ffffff',
  card: 'rgba(124,58,237,0.06)',
  border: 'rgba(26,22,37,0.12)',
  purple: '#7C3AED',
  purpleLight: '#6D28D9',
  purpleDark: '#4C1D95',
  text: '#1a1625',
  muted: 'rgba(26,22,37,0.62)',
  faint: 'rgba(26,22,37,0.38)',
  synergy: '#15803d',
  tension: '#dc2626',
  neutral: '#7C3AED',
};

export const FONTS = {
  serif: "'Georgia','Times New Roman',serif",
  mono: "'Courier New',monospace",
};

export const RADIAL_GLOW = `radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.07) 0%,transparent 55%),
  radial-gradient(ellipse at 85% 75%,rgba(71,168,232,.05) 0%,transparent 55%)`;

export const RADIAL_GLOW_SINGLE = `radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.07) 0%,transparent 55%)`;

export const GRADIENT = {
  title: 'linear-gradient(135deg,#E8E0FF 0%,#A78BFA 55%,#7C3AED 100%)',
  titleLogin: 'linear-gradient(135deg,#E8E0FF,#A78BFA 55%,#7C3AED)',
  primaryBtn: (from = C.purple, to = C.purpleDark) =>
    `linear-gradient(135deg,${from} 0%,${to} 100%)`,
};

export const SHADOW = {
  cardElevated: '0 20px 50px rgba(124,58,237,.1), 0 4px 24px rgba(0,0,0,.05)',
};
