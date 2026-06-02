// ============================================================
// Bottom tab bar — Today · Lists · Done · Settings.
// Each tab lifts and lights an ember indicator dot when active;
// switching tabs fires a soft selection haptic. (micro-interactions)
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons.js';
import { FONT } from '../theme.js';
import { selectionFeedback } from '../lib/feedback.js';

const TABS = [
  { id: 'today', label: 'Today', icon: Icon.today },
  { id: 'lists', label: 'Lists', icon: Icon.lists },
  { id: 'done', label: 'Journal', icon: Icon.doneTab },
  { id: 'settings', label: 'Settings', icon: Icon.gear },
];

function Tab({ tab, on, theme, settings, onPress }) {
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(a, { toValue: on ? 1 : 0, friction: 7, tension: 140, useNativeDriver: true }).start();
  }, [on]);

  const color = on ? theme.accent : theme.text3;
  const lift = a.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const iconScale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const dotScale = a.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable
      style={styles.tab}
      onPress={() => {
        if (!on) selectionFeedback(settings);
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ translateY: lift }, { scale: iconScale }] }}>
        <tab.icon size={22} color={color} />
      </Animated.View>
      <Text style={[styles.lbl, { color }]}>{tab.label}</Text>
      <Animated.View
        style={[styles.dot, { backgroundColor: theme.accent, opacity: a, transform: [{ scale: dotScale }] }]}
      />
    </Pressable>
  );
}

export function BottomNav({ active, onChange, theme, settings, bottomInset = 0 }) {
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.bg, borderTopColor: theme.hairline, paddingBottom: 8 + bottomInset },
      ]}
    >
      {TABS.map((t) => (
        <Tab
          key={t.id}
          tab={t}
          on={active === t.id}
          theme={theme}
          settings={settings}
          onPress={() => onChange(t.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 6 },
  lbl: { fontSize: 10.5, fontFamily: FONT.sansSemi, letterSpacing: 0.4 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
