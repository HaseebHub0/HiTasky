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
  serifLight: 'Poppins_300Light',
  serif: 'Poppins_400Regular',
  serifMedium: 'Poppins_500Medium',
  serifItalic: 'Poppins_400Regular_Italic',
  serifLightItalic: 'Poppins_300Light_Italic',
  sans: 'Poppins_400Regular',
  sansMedium: 'Poppins_500Medium',
  sansSemi: 'Poppins_600SemiBold',
  sansBold: 'Poppins_700Bold',
};

// Modifies the FONT dictionary in-place so all components pick up the new fonts on next render
export function updateFontGlobals(style = 'poppins') {
  if (style === 'poppins') {
    FONT.serifLight = 'Poppins_300Light';
    FONT.serif = 'Poppins_400Regular';
    FONT.serifMedium = 'Poppins_500Medium';
    FONT.serifItalic = 'Poppins_400Regular_Italic';
    FONT.serifLightItalic = 'Poppins_300Light_Italic';
    FONT.sans = 'Poppins_400Regular';
    FONT.sansMedium = 'Poppins_500Medium';
    FONT.sansSemi = 'Poppins_600SemiBold';
    FONT.sansBold = 'Poppins_700Bold';
  } else if (style === 'modern') {
    FONT.serifLight = 'HankenGrotesk_400Regular';
    FONT.serif = 'HankenGrotesk_400Regular';
    FONT.serifMedium = 'HankenGrotesk_500Medium';
    FONT.serifItalic = 'HankenGrotesk_400Regular';
    FONT.serifLightItalic = 'HankenGrotesk_400Regular';
    FONT.sans = 'HankenGrotesk_400Regular';
    FONT.sansMedium = 'HankenGrotesk_500Medium';
    FONT.sansSemi = 'HankenGrotesk_600SemiBold';
    FONT.sansBold = 'HankenGrotesk_700Bold';
  } else if (style === 'classic') {
    FONT.serifLight = 'Newsreader_300Light';
    FONT.serif = 'Newsreader_400Regular';
    FONT.serifMedium = 'Newsreader_500Medium';
    FONT.serifItalic = 'Newsreader_400Regular_Italic';
    FONT.serifLightItalic = 'Newsreader_300Light_Italic';
    FONT.sans = 'Newsreader_400Regular';
    FONT.sansMedium = 'Newsreader_500Medium';
    FONT.sansSemi = 'Newsreader_600SemiBold';
    FONT.sansBold = 'Newsreader_700Bold';
  } else if (style === 'cursive') {
    FONT.serifLight = 'Caveat_400Regular';
    FONT.serif = 'Caveat_400Regular';
    FONT.serifMedium = 'Caveat_700Bold';
    FONT.serifItalic = 'Caveat_400Regular';
    FONT.serifLightItalic = 'Caveat_400Regular';
    FONT.sans = 'Caveat_400Regular';
    FONT.sansMedium = 'Caveat_700Bold';
    FONT.sansSemi = 'Caveat_700Bold';
    FONT.sansBold = 'Caveat_700Bold';
  } else if (style === 'cute') {
    FONT.serifLight = 'Mali_400Regular';
    FONT.serif = 'Mali_400Regular';
    FONT.serifMedium = 'Mali_500Medium';
    FONT.serifItalic = 'Mali_400Regular_Italic';
    FONT.serifLightItalic = 'Mali_400Regular_Italic';
    FONT.sans = 'Mali_400Regular';
    FONT.sansMedium = 'Mali_500Medium';
    FONT.sansSemi = 'Mali_600SemiBold';
    FONT.sansBold = 'Mali_700Bold';
  } else if (style === 'minimal') {
    FONT.serifLight = 'Inter_300Light';
    FONT.serif = 'Inter_400Regular';
    FONT.serifMedium = 'Inter_500Medium';
    FONT.serifItalic = 'Inter_400Regular';
    FONT.serifLightItalic = 'Inter_300Light';
    FONT.sans = 'Inter_400Regular';
    FONT.sansMedium = 'Inter_500Medium';
    FONT.sansSemi = 'Inter_600SemiBold';
    FONT.sansBold = 'Inter_700Bold';
  } else if (style === 'elegant') {
    FONT.serifLight = 'PlayfairDisplay_400Regular';
    FONT.serif = 'PlayfairDisplay_400Regular';
    FONT.serifMedium = 'PlayfairDisplay_500Medium';
    FONT.serifItalic = 'PlayfairDisplay_400Regular_Italic';
    FONT.serifLightItalic = 'PlayfairDisplay_400Regular_Italic';
    FONT.sans = 'Inter_400Regular';
    FONT.sansMedium = 'Inter_500Medium';
    FONT.sansSemi = 'Inter_600SemiBold';
    FONT.sansBold = 'Inter_700Bold';
  } else if (style === 'code') {
    FONT.serifLight = 'SpaceMono_400Regular';
    FONT.serif = 'SpaceMono_400Regular';
    FONT.serifMedium = 'SpaceMono_700Bold';
    FONT.serifItalic = 'SpaceMono_400Regular_Italic';
    FONT.serifLightItalic = 'SpaceMono_400Regular_Italic';
    FONT.sans = 'SpaceMono_400Regular';
    FONT.sansMedium = 'SpaceMono_700Bold';
    FONT.sansSemi = 'SpaceMono_700Bold';
    FONT.sansBold = 'SpaceMono_700Bold';
  } else {
    // Fallback default: Poppins
    FONT.serifLight = 'Poppins_300Light';
    FONT.serif = 'Poppins_400Regular';
    FONT.serifMedium = 'Poppins_500Medium';
    FONT.serifItalic = 'Poppins_400Regular_Italic';
    FONT.serifLightItalic = 'Poppins_300Light_Italic';
    FONT.sans = 'Poppins_400Regular';
    FONT.sansMedium = 'Poppins_500Medium';
    FONT.sansSemi = 'Poppins_600SemiBold';
    FONT.sansBold = 'Poppins_700Bold';
  }
}

// title font respecting the "serif titles" setting
export function titleFont(sans, italic = false) {
  if (sans) return italic ? FONT.sansMedium : FONT.sansMedium;
  return italic ? FONT.serifItalic : FONT.serif;
}

// spring config used across the app (matches the web --spring feel)
export const SPRING = { damping: 15, stiffness: 180, mass: 0.9 };
