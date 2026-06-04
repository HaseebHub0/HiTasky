// ============================================================
// ONBOARDING — six calm, editorial panels. First run only.
// Honest about the one-time price; ends by unlocking the app.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { Icon } from '../components/icons.js';
import { Wordmark } from '../components/Wordmark.js';
import { Pet } from '../components/Pet.js';
import { requestPermissions } from '../lib/notifications.js';
import { FREE_FOR_ALL } from '../lib/config.js';
import { PETS, getPet, emitPetReaction } from '../lib/pets.js';
import { FONT, makeTheme, softOf } from '../theme.js';

const { width: SCREEN_W } = Dimensions.get('window');

// Stacked preview components resembling real UI mockups for a handcrafted feel (ref: Warren Buffett book stack style)
function WelcomeCardStack({ theme }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }).start();

    const mk = (val, d) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = mk(floatAnim, 3400);
    const b = mk(glow, 2600);
    a.start();
    b.start();
    return () => { a.stop(); b.stop(); };
  }, []);

  // entrance + continuous pseudo-3D sway (perspective + multi-axis rotation)
  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const enterTY = enter.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const rotY = floatAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-10deg', '0deg', '10deg'] });
  const rotYBack = floatAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['8deg', '0deg', '-8deg'] });
  const rotX = floatAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['6deg', '0deg', '6deg'] });
  const translateY1 = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const translateY2 = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] });

  return (
    <View style={stackStyles.container}>
      {/* soft ember glow behind the stack */}
      <Animated.View
        pointerEvents="none"
        style={[stackStyles.glow, { backgroundColor: theme.accent, opacity: glowOp, transform: [{ scale: glowScale }] }]}
      />

      {/* Card 1: Completed Task (tilted right, background) */}
      <Animated.View
        style={[
          stackStyles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.hairline,
            opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
            transform: [
              { perspective: 900 },
              { translateX: 28 },
              { translateY: Animated.add(enterTY, translateY2) },
              { rotateX: rotX },
              { rotateY: rotYBack },
              { rotateZ: '5deg' },
              { scale: enterScale },
            ],
          },
        ]}
      >
        <View style={stackStyles.row}>
          <View style={[stackStyles.checkRing, { borderColor: theme.text3, backgroundColor: theme.accentSoft }]}>
            <Icon.tick size={12} color={theme.accent} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[stackStyles.titleText, { color: theme.text3, textDecorationLine: 'line-through' }]}>
              Send the Fellows essay
            </Text>
            <Text style={[stackStyles.metaText, { color: theme.text4 }]}>Inbox · Completed</Text>
          </View>
        </View>
      </Animated.View>

      {/* Card 2: Active Task (tilted left, foreground focus) */}
      <Animated.View
        style={[
          stackStyles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.accent,
            borderWidth: 1.5,
            shadowColor: theme.accent,
            shadowOpacity: theme.mode === 'light' ? 0.12 : 0.32,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 12 },
            opacity: enter,
            transform: [
              { perspective: 900 },
              { translateX: -20 },
              { translateY: Animated.add(enterTY, translateY1) },
              { rotateX: rotX },
              { rotateY: rotY },
              { rotateZ: '-3deg' },
              { scale: enterScale },
            ],
          },
        ]}
      >
        <View style={stackStyles.row}>
          <View style={[stackStyles.checkRing, { borderColor: theme.accent, borderWidth: 1.8 }]}>
            <View style={[stackStyles.dot, { backgroundColor: theme.accent }]} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[stackStyles.titleText, { color: theme.text, fontFamily: FONT.serif, fontSize: 16 }]} numberOfLines={1}>
              Reply to Mara
            </Text>
            <Text style={[stackStyles.metaText, { color: theme.accent, fontFamily: FONT.sansSemi }]}>
              Now · Today 9:30 pm
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function OrganizeListPreview({ theme }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2800,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  const rotY = floatAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-12deg', '0deg', '12deg'] });

  return (
    <View style={{ width: 110, height: 95, justifyContent: 'center', alignItems: 'center' }}>
      {/* Background card */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 90,
          height: 52,
          borderRadius: 12,
          backgroundColor: theme.surface,
          borderColor: theme.hairline,
          borderWidth: 1,
          opacity: 0.6,
          transform: [
            { perspective: 600 },
            { translateX: -10 },
            { translateY: translateY },
            { rotateY: rotY },
            { rotateZ: '-8deg' },
          ],
        }}
      />
      {/* Foreground card */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 95,
          height: 55,
          borderRadius: 12,
          backgroundColor: theme.surface,
          borderColor: theme.accent,
          borderWidth: 1.5,
          padding: 8,
          justifyContent: 'center',
          shadowColor: theme.accent,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          transform: [
            { perspective: 600 },
            { translateY: translateY },
            { rotateY: rotY },
            { rotateZ: '6deg' },
          ],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11.5, fontFamily: FONT.sansSemi, color: theme.text }} numberOfLines={1}>
              Studio
            </Text>
            <Text style={{ fontSize: 8.5, fontFamily: FONT.sansMedium, color: theme.text3 }}>
              4 left
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function FocusTaskPreview({ theme }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [3, -3] });
  const rotY = floatAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['10deg', '0deg', '-10deg'] });

  return (
    <View style={{ width: 110, height: 95, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          width: 105,
          borderRadius: 12,
          backgroundColor: theme.accent,
          borderColor: theme.accent,
          borderWidth: 1.5,
          padding: 8,
          shadowColor: theme.accent,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          transform: [
            { perspective: 600 },
            { translateY: translateY },
            { rotateY: rotY },
            { rotateZ: '-3deg' },
          ],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: theme.onAccent, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.onAccent }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: FONT.sansSemi, color: theme.onAccent }} numberOfLines={1}>
              Read essays
            </Text>
            <Text style={{ fontSize: 8.5, fontFamily: FONT.sansMedium, color: theme.onAccent, opacity: 0.85 }}>
              Today
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const stackStyles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 150,
    borderRadius: 120,
  },
  card: {
    position: 'absolute',
    width: 230,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  titleText: {
    fontSize: 13.5,
    fontFamily: FONT.sansSemi,
  },
  metaText: {
    fontSize: 10.5,
    fontFamily: FONT.sansMedium,
  },
});

