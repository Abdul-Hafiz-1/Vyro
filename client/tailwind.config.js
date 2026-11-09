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
          bg: 'var(--vyro-bg)',
          secondary: 'var(--vyro-surface)',
          surface: 'var(--vyro-surface)',
          'surface-hover': 'var(--vyro-surface-hover)',
          card: 'var(--vyro-card)',
          hover: 'var(--vyro-hover)',
          line: 'var(--vyro-line)',
          'line-subtle': 'var(--vyro-line-subtle)',
          border: 'var(--vyro-border)',
          'border-light': 'var(--vyro-border-light)',
          text: 'var(--vyro-text)',
          muted: 'var(--vyro-muted)',
          subtle: 'var(--vyro-subtle)',
          accent: 'var(--vyro-accent)',
          'accent-hover': 'var(--vyro-accent-hover)',
          'accent-glow': 'var(--vyro-accent-glow)',
          success: 'var(--vyro-success)',
          'success-bg': 'var(--vyro-success-bg)',
          warning: 'var(--vyro-warning)',
          'warning-bg': 'var(--vyro-warning-bg)',
          error: 'var(--vyro-error)',
          'error-bg': 'var(--vyro-error-bg)',
        },
        status: {
          handled: 'var(--status-handled)',
          'handled-bg': 'var(--status-handled-bg)',
          needs: 'var(--status-needs-you)',
          'needs-bg': 'var(--status-needs-you-bg)',
          declined: 'var(--status-declined)',
          'declined-bg': 'var(--status-declined-bg)',
        }
      },
      borderRadius: {
        control: '8px',
        card: '14px',
        surface: '14px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
