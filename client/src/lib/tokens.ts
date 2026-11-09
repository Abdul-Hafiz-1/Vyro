/**
 * VYRO "Friendly Paper-and-Ink" Design Tokens
 * Light first. Background #FBF7F0, card #FFFFFF, ink #1C1A17, muted #5E5A52.
 */

export const TOKENS = {
  // Base Surfaces & Inks
  paper: '#FBF7F0',
  card: '#FFFFFF',
  ink: '#1C1A17',
  muted: '#5E5A52',

  // Status & Action Palette (Flat Fills with Ink Text)
  coral: '#FF6B4A',     // Primary action
  sun: '#FFD23F',       // "Needs you"
  mint: '#7FDDB0',      // Done / Approved
  sky: '#9CCBFF',       // In progress
  rose: '#F6A8A8',      // Declined
  lavender: '#D9C8FF',  // Neutral highlight / tags

  // Warm Dark Variant (Never pure black, same chunky outlines)
  darkPaper: '#252321',
  darkCard: '#312E2A',
  darkInk: '#FBF7F0',
  darkMuted: '#C4BFB6'
} as const;

export const SHADOWS = {
  card: '0 4px 0 #1C1A17',
  cardPressed: '0 1px 0 #1C1A17',
  cardHover: '0 6px 0 #1C1A17',
  darkCard: '0 4px 0 #1C1A17',
} as const;

export const RADIUS = {
  card: '20px',
  input: '14px',
  pill: '999px',
} as const;
