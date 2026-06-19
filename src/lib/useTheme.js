import { useMemo } from 'react';
import { useStore } from './store.js';
import { makeTheme, updateFontGlobals } from '../theme.js';

// Derives the active palette from the live settings.
export function useAppTheme() {
  const { state } = useStore();
  
  return useMemo(() => {
    updateFontGlobals(state.settings.fontStyle || 'poppins');
    return {
      ...makeTheme(state.settings.theme, state.settings.accent, state.settings.pet),
      fontStyle: state.settings.fontStyle || 'poppins'
    };
  }, [state.settings.theme, state.settings.accent, state.settings.pet, state.settings.fontStyle]);
}
