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
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        'border-subtle': 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        volt: 'var(--volt)',
        'status-handled': 'var(--status-handled)',
        'status-needs': 'var(--status-needs)',
        'status-declined': 'var(--status-declined)',
        'status-progress': 'var(--status-progress)',
      },
      borderRadius: {
        control: '10px',
        surface: '16px',
        pill: '9999px',
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'sans-serif'],
      },
      fontSize: {
        hero: ['64px', { lineHeight: '1.1', fontWeight: '700' }],
        'page-title': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        section: ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        secondary: ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        'price-giant': ['72px', { lineHeight: '1', fontWeight: '700' }],
      },
      boxShadow: {
        decision: '0 8px 30px rgba(0, 0, 0, 0.45)',
        'decision-light': '0 8px 30px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
