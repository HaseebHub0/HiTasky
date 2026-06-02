// ============================================================
// Wordmark — HiTasky's signature lockup.
// A waving-hand badge + editorial "HiTasky" serif wordmark
// ("Hi" set in ember italic). Crisp, themeable, and identical
// across every header so the brand reads the same everywhere.
// This is the app's signature style — use it, never the raw
// logo image, inside the UI.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { HandMark } from './icons.js';
import { FONT } from '../theme.js';

/**
 * @param {object}  theme
 * @param {number}  size      base type size of the wordmark (default 22)
 * @param {boolean} wave      gentle waving-hand micro-interaction (default true)
 * @param {boolean} showBadge render the hand badge (default true)
 */
export function Wordmark({ theme, size = 22, wave = true, showBadge = true, style }) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!wave) return undefined;
    // A small, polite wave that plays once on mount, then rests.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(rot, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(4200),
      ]),
      { resetBeforeIteration: true }
    );
    loop.start();
    return () => loop.stop();
  }, [wave]);

  const spin = rot.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '16deg'] });

  const badge = Math.round(size * 1.55);
  const radius = Math.round(badge * 0.32);

  return (
    <View style={[styles.row, { gap: Math.round(size * 0.5) }, style]}>
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: radius,
              backgroundColor: theme.accentSoft,
              borderColor: theme.accent,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <HandMark size={Math.round(size * 1.02)} color={theme.accent} />
          </Animated.View>
        </View>
      )}
      <Text style={[styles.word, { fontSize: size, lineHeight: Math.round(size * 1.1) }]}>
        <Text style={{ fontFamily: FONT.serifItalic, color: theme.accent }}>Hi</Text>
        <Text style={{ fontFamily: FONT.serif, color: theme.text }}>Tasky</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  word: { letterSpacing: -0.3 },
});
