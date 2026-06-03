// ============================================================
// Wordmark — HiTasky's signature lockup.
//
// A clean editorial type lockup: "Hi" set in an ember serif italic,
// a measured space, then "Tasky" in the text serif. No badge — the
// wordmark stands on its own so it reads identically everywhere
// (header, pet shop, onboarding). This is the app's signature style;
// use it, never the raw logo image, inside the UI.
// ============================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT } from '../theme.js';

/**
 * @param {object} theme
 * @param {number} size  base type size of the wordmark (default 22)
 * @param {object} style optional container style
 */
export function Wordmark({ theme, size = 22, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text
        allowFontScaling={false}
        style={[styles.word, { fontSize: size, lineHeight: Math.round(size * 1.14) }]}
      >
        <Text style={{ fontFamily: FONT.serifItalic, color: theme.accent }}>Hi</Text>
        <Text style={{ fontFamily: FONT.serifMedium || FONT.serif, color: theme.text }}> Tasky</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { letterSpacing: -0.2 },
});
