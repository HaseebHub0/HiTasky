// ============================================================
// Shared UI primitives: typography, Fab, Switch, Seg, Toast, Confirm.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons.js';
import { Illustration } from './illustrations.js';
import { Wordmark } from './Wordmark.js';
import { Pet } from './Pet.js';
import { FONT } from '../theme.js';

/* ---------- typography ---------- */
export function Kicker({ children, style, accent }) {
  return (
    <Text style={[{ fontFamily: FONT.sansSemi, fontSize: 12, letterSpacing: 1.9, textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}
export function Display({ children, style }) {
  return <Text style={[{ fontFamily: FONT.serifLight, fontSize: 34, lineHeight: 37, letterSpacing: -0.3 }, style]}>{children}</Text>;
}
export function H2({ children, style }) {
  return <Text style={[{ fontFamily: FONT.serif, fontSize: 23, lineHeight: 26, letterSpacing: -0.2 }, style]}>{children}</Text>;
}
export function Meta({ children, style }) {
  return <Text style={[{ fontFamily: FONT.sansMedium, fontSize: 13 }, style]}>{children}</Text>;
}

/* ---------- FAB ---------- */
export function Fab({ theme, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
      onPress={onPress}
      style={styles.fabWrap}
      accessibilityRole="button"
      accessibilityLabel="Add task"
    >
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: theme.accent, shadowColor: theme.accent, transform: [{ scale }] },
        ]}
      >
        <Icon.plus size={22} color={theme.onAccent} />
      </Animated.View>
    </Pressable>
  );
}

/* ---------- Switch ---------- */
export function Switch({ value, onChange, theme }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, friction: 7 }).start();
  }, [value]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [3, 23] });
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[
        styles.switch,
        { backgroundColor: value ? theme.accent : theme.surface2, borderColor: value ? 'transparent' : theme.hairline2 },
      ]}
    >
      <Animated.View
        style={[styles.knob, { backgroundColor: value ? theme.onAccent : theme.text3, transform: [{ translateX: tx }] }]}
      />
    </Pressable>
  );
}

/* ---------- Segmented control ---------- */
export function Seg({ options, value, onChange, theme }) {
  return (
    <View style={[styles.seg, { backgroundColor: theme.surface2 }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segBtn, on && { backgroundColor: theme.bg }]}
          >
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 13, color: on ? theme.text : theme.text3 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Toast ---------- */
export function Toast({ message, theme, onDone, duration = 2200 }) {
  const y = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!message) return undefined;
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 7 }),
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, { toValue: 20, duration: 200, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDone());
    }, duration);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity: op, transform: [{ translateY: y }] }]}>
      <View style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}>
        <Icon.tick size={14} color={theme.accent} />
        <Text style={{ fontFamily: FONT.sansSemi, fontSize: 13, color: theme.text }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger, onConfirm, onCancel, theme }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onCancel} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
          <Text style={{ fontFamily: FONT.serif, fontSize: 22, color: theme.text }}>{title}</Text>
          {body ? <Text style={{ fontFamily: FONT.sans, fontSize: 14, lineHeight: 21, color: theme.text2, marginTop: 10 }}>{body}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <Pressable style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onCancel}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.text2 }}>Keep</Text>
            </Pressable>
            <Pressable style={[styles.dlgBtn, { backgroundColor: danger ? '#C2503A' : theme.accent }]} onPress={onConfirm}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: danger ? '#fff' : theme.onAccent }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Paywall dialog ---------- */
