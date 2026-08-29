/** @type {import('tailwindcss').Config} */
/**
 * Tailwind theme aligned to lib/theme.js + lib/brand.js.
 * Canvas / ink / brand / semantic colors use CSS vars so `.dark` on <html> remaps them
 * (see app/dark-mode.css). Brand purple ≠ pipeline/status.
 */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'rgb(var(--canvas) / <alpha-value>)',
          alt: 'rgb(var(--canvas-alt) / <alpha-value>)',
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink) / 0.62)',
          faint: 'rgb(var(--ink) / 0.38)',
          label: 'rgb(var(--ink) / 0.28)',
        },
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--brand-500) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        soft: 'rgb(var(--soft) / <alpha-value>)',
        pipeline: {
          new: 'rgb(var(--ink) / 0.5)',
          test: '#6366F1',
          screening: 'rgb(var(--info) / <alpha-value>)',
          interview: 'rgb(var(--warning) / <alpha-value>)',
          approved: 'rgb(var(--success) / <alpha-value>)',
          hired: '#0f766e',
          rejected: 'rgb(var(--danger) / <alpha-value>)',
          archived: 'rgb(var(--ink) / 0.3)',
        },
      },
      fontFamily: {
        ui: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['Georgia', 'Times New Roman', 'serif'],
        mono: [
          'ui-monospace',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      /**
       * Type scale (dashboard + app chrome). Prefer these over text-[Npx].
       * Roles: font-ui body · font-mono labels/meta/CTAs · font-display page titles / marketing.
       * 2xs (11) labels/meta · xs (12) faint · prose (13) body muted · sm (14) · base (16) · …
       */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }], // 11px
        prose: ['0.8125rem', { lineHeight: '1.375rem' }], // 13px
      },
      borderRadius: {
        card: '16px',
        control: '10px',
      },
      boxShadow: {
        card: '0 12px 40px rgba(26,22,37,.08), 0 4px 16px rgba(26,22,37,.04)',
        dialog: '0 24px 64px rgba(26,22,37,0.18)',
        toast: '0 12px 32px rgba(26,22,37,.14)',
        menu: '0 8px 24px rgba(26,22,37,.12)',
      },
      minHeight: {
        touch: '40px',
      },
      minWidth: {
        touch: '40px',
      },
    },
  },
  plugins: [],
};