export function OnboardingScreen() {
  const { state, actions } = useStore();
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState(state.settings.theme || 'dark');
  const [done, setDone] = useState(false);
  const [firstListName, setFirstListName] = useState('');
  const [firstTaskTitle, setFirstTaskTitle] = useState('');
  const flatRef = useRef(null);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current; // panel content fade/rise

  // Interactive Zen Pond ripples
  const [ripples, setRipples] = useState([]);

  // Drifting leaves animations
  const leaf1 = useRef(new Animated.Value(0)).current;
  const leaf2 = useRef(new Animated.Value(0)).current;
  const leaf3 = useRef(new Animated.Value(0)).current;

  const theme = makeTheme(sel, state.settings.accent, state.settings.pet || 'zen'); // Follow selected pet theme

  // live-apply theme as user picks
  useEffect(() => {
    if (state.settings.theme !== sel) actions.setSetting('theme', sel);
  }, [sel]);

  // first panel fades in on mount + start drifting leaves
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    const floatAnim = (anim, duration, delay) => {
      anim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    floatAnim(leaf1, 15000, 0);
    floatAnim(leaf2, 19000, 2500);
    floatAnim(leaf3, 23000, 6000);
  }, []);

  const handleTouchStart = (e) => {
    const { pageX, pageY } = e.nativeEvent;
    const id = Date.now() + Math.random();
    const anim = new Animated.Value(0);
    const newRipple = { id, x: pageX, y: pageY, anim };
    setRipples((prev) => [...prev, newRipple]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const goTo = useCallback((p) => {
    const target = Math.max(0, Math.min(p, 8));
    flatRef.current?.scrollToIndex({ index: target, animated: true });
    setPage(target);
    // replay the content entrance for the panel we just landed on
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 460, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const next = useCallback(() => goTo(page + 1), [page]);
  const skip = useCallback(() => goTo(8), []);

  const finish = useCallback((purchased) => {
    setDone(true);
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    setTimeout(() => {
      actions.setSetting('theme', sel);
      actions.setSetting('pet', state.settings.pet || 'zen'); // Meditative Zen frog is the companion by default
      if (purchased) actions.setSetting('purchased', true);
      actions.setSetting('onboarded', true);
    }, 1500);
  }, [sel, state.settings.pet]);

  const s = makeStyles(theme);

  const panels = [
    // 0 · WELCOME
    <WelcomePanel key="welcome" theme={theme} s={s} next={next} finish={finish} />,
    // 1 · PRIVATE
    <PrivatePanel key="private" theme={theme} s={s} next={next} skip={skip} />,
    // 2 · FEEL
    <FeelPanel key="feel" theme={theme} s={s} next={next} skip={skip} active={page === 2} />,
    // 3 · REMINDERS
    <RemindersPanel key="reminders" theme={theme} s={s} next={next} skip={skip} />,
    // 4 · THEME
    <ThemePanel key="theme" theme={theme} s={s} next={next} skip={skip} sel={sel} setSel={setSel} />,
    // 5 · CREATE LIST
    <CreateListPanel key="create-list" theme={theme} s={s} next={next} skip={skip} firstListName={firstListName} setFirstListName={setFirstListName} actions={actions} />,
    // 6 · CREATE TASK
    <CreateTaskPanel key="create-task" theme={theme} s={s} next={next} skip={skip} firstTaskTitle={firstTaskTitle} setFirstTaskTitle={setFirstTaskTitle} actions={actions} state={state} />,
    // 7 · COMPANION
    <CompanionPanel key="companion" theme={theme} s={s} next={next} skip={skip} state={state} actions={actions} active={page === 7} />,
    // 8 · PURCHASE / FREE
    FREE_FOR_ALL
      ? <FreePanel key="free" theme={theme} s={s} finish={finish} />
      : <PurchasePanel key="purchase" theme={theme} s={s} finish={finish} />,
  ];

  // Interpolate leaves positions
  const leafX1 = leaf1.interpolate({ inputRange: [0, 1], outputRange: [-50, SCREEN_W + 50] });
  const leafY1 = leaf1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [100, 130, 90] });
  const leafRot1 = leaf1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const leafX2 = leaf2.interpolate({ inputRange: [0, 1], outputRange: [-50, SCREEN_W + 50] });
  const leafY2 = leaf2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [380, 340, 400] });
  const leafRot2 = leaf2.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '450deg'] });

  const leafX3 = leaf3.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_W + 50, -50] });
  const leafY3 = leaf3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [640, 670, 620] });
  const leafRot3 = leaf3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-270deg'] });

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]} onTouchStart={handleTouchStart}>
      {/* Drifting Leaves Background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Animated.Text style={{ fontSize: 24, zIndex: 1, transform: [{ translateX: leafX1 }, { translateY: leafY1 }, { rotate: leafRot1 }], opacity: theme.mode === 'light' ? 0.22 : 0.12 }}>🍃</Animated.Text>
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Animated.Text style={{ fontSize: 24, zIndex: 1, transform: [{ translateX: leafX2 }, { translateY: leafY2 }, { rotate: leafRot2 }], opacity: theme.mode === 'light' ? 0.18 : 0.1 }}>🌿</Animated.Text>
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Animated.Text style={{ fontSize: 24, zIndex: 1, transform: [{ translateX: leafX3 }, { translateY: leafY3 }, { rotate: leafRot3 }], opacity: theme.mode === 'light' ? 0.15 : 0.08 }}>🍃</Animated.Text>
        </View>
      </View>

      {/* Zen Pond Touch Ripples */}
      {ripples.map((r) => {
        const scale = r.anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 4] });
        const opacity = r.anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
        return (
          <View
            key={r.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: r.x - 30,
              top: r.y - 30,
            }}
          >
            <Animated.View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 2,
                borderColor: theme.accent,
                opacity: opacity,
                transform: [{ scale }],
              }}
            />
          </View>
        );
      })}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatRef}
          data={panels}
          extraData={theme}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Animated.View
              style={{
                width: SCREEN_W,
                opacity: index === page ? enter : 1,
                transform: [{ translateY: index === page ? enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) : 0 }],
              }}
            >
              {item}
            </Animated.View>
          )}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        />
      </KeyboardAvoidingView>

      {done && (
        <Animated.View style={[s.doneOverlay, { backgroundColor: theme.bg, opacity: fadeIn }]}>
          <Pet petId={state.settings.pet} theme={theme} size={96} mood="complete" />
          <Wordmark theme={theme} size={34} />
          <Text style={[s.doneTitle, { color: theme.text }]}>
            Welcome to <Text style={{ fontStyle: 'italic', color: theme.accent }}>Hi Tasky.</Text>
          </Text>
          <Text style={[s.doneSub, { color: theme.text3 }]}>
            Everything is ready. And it's yours.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ---- Dots indicator ---- */
function Dots({ n, i, theme }) {
  return (
    <View style={dotStyles.wrap}>
      {Array.from({ length: n }).map((_, k) => (
        <View
          key={k}
          style={[
            dotStyles.dot,
            { backgroundColor: k === i ? theme.accent : theme.text4 },
            k === i && dotStyles.dotOn,
          ]}
        />
      ))}
    </View>
  );
}
const dotStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 4 },
  dotOn: { width: 22 },
});