export function PaywallDialog({ open, onPurchase, onRestore, onCancel, theme }) {
  const features = [
    { label: 'Unlimited tasks & lists', free: false, pro: true },
    { label: 'Unlimited recurring tasks', free: false, pro: true },
    { label: 'Custom accent themes', free: false, pro: true },
    { label: 'All pet companions', free: false, pro: true },
    { label: 'Local backup & restore', free: false, pro: true },
    { label: 'No ads, ever', free: false, pro: true },
  ];

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onCancel} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.dialog, { backgroundColor: theme.surface, padding: 26 }]}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Wordmark theme={theme} size={24} wave={false} />
          </View>
          <Text style={{ fontFamily: FONT.serif, fontSize: 23, color: theme.text, textAlign: 'center' }}>
            Unlock HiTasky Premium
          </Text>
          <Text style={{ fontFamily: FONT.sans, fontSize: 14, lineHeight: 21, color: theme.text2, marginTop: 12, textAlign: 'center' }}>
            One payment. Yours forever. No subscription.
          </Text>
          
          {/* Feature list */}
          <View style={{ marginTop: 16, marginBottom: 6 }}>
            {features.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <Icon.tick size={14} color={theme.accent} />
                <Text style={{ fontFamily: FONT.sansMedium, fontSize: 13.5, color: theme.text, flex: 1 }}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONT.serifMedium, fontSize: 32, color: theme.accent }}>$19</Text>
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 12, color: theme.text3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
              One-time payment · Lifetime access
            </Text>
          </View>
          
          <View style={{ gap: 10 }}>
            <Pressable style={[styles.dlgBtn, { backgroundColor: theme.accent, height: 48 }]} onPress={onPurchase}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>
                Upgrade Now
              </Text>
            </Pressable>
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onRestore}>
                <Text style={{ fontFamily: FONT.sansBold, fontSize: 13, color: theme.text2 }}>Restore</Text>
              </Pressable>
              <Pressable style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onCancel}>
                <Text style={{ fontFamily: FONT.sansBold, fontSize: 13, color: theme.text3 }}>Not Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Feedback prompt (auto, after the user settles in) ---------- */
export function FeedbackPrompt({ open, theme, onShare, onDismiss }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onDismiss} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.dialog, { backgroundColor: theme.surface, padding: 26, alignItems: 'center' }]}>
          <View style={{ marginBottom: 4 }}>
            <Illustration name="done" theme={theme} />
          </View>
          <Text style={{ fontFamily: FONT.serif, fontSize: 23, color: theme.text, textAlign: 'center' }}>
            Enjoying HiTasky?
          </Text>
          <Text style={{ fontFamily: FONT.sans, fontSize: 14, lineHeight: 21, color: theme.text2, marginTop: 10, textAlign: 'center' }}>
            You've settled in nicely. Mind sharing a quick thought? It helps shape what comes next.
          </Text>
          <View style={{ gap: 10, marginTop: 22, width: '100%' }}>
            <Pressable style={[styles.dlgBtn, { backgroundColor: theme.accent, height: 48 }]} onPress={onShare}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>Share a thought</Text>
            </Pressable>
            <Pressable style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onDismiss}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 13, color: theme.text3 }}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Empty State ---------- */
// Maps the legacy `icon` prop (and list icons) onto a custom illustration.
// No brand logo is ever shown in an empty state.
const ILLUSTRATION_FOR = {
  brand: 'calm',
  nib: 'calm',
  today: 'calm',
  doneTab: 'journal',
  book: 'journal',
  done: 'done',
  list: 'page',
  lists: 'page',
  home: 'page',
  briefcase: 'page',
  heart: 'page',
  star: 'page',
};

export function EmptyState({ title, subtitle, footer, icon = 'lists', illustration, theme, petId }) {
  const scene = illustration || ILLUSTRATION_FOR[icon] || 'calm';

  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.art}>
        {petId ? (
          <View style={{ alignItems: 'center' }}>
            <Pet petId={petId} theme={theme} size={90} mood="rest" />
          </View>
        ) : (
          <Illustration name={scene} theme={theme} />
        )}
      </View>
      <Text style={[emptyStyles.title, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[emptyStyles.subtitle, { color: theme.text2 }]}>
        {subtitle}
      </Text>
      {footer ? (
        <Text style={[emptyStyles.footer, { color: theme.text3 }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 50,
  },
  art: {
    marginBottom: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONT.serifLight,
    fontSize: 28,
    lineHeight: 33,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONT.serif,
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
    fontWeight: '300',
  },
  footer: {
    fontFamily: FONT.sansMedium,
    fontSize: 12.5,
    marginTop: 22,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  fabWrap: { position: 'absolute', right: 20, bottom: 100, zIndex: 10 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  switch: { width: 50, height: 30, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, position: 'absolute', left: 0 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4 },
  segBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 100,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  scrim: { ...StyleSheet.absoluteFillObject },
  centerWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  dialog: { borderRadius: 24, padding: 24 },
  dlgBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
