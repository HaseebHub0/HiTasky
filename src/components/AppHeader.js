// ============================================================
// AppHeader — shared glassmorphic header bar used across all screens.
//
// Renders: [Pet avatar] [HiTasky wordmark]     [optional actions] [settings cog]
//
// Extracts the duplicate header code that was repeated in every
// screen (TodayScreen, NotesScreen, DoneScreen, ListsScreen,
// SettingsScreen). One component, one place to update.
// ============================================================
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Wordmark } from './Wordmark.js';
import { HeaderPet } from './Pet.js';
import { Icon } from './icons.js';
import { FONT } from '../theme.js';

/**
 * @param {object}   theme         current theme object
 * @param {object}   settings      app settings (for pet selection)
 * @param {function} onOpenPets    open the pet picker
 * @param {function} onOpenSettings open the settings screen
 * @param {function} [onBack]      optional back button (renders ← instead of cog)
 * @param {React.ReactNode} [right] optional extra right-side content
 */
export function AppHeader({ theme, settings, onOpenPets, onOpenSettings, onBack, right }) {
  const s = useMemo(() => makeStyles(theme), [theme]);
  const currentPet = settings?.pet || 'zen';

  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <HeaderPet petId={currentPet} theme={theme} onPress={onOpenPets} />
        <Wordmark theme={theme} size={22} />
      </View>
      <View style={s.headerRight}>
        {right}
        {onBack ? (
          <Pressable
            style={s.actionBtn}
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon.chevLeft size={18} color={theme.text3} />
          </Pressable>
        ) : onOpenSettings ? (
          <Pressable
            onPress={onOpenSettings}
            hitSlop={8}
            style={s.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Icon.sliders size={18} color={theme.text3} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: t.surface2,
      backgroundColor: t.surface,
      marginTop: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: t.mode === 'light' ? 0.08 : 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.hairline2,
      backgroundColor: t.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
