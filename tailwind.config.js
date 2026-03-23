/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9ceff',
          300: '#8aadff',
          400: '#5585ff',
          500: '#2d5ff5',
          600: '#1a3edb',
          700: '#1530b0',
          800: '#17298f',
          900: '#182671',
        }
      }
    }
  },
  plugins: []
}
