/** @type {import('tailwindcss').Config} */
/**
 * Tailwind theme aligned to lib/theme.js + lib/brand.js.
 * Prefer these tokens over arbitrary hex. Brand purple ≠ pipeline/status.
 */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F6F9',
        ink: {
          DEFAULT: '#1a1625',
          muted: 'rgba(26,22,37,0.62)',
          faint: 'rgba(26,22,37,0.38)',
          label: 'rgba(26,22,37,0.28)',
        },
        brand: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#C79ADB',
          400: '#AD5DCD',
          500: '#8930B8',
          600: '#76339B',
          700: '#502574',
          800: '#3B0764',
          900: '#2E0A4A',
          DEFAULT: '#8930B8',
        },
        success: '#15803d',
        danger: '#dc2626',
        warning: '#d97706',
        info: '#0284c7',
        soft: '#6B7280',
        pipeline: {
          new: 'rgba(26,22,37,0.5)',
          test: '#6366F1',
          screening: '#0284c7',
          interview: '#d97706',
          approved: '#15803d',
          hired: '#0f766e',
          rejected: '#dc2626',
          archived: 'rgba(26,22,37,0.3)',
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
        mono: ['Courier New', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        control: '10px',
      },
      boxShadow: {
        card: '0 20px 50px rgba(137,48,184,.10), 0 4px 24px rgba(0,0,0,.04)',
        dialog: '0 24px 64px rgba(26,22,37,0.18)',
        toast: '0 12px 32px rgba(26,22,37,.14)',
        menu: '0 8px 24px rgba(26,22,37,.12)',
      },
      minHeight: {
        touch: '40px',
      },
    },
  },
  plugins: [],
};