/* ---- CTA Button (with press micro-interaction) ---- */
function CTA({ label, ghost, theme, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, friction: 6, tension: 220, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(ghost ? 0.97 : 0.95)}
      onPressOut={() => press(1)}
    >
      <Animated.View
        style={[
          ctaStyles.btn,
          { transform: [{ scale }] },
          ghost
            ? { backgroundColor: 'transparent' }
            : {
              backgroundColor: theme.accent,
              shadowColor: theme.accent,
              shadowOpacity: 0.5,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            },
        ]}
      >
        <Text style={[ctaStyles.text, { color: ghost ? theme.text2 : theme.onAccent }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
const ctaStyles = StyleSheet.create({
  btn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginHorizontal: 30 },
  text: { fontFamily: FONT.sansBold, fontSize: 16, letterSpacing: 0.2 },
});

/* ---- 5 · CREATE LIST ---- */
function CreateListPanel({ theme, s, next, skip, firstListName, setFirstListName, actions }) {
  const handleNext = () => {
    if (firstListName.trim()) {
      actions.addList(firstListName.trim());
      next();
    }
  };

  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={5} theme={theme} />
        <Pressable onPress={skip}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>05 · <Text style={{ color: theme.accent }}>Organize</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[s.obTitle, { color: theme.text, fontSize: 32, lineHeight: 36 }]}>
              Create your{'\n'}first <Text style={{ fontStyle: 'italic' }}>list.</Text>
            </Text>
          </View>
          <OrganizeListPreview theme={theme} />
        </View>
        <Text style={[s.obLede, { color: theme.text2, marginTop: 4 }]}>
          Lists help group tasks by project (e.g. Work, Studio, Reading). What project are you working on?
        </Text>

        <TextInput
          style={[s.tourInput, { color: theme.text, borderColor: theme.hairline2, backgroundColor: theme.surface }]}
          placeholder="e.g. Work, Home, Reading"
          placeholderTextColor={theme.text4}
          value={firstListName}
          onChangeText={setFirstListName}
          selectionColor={theme.accent}
          onSubmitEditing={handleNext}
          autoCapitalize="words"
        />
      </View>
      <CTA
        label={firstListName.trim() ? "Create List" : "Skip List Creation"}
        theme={theme}
        onPress={firstListName.trim() ? handleNext : next}
      />
    </View>
  );
}

