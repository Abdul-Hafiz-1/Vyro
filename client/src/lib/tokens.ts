/**
 * VYRO Premium Design Tokens
 * Derived from Editorial dark-first design token architecture.
 * Dark by default. Light fully supported.
 */

export const TOKENS = {
  // Dark (Default)
  dark: {
    bg: '#0C0E0D',
    surface: '#141715',
    raised: '#1A1E1B',
    border: '#262B28',
    text: '#F2F4F0',
    muted: '#A0A7A1',
    volt: '#D4FF3A',
    status: {
      handled: '#34D399',
      needsYou: '#FFB020',
      declined: '#FF6B6B',
      inProgress: '#8FA3B8',
    }
  },
  // Light
  light: {
    bg: '#FAFAF7',
    surface: '#FFFFFF',
    raised: '#F3F3EE',
    border: '#E2E3DC',
    text: '#0E1210',
    muted: '#58605A',
    volt: '#C6F51F',
    status: {
      handled: '#0F9D6B',
      needsYou: '#B45F06',
      declined: '#C0392B',
      inProgress: '#4A5D70',
    }
  },
  // Radii Specs
  radius: {
    control: '10px',
    surface: '16px',
    pill: '9999px',
  },
  // Typography Specs
  fonts: {
    display: 'Sora, sans-serif',
    body: 'Hanken Grotesk, sans-serif',
  },
  // Layout Max Width
  maxWidth: '1120px'
} as const;
