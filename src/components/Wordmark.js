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
        style={{
          fontFamily: FONT.serifItalic,
          color: theme.accent,
          fontSize: size,
          letterSpacing: -0.2,
        }}
      >
        Hi
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: FONT.serifMedium || FONT.serif,
          color: theme.text,
          fontSize: size,
          letterSpacing: -0.2,
          marginLeft: 4,
        }}
      >
        Tasky
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