/* ---- 6 · CREATE TASK ---- */
function CreateTaskPanel({ theme, s, next, skip, firstTaskTitle, setFirstTaskTitle, actions, state }) {
  const lastList = state.lists[state.lists.length - 1];
  const [assignToList, setAssignToList] = useState(true);

  const handleNext = () => {
    if (firstTaskTitle.trim()) {
      actions.addTask({
        title: firstTaskTitle.trim(),
        listId: (assignToList && lastList) ? lastList.id : null,
        dueAt: new Date().toISOString(),
      });
      next();
    }
  };

  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={6} theme={theme} />
        <Pressable onPress={skip}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>06 · <Text style={{ color: theme.accent }}>Focus</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[s.obTitle, { color: theme.text, fontSize: 32, lineHeight: 36 }]}>
              Add a task to{'\n'}get <Text style={{ fontStyle: 'italic' }}>started.</Text>
            </Text>
          </View>
          <FocusTaskPreview theme={theme} />
        </View>
        <Text style={[s.obLede, { color: theme.text2, marginTop: 4 }]}>
          Write down one action item you need to complete.
        </Text>

        <TextInput
          style={[s.tourInput, { color: theme.text, borderColor: theme.hairline2, backgroundColor: theme.surface }]}
          placeholder="e.g. Read the Agnes Martin catalogue"
          placeholderTextColor={theme.text4}
          value={firstTaskTitle}
          onChangeText={setFirstTaskTitle}
          selectionColor={theme.accent}
          onSubmitEditing={handleNext}
        />

        {lastList && (
          <Pressable
            onPress={() => setAssignToList(!assignToList)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingLeft: 4 }}
          >
            <View style={[s.tourCheck, { borderColor: assignToList ? theme.accent : theme.text4, backgroundColor: assignToList ? theme.accent : 'transparent' }]}>
              {assignToList && <Icon.tick size={12} color={theme.onAccent} />}
            </View>
            <Text style={{ fontFamily: FONT.sansMedium, fontSize: 14, color: theme.text2 }}>
              Put in <Text style={{ color: theme.accent }}>{lastList.name}</Text> list
            </Text>
          </Pressable>
        )}
      </View>
      <CTA
        label={firstTaskTitle.trim() ? "Add Task" : "Skip Task Creation"}
        theme={theme}
        onPress={firstTaskTitle.trim() ? handleNext : next}
      />
    </View>
  );
}

/* ---- 7 · COMPANION ---- */
function CompanionPanel({ theme, s, next, skip, state, actions, active }) {
  const current = state.settings.pet || 'zen';
  const pet = getPet(current);

  // a happy little reaction whenever this panel lands or the pet changes
  useEffect(() => {
    if (!active) return undefined;
    const t = setTimeout(() => emitPetReaction('complete'), 450);
    return () => clearTimeout(t);
  }, [active, current]);

  const pick = (id) => {
    actions.setSetting('pet', id);
    actions.setSetting('accent', null); // let the pet's signature colour lead
  };

  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={7} theme={theme} />
        <Pressable onPress={skip}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>07 · <Text style={{ color: theme.accent }}>Your companion</Text></Text>
        <Text style={[s.obTitle, { color: theme.text }]}>
          Pick a little{'\n'}<Text style={{ fontStyle: 'italic' }}>companion.</Text>
        </Text>

        {/* hero — tap to make it react */}
        <Pressable onPress={() => emitPetReaction('complete')} style={{ alignItems: 'center', marginTop: 16 }}>
          <View style={[s.companionHalo, { backgroundColor: theme.accentSoft }]}>
            <Pet petId={current} theme={theme} size={130} reactive />
          </View>
          <Text style={{ fontFamily: FONT.serifItalic || FONT.serif, fontSize: 15, color: theme.text3, marginTop: 6 }}>
            tap to say hi
          </Text>
        </Pressable>

        {/* picker */}
        <View style={s.petRow}>
          {PETS.map((p) => {
            const on = p.id === current;
            const pt = makeTheme(theme.mode, null, p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => pick(p.id)}
                style={[
                  s.petChip,
                  { backgroundColor: on ? pt.accentSoft : theme.surface, borderColor: on ? pt.accent : theme.hairline2, borderWidth: on ? 2 : 1 },
                ]}
              >
                <Pet petId={p.id} theme={pt} size={36} reactive={false} />
              </Pressable>
            );
          })}
        </View>

        <Text style={[s.obLede, { color: theme.text2, marginTop: 16, fontSize: 15 }]}>
          {pet.name} is {pet.tagline.toLowerCase()} — it reacts as you add and finish tasks, and re-paints the whole app. Swap anytime in Settings.
        </Text>
      </View>
      <CTA label="Continue" theme={theme} onPress={next} />
    </View>
  );
}

