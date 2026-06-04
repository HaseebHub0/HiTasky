// ============================================================
// HiTasky — "Tactile Quiet-Luxury" tokens for React Native.
// Warm dark (hero) + fine-paper light. One ember accent.
// Mirrors the web design system (nib.css).
// ============================================================

import { getPet, DEFAULT_PET } from './lib/pets.js';

export const ACCENTS = [
  // Original six
  '#E58A4B', // ember orange
  '#E0A24A', // amber
  '#C25A4E', // clay red
  '#7E8C5A', // olive
  '#5A7E8C', // steel teal
  '#9A6A8C', // plum
  // New six — extends the "Custom accent themes" Pro palette
  '#6FB890', // jade
  '#7FA8D6', // sky
  '#B57CA3', // orchid
  '#A48FD0', // lavender
  '#D98C5F', // terracotta
  '#5FA8A0', // seafoam
];

const DARK = {
  bg: '#18140F',
  bgDeep: '#120F0B',
  surface: '#221D17',
  surface2: '#2B251D',
  hairline: 'rgba(244,232,214,0.07)',
  hairline2: 'rgba(244,232,214,0.12)',
  text: '#F3ECDF',
  text2: '#B8AE9D',
  text3: '#7C7264',
  text4: '#564E43',
  onAccent: '#1C1308',
  scrim: 'rgba(10,7,4,0.6)',
  accentSoft: 'rgba(229,138,75,0.16)',
};

const LIGHT = {
  bg: '#F2EBDD',
  bgDeep: '#E9E0CF',
  surface: '#FBF6EC',
  surface2: '#F3EADB',
  hairline: 'rgba(40,30,18,0.08)',
  hairline2: 'rgba(40,30,18,0.14)',
  text: '#29231A',
  text2: '#6B6151',
  text3: '#9A8E79',
  text4: '#C0B49C',
  onAccent: '#FBF6EC',
  scrim: 'rgba(30,22,12,0.45)',
  accentSoft: 'rgba(194,106,47,0.15)',
};

// build a full palette for a theme + chosen pet (+ optional manual accent)
//
// The active pet drives both the accent and the background "mood" (a few
// tinted surface tokens). Text tokens always come from the base theme so
// contrast stays safe. A non-null `accent` is a manual override that wins
// over the pet's signature colour.
export function makeTheme(mode, accent = null, petId = DEFAULT_PET) {
  const base = mode === 'light' ? LIGHT : DARK;
  const pet = getPet(petId);
  const petPal = (mode === 'light' ? pet.light : pet.dark) || {};
  const acc = accent || pet.accent[mode === 'light' ? 'light' : 'dark'] || (mode === 'light' ? '#C26A2F' : '#E58A4B');
  return {
    mode,
    ...base,
    ...petPal,
    accent: acc,
    accentSoft: softOf(acc, mode === 'light' ? 0.15 : 0.16),
    petId,
    radius: 20,
  };
}

// rgba tint of a hex accent
export function softOf(hex, alpha = 0.16) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---- type ----
export const FONT = {
  serifLight: 'Newsreader_300Light',
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifLightItalic: 'Newsreader_300Light_Italic',
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemi: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
};

// title font respecting the "serif titles" setting
export function titleFont(sans, italic = false) {
  if (sans) return italic ? FONT.sansMedium : FONT.sansMedium;
  return italic ? FONT.serifItalic : FONT.serif;
}

// spring config used across the app (matches the web --spring feel)
export const SPRING = { damping: 15, stiffness: 180, mass: 0.9 };
