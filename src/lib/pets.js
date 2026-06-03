// ============================================================
// HiTasky — Pets. The app's signature companion system.
//
// One free pet (Ember the Fox) ships with the app; the rest are
// a one-time "Pet Pack" unlock. Picking a pet re-skins the whole
// app (accent + background mood) and changes every micro-interaction
// (how the companion reacts when you add / complete / rest).
//
// This file is pure data + a tiny event bus. It imports nothing from
// the theme so it can be consumed by both the theme and the UI without
// a circular dependency.
// ============================================================

export const DEFAULT_PET = 'zen';

// Each pet carries:
//  - accent: the one signature colour, per mode
//  - dark / light: partial palette overrides (bg mood only — text tokens
//    always come from the base theme so contrast stays safe)
//  - haptic: which completion feel it prefers
//  - anim:   per-pet motion personality (drives Pet.js)
export const PETS = [
  {
    id: 'zen',
    name: 'Zen',
    species: 'frog',
    emoji: '🐸',
    free: true,
    tagline: 'Chill & grounded',
    blurb: 'A meditative frog. Breathes slow, ripples calm when a task is done.',
    accent: { dark: '#6FB890', light: '#3F8A63' },
    dark: { bg: '#0F1A14', bgDeep: '#0B140F', surface: '#18271E', surface2: '#213328', scrim: 'rgba(6,12,9,0.6)' },
    light: { bg: '#E7F2EB', bgDeep: '#DAEADF', surface: '#F4FAF6', surface2: '#E9F3EC' },
    haptic: 'calm',
    anim: { float: 'breathe', blink: 3000, add: { type: 'nod', emote: '🌿' }, complete: { type: 'pulse', emote: '🪷' }, rest: { type: 'float', emote: '☁️' } },
  },
  {
    id: 'ember',
    name: 'Ember',
    species: 'fox',
    emoji: '🦊',
    free: false,
    tagline: 'Playful & warm',
    blurb: 'A bright little fox. Bounces when you add, sparkles when you finish.',
    accent: { dark: '#E58A4B', light: '#C26A2F' },
    dark: { bg: '#18140F', bgDeep: '#120F0B', surface: '#221D17', surface2: '#2B251D', scrim: 'rgba(10,7,4,0.6)' },
    light: {},
    haptic: 'success',
    anim: { float: 'gentle', blink: 3400, add: { type: 'pop', emote: '🐾' }, complete: { type: 'jump', emote: '✨' }, rest: { type: 'sway', emote: '' } },
  },
  {
    id: 'sage',
    name: 'Sage',
    species: 'owl',
    emoji: '🦉',
    free: false,
    tagline: 'Calm & wise',
    blurb: 'A still night owl. Tilts its head to think, gives a slow knowing nod.',
    accent: { dark: '#A48FD0', light: '#6E5AA0' },
    dark: { bg: '#141021', bgDeep: '#100C19', surface: '#211B33', surface2: '#2B2442', scrim: 'rgba(8,6,16,0.62)' },
    light: { bg: '#EEEAF6', bgDeep: '#E4DEF1', surface: '#F8F5FD', surface2: '#EFEAF8' },
    haptic: 'soft',
    anim: { float: 'slow', blink: 2200, add: { type: 'tilt', emote: '❔' }, complete: { type: 'nod', emote: '⭐' }, rest: { type: 'sleep', emote: '💤' } },
  },
  {
    id: 'mochi',
    name: 'Mochi',
    species: 'bunny',
    emoji: '🐰',
    free: false,
    tagline: 'Bubbly & sweet',
    blurb: 'An excitable bunny. Ears wiggle on every add, a full hop when you finish.',
    accent: { dark: '#E89BC0', light: '#C2638E' },
    dark: { bg: '#1F1520', bgDeep: '#190F1A', surface: '#2C1F2E', surface2: '#392839', scrim: 'rgba(16,8,16,0.6)' },
    light: { bg: '#FCEAF3', bgDeep: '#F6DEEB', surface: '#FFF6FB', surface2: '#FBEAF3' },
    haptic: 'bouncy',
    anim: { float: 'bob', blink: 2600, add: { type: 'wiggle', emote: '✨' }, complete: { type: 'hop', emote: '💖' }, rest: { type: 'nibble', emote: '🥕' } },
  },
  {
    id: 'storm',
    name: 'Storm',
    species: 'wolf',
    emoji: '🐺',
    free: false,
    tagline: 'Focused & steady',
    blurb: 'A quiet wolf. Minimal moves, a steady puff of pride at the finish line.',
    accent: { dark: '#7FA8D6', light: '#4E7AAE' },
    dark: { bg: '#0F141E', bgDeep: '#0B0F17', surface: '#1A2230', surface2: '#232F41', scrim: 'rgba(6,9,14,0.62)' },
    light: { bg: '#E9EEF6', bgDeep: '#DDE5F0', surface: '#F6F9FD', surface2: '#EBF1F8' },
    haptic: 'focus',
    anim: { float: 'min', blink: 4200, add: { type: 'shake', emote: '' }, complete: { type: 'puff', emote: '🌙' }, rest: { type: 'lie', emote: '✦' } },
  },
];

export const PETS_BY_ID = PETS.reduce((m, p) => ((m[p.id] = p), m), {});

export function getPet(id) {
  return PETS_BY_ID[id] || PETS_BY_ID[DEFAULT_PET];
}

// Map a pet's preferred completion feel onto the existing haptic helpers.
export function petHaptic(id) {
  return getPet(id).haptic;
}

/* ------------------------------------------------------------
   Reaction bus — source-agnostic. Anything in the app can emit
   a pet reaction ('add' | 'complete' | 'rest') and every mounted
   reactive Pet plays its species-specific response.
   ------------------------------------------------------------ */
const listeners = new Set();

export function emitPetReaction(mood) {
  listeners.forEach((fn) => {
    try {
      fn(mood);
    } catch (e) {}
  });
}

export function onPetReaction(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
