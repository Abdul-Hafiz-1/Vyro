/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vyro: {
          bg: '#0B0C0F',
          secondary: '#111319',
          surface: '#171A21',
          card: '#15171E',
          hover: '#1D212A',
          border: '#292D36',
          'border-light': '#363C47',
          text: '#F2F2F0',
          muted: '#9398A4',
          subtle: '#626875',
          accent: '#8B7CFF',
          'accent-hover': '#7A69FA',
          'accent-glow': 'rgba(139, 124, 255, 0.15)',
          success: '#63D6A0',
          'success-bg': 'rgba(99, 214, 160, 0.1)',
          warning: '#F0B66C',
          'warning-bg': 'rgba(240, 182, 108, 0.1)',
          error: '#F07878',
          'error-bg': 'rgba(240, 120, 120, 0.1)',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
