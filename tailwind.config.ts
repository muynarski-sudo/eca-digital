import type { Config } from 'tailwindcss';

// Cores espelham src/styles/tokens.css. Para alterar uma cor, altere nos dois (há teste de contraste).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: 'var(--color-brand-blue)',
          'blue-dark': 'var(--color-brand-blue-dark)',
          red: 'var(--color-brand-red)',
          'red-text': 'var(--color-brand-red-text)',
          tint: 'var(--color-blue-tint)',
        },
        ink: {
          DEFAULT: 'var(--color-gray-900)',
          soft: 'var(--color-gray-600)',
          muted: 'var(--color-gray-500)',
        },
        line: 'var(--color-gray-200)',
        surface: 'var(--color-gray-100)',
        success: {
          DEFAULT: 'var(--color-success)',
          text: 'var(--color-success-text)',
          bg: 'var(--color-success-bg)',
        },
        danger: { bg: 'var(--color-error-bg)' },
      },
      fontFamily: { sans: ['Arial', 'Helvetica', 'sans-serif'] },
      borderRadius: { card: '1rem' },
    },
  },
  plugins: [],
};
export default config;