/* ---- 0 · WELCOME ---- */
function WelcomePanel({ theme, s, next, finish }) {
  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <View />
        {!FREE_FOR_ALL && (
          <Pressable onPress={() => finish(true)}><Text style={[s.skip, { color: theme.text3 }]}>Restore</Text></Pressable>
        )}
      </View>
      <View style={[s.body, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ marginBottom: 4 }}>
          <Wordmark theme={theme} size={30} />
        </View>
        <WelcomeCardStack theme={theme} />
        <Text style={[s.obTitle, { textAlign: 'center', fontSize: 32, color: theme.text, lineHeight: 36 }]}>
          A quieter way to{'\n'}keep your <Text style={{ fontStyle: 'italic' }}>days.</Text>
        </Text>
        <Text style={[s.obLede, { textAlign: 'center', marginTop: 10, color: theme.text2 }]}>
          Offline. One purchase. Yours for good.
        </Text>
      </View>
      <CTA label="Begin" theme={theme} onPress={next} />
      {!FREE_FOR_ALL && (
        <CTA label="I already own HiTasky" ghost theme={theme} onPress={() => finish(true)} />
      )}
      <Dots n={9} i={0} theme={theme} />
    </View>
  );
}

/* ---- 1 · PRIVATE ---- */
function PrivatePanel({ theme, s, next, skip }) {
  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={1} theme={theme} />
        <Pressable onPress={skip}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>01 · <Text style={{ color: theme.accent }}>Private</Text></Text>
        <Text style={[s.obTitle, { color: theme.text }]}>
          Nothing leaves{'\n'}this <Text style={{ fontStyle: 'italic' }}>phone.</Text>
        </Text>
        <Text style={[s.obLede, { color: theme.text2 }]}>
          No account. No cloud. No quiet tracking. Your tasks live right here — and nowhere else.
        </Text>
      </View>
      <CTA label="Continue" theme={theme} onPress={next} />
    </View>
  );
}

