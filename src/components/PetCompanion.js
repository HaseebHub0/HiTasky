// ============================================================
// PetCompanion — the app's signature companion, wherever it lives
// (the Today header, the Settings preview).
//
// This is a thin wrapper over <Pet>, the hand-built SVG creature
// engine. It wires the companion to the active theme and, by
// default, to the global reaction bus so it springs to life every
// time you add or complete a task.
// ============================================================
import React from 'react';
import { Pet } from './Pet.js';
import { useAppTheme } from '../lib/useTheme.js';

export function PetCompanion({ petId = 'zen', size = 64, reactive = true, theme, ...rest }) {
  const active = useAppTheme();
  return <Pet petId={petId} theme={theme || active} size={size} reactive={reactive} />;
}
