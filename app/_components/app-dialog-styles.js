import { C } from '../../lib/theme';

/** Shared overlay / card styles for in-app dialogs (confirm, notice, prompt). */
export const dialogOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 10060,
  background: 'rgba(26,22,37,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
};

export const dialogCardStyle = {
  width: '100%',
  maxWidth: '420px',
  background: '#fff',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px 26px',
  boxShadow: '0 24px 64px rgba(26,22,37,.18)',
};

export const dialogBtnPrimary = (accent = C.purple) => ({
  background: accent,
  border: 'none',
  borderRadius: '10px',
  padding: '10px 20px',
  color: '#fff',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'monospace',
});

export const dialogBtnGhost = {
  background: 'transparent',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '10px 20px',
  color: C.muted,
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'monospace',
};

export const dialogFieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: C.inputBg || 'rgba(26,22,37,.04)',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '10px 12px',
  color: C.text,
  fontSize: '13px',
  fontFamily: 'monospace',
  marginTop: '6px',
};