/* ---- 2 · THE FEEL ---- */
function FeelPanel({ theme, s, next, skip, active }) {
  const ringFill = useRef(new Animated.Value(0)).current;
  const strikeWidth = useRef(new Animated.Value(0)).current;
  const petPop = useRef(new Animated.Value(0)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;
  const cardGlow = useRef(new Animated.Value(0)).current;
  const particleBurst = useRef(new Animated.Value(0)).current;
  const [showPet, setShowPet] = useState(false);

  useEffect(() => {
    if (!active) return;
    // Reset all
    ringFill.setValue(0);
    strikeWidth.setValue(0);
    petPop.setValue(0);
    cardEntrance.setValue(0);
    cardGlow.setValue(0);
    particleBurst.setValue(0);
    setShowPet(false);

    // Sequence: card enters → ring fills → strike grows → pet pops → particles
    Animated.timing(cardEntrance, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    const t1 = setTimeout(() => {
      // Ring fills
      Animated.timing(ringFill, { toValue: 1, duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }).start();
      // Glow pulse
      Animated.sequence([
        Animated.timing(cardGlow, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(cardGlow, { toValue: 0.3, duration: 600, useNativeDriver: false }),
      ]).start();
    }, 900);

    const t2 = setTimeout(() => {
      Animated.timing(strikeWidth, { toValue: 1, duration: 500, easing: Easing.bezier(0.25, 1, 0.5, 1), useNativeDriver: false }).start();
    }, 1200);

    const t3 = setTimeout(() => {
      setShowPet(true);
      Animated.spring(petPop, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
      Animated.timing(particleBurst, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 1800);

    // Loop: reset after 4s and replay
    const loop = setTimeout(() => {
      ringFill.setValue(0);
      strikeWidth.setValue(0);
      petPop.setValue(0);
      cardGlow.setValue(0);
      particleBurst.setValue(0);
      setShowPet(false);
      // Re-trigger
      Animated.timing(ringFill, { toValue: 1, duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }).start();
      Animated.sequence([
        Animated.timing(cardGlow, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(cardGlow, { toValue: 0.3, duration: 600, useNativeDriver: false }),
      ]).start();
      setTimeout(() => {
        Animated.timing(strikeWidth, { toValue: 1, duration: 500, easing: Easing.bezier(0.25, 1, 0.5, 1), useNativeDriver: false }).start();
      }, 300);
      setTimeout(() => {
        setShowPet(true);
        Animated.spring(petPop, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
        Animated.timing(particleBurst, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      }, 900);
    }, 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(loop); };
  }, [active]);

  const ringBg = ringFill.interpolate({ inputRange: [0, 1], outputRange: ['transparent', theme.accent] });
  const ringBorder = ringFill.interpolate({ inputRange: [0, 1], outputRange: [theme.text4, theme.accent] });
  const tickOp = ringFill.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const glowBorder = cardGlow.interpolate({ inputRange: [0, 1], outputRange: [theme.hairline2, theme.accent] });
  const glowShadowOp = cardGlow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.5] });

  // Particle emojis
  const particles = ['✨', '🪷', '🌿', '⭐'];

  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={2} theme={theme} />
        <Pressable onPress={skip}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>02 · <Text style={{ color: theme.accent }}>The feel</Text></Text>
        <Text style={[s.obTitle, { color: theme.text }]}>
          Finishing,{'\n'}made <Text style={{ fontStyle: 'italic' }}>tactile.</Text>
        </Text>

        {/* Animated task card demo */}
        <Animated.View style={[s.demoCard, {
          backgroundColor: theme.surface,
          shadowColor: theme.accent,
          borderWidth: 2,
          borderColor: glowBorder,
          shadowOpacity: glowShadowOp,
          shadowRadius: 24,
          opacity: cardEntrance,
          transform: [
            { translateY: cardEntrance.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
            { scale: cardEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        }]}>
          {/* Animated ring */}
          <Animated.View style={[s.demoRing, { backgroundColor: ringBg, borderColor: ringBorder }]}>
            <Animated.View style={{ opacity: tickOp }}>
              <Icon.tick size={15} color={theme.onAccent} />
            </Animated.View>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <View>
              <Text style={[s.demoTitle, { color: theme.text, fontFamily: FONT.serif }]}>Reply to Mara</Text>
              {/* Animated ink strikethrough */}
              <Animated.View style={[s.demoStrike, {
                backgroundColor: theme.accent,
                width: strikeWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={[s.demoMeta, { color: theme.text3 }]}>Today · Work</Text>
          </View>

          {/* Pet celebration */}
          {showPet && (
            <View style={{ position: 'absolute', right: 14, top: '50%', marginTop: -20 }}>
              <Animated.View style={{ transform: [{ scale: petPop }] }}>
                <Pet petId="zen" theme={theme} size={40} mood="complete" />
              </Animated.View>
            </View>
          )}

          {/* Particle burst */}
          {particles.map((p, i) => {
            const angle = (i / particles.length) * Math.PI * 2;
            const dist = 35;
            return (
              <View key={i} style={{ position: 'absolute', left: 18, top: 16 }}>
                <Animated.Text
                  pointerEvents="none"
                  style={{
                    fontSize: 14,
                    opacity: particleBurst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
                    transform: [
                      { translateX: particleBurst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) },
                      { translateY: particleBurst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] }) },
                      { scale: particleBurst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.2, 0.5] }) },
                    ],
                  }}
                >{p}</Animated.Text>
              </View>
            );
          })}
        </Animated.View>

        {/* Second hint card */}
        <View style={[s.demoCard, { backgroundColor: theme.surface, shadowColor: '#000', marginTop: 12, paddingVertical: 14, opacity: 0.7 }]}>
          <View style={[s.demoRing, { borderColor: theme.accent, borderWidth: 1.8 }]}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.demoTitle, { color: theme.text, fontFamily: FONT.serif, fontSize: 16 }]}>Your next task surfaces</Text>
            <Text style={[s.demoMeta, { color: theme.accent, fontSize: 11 }]}>Automatically</Text>
          </View>
        </View>

        <Text style={[s.obLede, { color: theme.text2, marginTop: 18, fontSize: 16 }]}>
          Complete a task and HiTasky draws an ink line through it. A soft haptic tick confirms it's done — <Text style={{ fontStyle: 'italic', color: theme.accent }}>satisfying every time.</Text>
        </Text>
      </View>
      <CTA label="Continue" theme={theme} onPress={next} />
    </View>
  );
}

/* ---- 3 · REMINDERS ---- */
function RemindersPanel({ theme, s, next, skip }) {
  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={3} theme={theme} />
        <Pressable onPress={next}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>03 · <Text style={{ color: theme.accent }}>Gentle nudges</Text></Text>
        <Text style={[s.obTitle, { color: theme.text }]}>
          Nudges that{'\n'}know when to <Text style={{ fontStyle: 'italic' }}>hush.</Text>
        </Text>

        {/* Notification preview */}
        <View style={[s.notif, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          <View style={[s.notifIcon, { backgroundColor: theme.accentSoft }]}>
            <Text style={{ fontSize: 17 }}>{'👋'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.notifHead}>
              <Text style={[s.notifName, { color: theme.text3 }]}>HITASKY</Text>
              <Text style={[s.notifWhen, { color: theme.text4 }]}>now</Text>
            </View>
            <Text style={[s.notifMsg, { color: theme.text }]}>
              One thing for today — <Text style={{ fontStyle: 'italic', color: theme.accent }}>send the Fellows essay.</Text>
            </Text>
          </View>
        </View>

        <Text style={[s.obLede, { color: theme.text2, marginTop: 18 }]}>
          A single, quiet nudge for what matters today — never a stream of pings. Turn them off whenever you like.
        </Text>
      </View>
      <CTA
        label="Allow gentle reminders"
        theme={theme}
        onPress={async () => {
          try { await requestPermissions(); } catch (e) {}
          next();
        }}
      />
      <CTA label="Not now" ghost theme={theme} onPress={next} />
    </View>
  );
}

/* ---- 4 · THEME ---- */
function ThemePanel({ theme, s, next, skip, sel, setSel }) {
  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={4} theme={theme} />
        <Pressable onPress={skip}><Text style={[s.skip, { color: theme.text3 }]}>Skip</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>04 · <Text style={{ color: theme.accent }}>Make it yours</Text></Text>
        <Text style={[s.obTitle, { color: theme.text, marginBottom: 26 }]}>
          Choose your <Text style={{ fontStyle: 'italic' }}>paper.</Text>
        </Text>

        <ThemeCard kind="dark" on={sel === 'dark'} theme={theme} onPress={() => setSel('dark')} />
        <View style={{ height: 14 }} />
        <ThemeCard kind="light" on={sel === 'light'} theme={theme} onPress={() => setSel('light')} />

        <Text style={[s.obLede, { color: theme.text2, marginTop: 18, fontSize: 15 }]}>
          Switch anytime in Settings.
        </Text>
      </View>
      <CTA label="Continue" theme={theme} onPress={next} />
    </View>
  );
}

function ThemeCard({ kind, on, theme, onPress }) {
  const dark = kind === 'dark';
  const swatchBg = dark ? '#18140F' : '#F2EBDD';
  const lines = [
    { top: 14, color: dark ? '#E58A4B' : '#C26A2F' },
    { top: 27, color: dark ? 'rgba(243,236,223,0.28)' : 'rgba(41,35,26,0.22)', w: 30 },
    { top: 40, color: dark ? 'rgba(243,236,223,0.16)' : 'rgba(41,35,26,0.12)' },
    { top: 53, color: dark ? 'rgba(243,236,223,0.16)' : 'rgba(41,35,26,0.12)', w: 22 },
  ];

  return (
    <Pressable
      onPress={onPress}
      style={[
        tcStyles.card,
        {
          backgroundColor: theme.surface,
          borderColor: on ? theme.accent : theme.hairline2,
        },
        on && { backgroundColor: theme.accentSoft },
      ]}
    >
      <View style={[tcStyles.swatch, { backgroundColor: swatchBg }]}>
        {lines.map((l, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 9,
              right: l.w ? undefined : 9,
              width: l.w,
              top: l.top,
              height: 5,
              borderRadius: 3,
              backgroundColor: l.color,
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.serif, fontSize: 18, color: theme.text }}>
          {dark ? 'Warm dark' : 'Fine paper'}
        </Text>
        <Text style={{ fontFamily: FONT.sansMedium, fontSize: 12.5, color: theme.text3, marginTop: 3 }}>
          {dark ? 'Charcoal & ember — the hero look' : 'Daylight off-white, easy on the eye'}
        </Text>
      </View>
      <View style={[tcStyles.check, { borderColor: on ? theme.accent : theme.text4 }, on && { backgroundColor: theme.accent }]}>
        {on && <Icon.tick size={13} color={theme.onAccent} />}
      </View>
    </Pressable>
  );
}
const tcStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: 20, borderWidth: 1.5 },
  swatch: { width: 56, height: 72, borderRadius: 12, overflow: 'hidden' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

/* ---- 7 · FREE (free phase) ---- */
function FreePanel({ theme, s, finish }) {
  const Bullet = ({ children }) => (
    <View style={s.bullet}>
      <View style={[s.bulletCheck, { backgroundColor: theme.accentSoft }]}>
        <Icon.tick size={13} color={theme.accent} />
      </View>
      <Text style={[s.bulletText, { color: theme.text2 }]}>{children}</Text>
    </View>
  );

  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={8} theme={theme} />
        <View />
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>08 · <Text style={{ color: theme.accent }}>All yours</Text></Text>
        <Text style={[s.obTitle, { color: theme.text }]}>
          Everything,{'\n'}<Text style={{ fontStyle: 'italic' }}>unlocked.</Text>
        </Text>
        <Text style={[s.obLede, { color: theme.text2 }]}>
          Every feature is free — no account, no subscription, no catch.
        </Text>

        <View style={{ marginTop: 24, gap: 14 }}>
          <Bullet>Unlimited tasks &amp; lists, your own accents.</Bullet>
          <Bullet>Reminders, daily &amp; weekly repeats, journal streaks.</Bullet>
          <Bullet>
            Works <Text style={{ fontWeight: '700', color: theme.text }}>fully offline</Text>. Your data stays yours.
          </Bullet>
        </View>
      </View>
      <CTA label="Start using HiTasky" theme={theme} onPress={() => finish(false)} />
    </View>
  );
}

/* ---- 5 · PURCHASE ---- */
function PurchasePanel({ theme, s, finish }) {
  const Bullet = ({ children }) => (
    <View style={s.bullet}>
      <View style={[s.bulletCheck, { backgroundColor: theme.accentSoft }]}>
        <Icon.tick size={13} color={theme.accent} />
      </View>
      <Text style={[s.bulletText, { color: theme.text2 }]}>{children}</Text>
    </View>
  );

  return (
    <View style={s.panel}>
      <View style={s.topBar}>
        <Dots n={9} i={8} theme={theme} />
        <Pressable onPress={() => finish(true)}><Text style={[s.skip, { color: theme.text3 }]}>Restore</Text></Pressable>
      </View>
      <View style={[s.body, { justifyContent: 'center' }]}>
        <Text style={[s.obKicker, { color: theme.text3 }]}>08 · <Text style={{ color: theme.accent }}>One price, once</Text></Text>
        <Text style={[s.obTitle, { color: theme.text }]}>
          Buy once.{'\n'}<Text style={{ fontStyle: 'italic' }}>Yours forever.</Text>
        </Text>

        <View style={s.priceRow}>
          <Text style={[s.priceAmt, { color: theme.text }]}>$19</Text>
          <View style={[s.priceBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[s.priceLabel, { color: theme.accent }]}>ONE TIME</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, gap: 14 }}>
          <Bullet>
            <Text style={{ fontWeight: '700', color: theme.text }}>No subscription</Text>, ever — not now, not later.
          </Bullet>
          <Bullet>Every feature, and free updates through v1.</Bullet>
          <Bullet>
            Works <Text style={{ fontWeight: '700', color: theme.text }}>fully offline</Text>. Your data stays yours.
          </Bullet>
        </View>
      </View>
      <CTA label="Unlock HiTasky  ·  $19" theme={theme} onPress={() => finish(true)} />
      <CTA label="Start the free trial" ghost theme={theme} onPress={() => finish(false)} />
    </View>
  );
}

/* ================================================================ */
function makeStyles(t) {
  return StyleSheet.create({
    root: { flex: 1 },
    floatingLeaf: {
      position: 'absolute',
      top: 0,
      left: 0,
      fontSize: 24,
      zIndex: 1,
    },
    panel: { flex: 1, paddingBottom: 26 },
    topBar: {
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 30,
    },
    skip: { fontFamily: FONT.sansSemi, fontSize: 13, letterSpacing: 0.2 },
    body: { flex: 1, paddingHorizontal: 30 },
    brandName: { fontFamily: FONT.serif, fontSize: 30, fontWeight: '500', letterSpacing: 0.4, marginBottom: 22 },
    obKicker: {
      fontFamily: FONT.sansSemi,
      fontSize: 12,
      letterSpacing: 1.9,
      textTransform: 'uppercase',
      marginBottom: 18,
    },
    obTitle: {
      fontFamily: FONT.serifLight || FONT.serif,
      fontSize: 38,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    obLede: {
      fontFamily: FONT.serifLight || FONT.serif,
      fontSize: 18,
      lineHeight: 28,
      marginTop: 20,
    },
    // demo card (feel panel)
    demoCard: {
      marginTop: 30,
      borderRadius: 20,
      padding: 19,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      shadowOpacity: t.mode === 'light' ? 0.12 : 0.4,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    demoRing: { width: 27, height: 27, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
    demoTitle: { fontSize: 19, lineHeight: 25, letterSpacing: -0.1 },
    demoStrike: { position: 'absolute', left: -2, right: -2, top: '52%', height: 2.5, borderRadius: 2 },
    demoMeta: { fontSize: 12.5, fontFamily: FONT.sansMedium, marginTop: 9 },
    hapChip: {
      position: 'absolute',
      top: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderWidth: 1,
      borderRadius: 100,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    // notification (reminders panel)
    notif: {
      marginTop: 30,
      flexDirection: 'row',
      gap: 13,
      alignItems: 'flex-start',
      borderRadius: 20,
      padding: 15,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 14 },
      elevation: 6,
    },
    notifIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    notifHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    notifName: { fontFamily: FONT.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
    notifWhen: { fontFamily: FONT.sansSemi, fontSize: 11.5 },
    notifMsg: { fontFamily: FONT.serif, fontSize: 17, lineHeight: 23, marginTop: 5 },
    // purchase
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 22 },
    priceAmt: { fontFamily: FONT.serif, fontSize: 52, lineHeight: 52 },
    priceBadge: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 100 },
    priceLabel: { fontFamily: FONT.sansBold, fontSize: 12, letterSpacing: 1.2 },
    bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    bulletCheck: { width: 20, height: 20, borderRadius: 10, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
    bulletText: { flex: 1, fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 20 },
    // done overlay
    doneOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 22,
    },
    doneTitle: { fontFamily: FONT.serifLight || FONT.serif, fontSize: 30 },
    doneSub: { fontFamily: FONT.sansMedium, fontSize: 13 },
    tourInput: {
      fontFamily: FONT.sans,
      fontSize: 16,
      borderWidth: 1.5,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      marginTop: 18,
      marginBottom: 10,
    },
    tourCheck: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // companion panel
    companionHalo: {
      width: 168,
      height: 168,
      borderRadius: 84,
      alignItems: 'center',
      justifyContent: 'center',
    },
    petRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      marginTop: 22,
    },
    petChip: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
