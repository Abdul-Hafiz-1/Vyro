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
        paper: '#FBF7F0',
        card: '#FFFFFF',
        ink: '#1C1A17',
        muted: '#5E5A52',

        coral: '#FF6B4A',
        sun: '#FFD23F',
        mint: '#7FDDB0',
        sky: '#9CCBFF',
        rose: '#F6A8A8',
        lavender: '#D9C8FF',

        'dark-paper': '#252321',
        'dark-card': '#312E2A',
        'dark-ink': '#FBF7F0',
        'dark-muted': '#C4BFB6',
      },
      boxShadow: {
        hard: '0 4px 0 #1C1A17',
        'hard-sm': '0 2px 0 #1C1A17',
        'hard-lg': '0 6px 0 #1C1A17',
        'hard-press': '0 1px 0 #1C1A17',
      },
      borderRadius: {
        card: '20px',
        input: '14px',
        pill: '999px',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"Figtree"', 'sans-serif'],
        sans: ['"Figtree"', 'sans-serif'],
      },
      fontSize: {
        hero: ['56px', { lineHeight: '1.1', fontWeight: '700' }],
        'page-title': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'card-title': ['22px', { lineHeight: '1.3', fontWeight: '700' }],
        body: ['17px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['15px', { lineHeight: '1.4', fontWeight: '500' }],
      }
    },
  },
  plugins: [],
}
