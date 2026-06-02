import { useStore } from './store.js';
import { makeTheme } from '../theme.js';

// Derives the active palette from the live settings.
export function useAppTheme() {
  const { state } = useStore();
  return makeTheme(state.settings.theme, state.settings.accent);
}
