// ============================================================
// Shared UI primitives: typography, Fab, Switch, Seg, Toast, Confirm.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
export function Fab({ theme, onPress, bottomInset = 0 }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
      onPress={onPress}
      style={[styles.fabWrap, { bottom: 110 + bottomInset }]}
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
export function Toast({ message, theme, onDone, onUndo, duration = 2200 }) {
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
    <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { opacity: op, transform: [{ translateY: y }] }]}>
      <View style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}>
        <Icon.tick size={14} color={theme.accent} />
        <Text style={{ fontFamily: FONT.sansSemi, fontSize: 13, color: theme.text }}>{message}</Text>
        {onUndo && (
          <Pressable
            onPress={() => {
              onUndo();
              // Hide toast immediately
              Animated.parallel([
                Animated.timing(y, { toValue: 20, duration: 150, useNativeDriver: true }),
                Animated.timing(op, { toValue: 0, duration: 150, useNativeDriver: true }),
              ]).start(() => onDone());
            }}
            style={{
              marginLeft: 12,
              paddingVertical: 4,
              paddingHorizontal: 10,
              backgroundColor: theme.accentSoft,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontFamily: FONT.sansBold, fontSize: 12, color: theme.accent }}>Undo</Text>
          </Pressable>
        )}
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
export function PaywallDialog({
  open, onPurchase, onRestore, onCancel, theme,
  salePrice = '$4.99', referencePrice = null, badge = null, busy = false,
}) {
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
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              {/* Strikethrough only when a GENUINE reference price is set
                  (PAYWALL_PRICING.referencePrice). Never fabricate one. */}
              {referencePrice ? (
                <Text style={{ fontFamily: FONT.serif, fontSize: 20, color: theme.text3, textDecorationLine: 'line-through' }}>
                  {referencePrice}
                </Text>
              ) : null}
              <Text style={{ fontFamily: FONT.serifMedium, fontSize: 32, color: theme.accent }}>{salePrice}</Text>
            </View>
            {badge ? (
              <Text style={{ fontFamily: FONT.sansSemi, fontSize: 11, color: theme.onAccent, backgroundColor: theme.accent, overflow: 'hidden', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 }}>
                {badge}
              </Text>
            ) : null}
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 12, color: theme.text3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>
              One-time payment · Lifetime access
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <Pressable disabled={busy} style={[styles.dlgBtn, { backgroundColor: theme.accent, height: 48, opacity: busy ? 0.6 : 1 }]} onPress={onPurchase}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>
                {busy ? 'Processing…' : 'Upgrade Now'}
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable disabled={busy} style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onRestore}>
                <Text style={{ fontFamily: FONT.sansBold, fontSize: 13, color: theme.text2 }}>Restore</Text>
              </Pressable>
              <Pressable disabled={busy} style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onCancel}>
                <Text style={{ fontFamily: FONT.sansBold, fontSize: 13, color: theme.text3 }}>Not Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Trial countdown banner (FOMO) ---------- */
// Slim, tappable bar shown while the 7-day trial is live. Pulses gently
// and turns urgent (accent fill) on the final 2 days. Tapping opens the
// paywall. Render nothing once purchased / trial over.
export function TrialBanner({ daysLeft, onPress, theme }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const urgent = daysLeft <= 2;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const label =
    daysLeft <= 0
      ? 'Trial ended'
      : daysLeft === 1
      ? 'Last day of your free trial'
      : `${daysLeft} days left in your free trial`;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 2,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: urgent ? theme.accent : theme.accentSoft,
        borderWidth: urgent ? 0 : 1,
        borderColor: theme.accentSoft,
      }}
    >
      <Animated.View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: urgent ? theme.onAccent : theme.accent,
          transform: [{ scale: dotScale }],
          opacity: dotOpacity,
        }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: FONT.sansSemi,
          fontSize: 12.5,
          color: urgent ? theme.onAccent : theme.text,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: FONT.sansBold,
          fontSize: 12.5,
          color: urgent ? theme.onAccent : theme.accent,
        }}
      >
        Upgrade ›
      </Text>
    </Pressable>
  );
}

/* ---------- Rating star (filled / outline) ---------- */
function RatingStar({ filled, color, dim, size = 40 }) {
  const d = 'M12 2.6l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.5l1-6.1L3.2 9.1l6.1-.9z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        fill={filled ? color : 'none'}
        stroke={filled ? color : dim}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ---------- Rating dialog (Play Store review flow) ----------
   Star selector with a smooth entrance. The parent decides what to do
   with the chosen rating (4–5 → Play Store, 1–3 → in-app feedback). */
export function RatingDialog({ open, theme, petId = 'zen', onSubmit, onLater, onClose }) {
  const [stars, setStars] = useState(0);
  const op = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (open) {
      setStars(0);
      op.setValue(0);
      scale.setValue(0.9);
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  const hint =
    stars === 0
      ? 'Tap a star to rate'
      : stars <= 2
      ? 'Sorry to hear that — tell us what to fix.'
      : stars === 3
      ? 'Thanks — how can we do better?'
      : stars === 4
      ? 'Lovely! A quick review means a lot.'
      : 'Amazing! Mind sharing the love on Google Play?';

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialog,
            { backgroundColor: theme.surface, padding: 26, alignItems: 'center', opacity: op, transform: [{ scale }] },
          ]}
        >
          {/* Close button */}
          <Pressable onPress={onClose} hitSlop={10} style={ratingStyles.close}>
            <Text style={{ fontFamily: FONT.sansBold, fontSize: 20, color: theme.text3, lineHeight: 22 }}>×</Text>
          </Pressable>

          {/* App icon — the companion in a soft halo */}
          <View style={[ratingStyles.iconHalo, { backgroundColor: theme.accentSoft }]}>
            <Pet petId={petId} theme={theme} size={66} mood="rest" reactive={false} />
          </View>

          <Text style={{ fontFamily: FONT.serif, fontSize: 24, color: theme.text, textAlign: 'center', marginTop: 16 }}>
            Enjoying HiTasky?
          </Text>
          <Text style={{ fontFamily: FONT.sans, fontSize: 14, lineHeight: 21, color: theme.text2, marginTop: 8, textAlign: 'center' }}>
            Your rating helps other people find a calmer way to keep their days.
          </Text>

          {/* Star selector */}
          <View style={ratingStyles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} style={ratingStyles.starBtn}>
                <RatingStar filled={n <= stars} color={theme.accent} dim={theme.text4} size={38} />
              </Pressable>
            ))}
          </View>

          <Text style={{ fontFamily: FONT.sansMedium, fontSize: 12.5, color: theme.text3, textAlign: 'center', minHeight: 18 }}>
            {hint}
          </Text>

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 20, width: '100%' }}>
            <Pressable
              disabled={stars === 0}
              style={[styles.dlgBtn, { backgroundColor: theme.accent, height: 48, opacity: stars === 0 ? 0.5 : 1 }]}
              onPress={() => onSubmit(stars)}
            >
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>
                {stars >= 4 ? 'Rate on Google Play' : stars > 0 ? 'Send feedback' : 'Rate Now'}
              </Text>
            </Pressable>
            <Pressable style={[styles.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onLater}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 13, color: theme.text3 }}>Maybe later</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ratingStyles = StyleSheet.create({
  close: { position: 'absolute', top: 14, right: 16, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  iconHalo: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  starsRow: { flexDirection: 'row', gap: 4, marginTop: 18, marginBottom: 10 },
  starBtn: { padding: 2 },
});

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
