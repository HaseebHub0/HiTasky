import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons.js';
import { Pet } from './Pet.js';
import { FONT } from '../theme.js';
import { completionFeedback, selectionFeedback } from '../lib/feedback.js';
import { useStore } from '../lib/store.js';
import { dueLabel as fmtDue, isOverdue, completedLabel, recurringLabel } from '../lib/date.js';
import { emitPetReaction } from '../lib/pets.js';

export function TaskCard({
  task,
  theme,
  settings,
  hero = false,
  listName,
  onComplete,
  onUncomplete,
  onOpen,
  drag, // long-press handler from the reorderable list
  isActive = false,
  dragHandlers,
}) {
  const { actions } = useStore();
  const isNew = Date.now() - new Date(task.createdAt).getTime() < 4000;

  const progress = useRef(new Animated.Value(0)).current; // ring fill 0..1
  const cardOpacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const cardScale = useRef(new Animated.Value(isNew ? 0.95 : 1)).current;
  const cardTranslateY = useRef(new Animated.Value(isNew ? 20 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState(null);
  const [petAnimation, setPetAnimation] = useState(null); // 'add' | 'complete' | null

  const ink = settings?.inkStrike;
  const anim = settings?.animations !== false; // master animation switch
  const sans = settings?.sansTitles;
  const done = task.isCompleted;

  // Mount effect to show 'add' pet animation and premium entry slide
  useEffect(() => {
    const diff = Date.now() - new Date(task.createdAt).getTime();
    const isFresh = diff > 0 && diff < 4000;

    // Animations disabled — snap the card straight to its resting state.
    if (!anim) {
      cardOpacity.setValue(1);
      cardScale.setValue(1);
      cardTranslateY.setValue(0);
      return undefined;
    }

    if (isFresh) {
      // 1. Slow, smooth entry — a gentle rise + fade that's noticeable
      //    and feels premium (easeOutCubic over ~620ms).
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          stiffness: 60,
          damping: 15,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          stiffness: 60,
          damping: 15,
          mass: 1,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Play pet add gesture (lingers a touch longer)
      setPetAnimation('add');
      const timer = setTimeout(() => setPetAnimation(null), 1800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  // Animate border glow and pulse card scale on pet animation
  useEffect(() => {
    if (petAnimation) {
      // Glow overlay opacity: gentle fade in, hold, soft fade out
      Animated.sequence([
        Animated.timing(borderAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(borderAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(borderAnim, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();

      // Mild card scale pulse - only for completion to avoid conflict with entrance spring!
      if (petAnimation === 'complete') {
        Animated.sequence([
          Animated.spring(cardScale, {
            toValue: 1.025,
            stiffness: 120,
            damping: 10,
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1.0,
            stiffness: 120,
            damping: 10,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      borderAnim.setValue(0);
    }
  }, [petAnimation]);

  const complete = () => {
    if (phase) return;
    completionFeedback(settings); // haptic always respects the haptics setting

    // Animations disabled — complete instantly with no motion.
    if (!anim) {
      setPhase('completing');
      onComplete && onComplete(task);
      return;
    }

    emitPetReaction('complete');

    // Play complete pet animation inside the card
    setPetAnimation('complete');
    setPhase('completing');

    // 1. Fill the checkbox ring with a slow, satisfying spring overshoot.
    Animated.timing(progress, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.back(1.6)), // springy overshoot ease
      useNativeDriver: false,
    }).start();

    // 2. After a longer hold so the celebration is noticeable, smoothly
    //    fade, scale down, and float the card away.
    setTimeout(() => {
      if (!ink) {
        onComplete && onComplete(task);
        return;
      }

      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 620,
          easing: Easing.bezier(0.25, 1, 0.5, 1), // easeOutQuart
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.92,
          duration: 620,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: -28, // float up and away gracefully
          duration: 620,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete && onComplete(task);
      });
    }, 1050); // longer hold lets the user register the satisfying feedback
  };

  const s = useMemo(() => makeStyles(theme), [theme]);

  // ---- done variant (static completed card shown in logs/lists) ----
  if (done) {
    return (
      <View style={[s.card, s.cardDone]}>
        <Pressable
          onPress={() => onUncomplete && onUncomplete(task)}
          hitSlop={8}
          style={[s.ring, s.ringFilled]}
        >
          <Icon.tick size={hero ? 16 : 15} color={theme.onAccent} />
        </Pressable>
        <Pressable style={s.body} onPress={() => onOpen && onOpen(task)}>
          <Text
            style={[
              s.title,
              { fontFamily: sans ? FONT.sansMedium : FONT.serifItalic, color: theme.text3 },
            ]}
          >
            {task.title}
          </Text>
          {task.subtasks && task.subtasks.length > 0 && (
            <View style={s.subtaskContainer} pointerEvents="none">
              {task.subtasks.map((st) => (
                <View key={st.id} style={s.subtaskRow}>
                  <View style={[s.subtaskCheck, s.subtaskCheckDone, { borderColor: theme.hairline2, opacity: 0.5 }]}>
                    <Icon.tick size={8} color={theme.onAccent} />
                  </View>
                  <Text
                    style={[
                      s.subtaskTitle,
                      { color: theme.text4, textDecorationLine: 'line-through' },
                    ]}
                  >
                    {st.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={s.metaRow}>
            <Text style={s.meta}>
              {completedLabel(task.completedAt)}
              {listName ? ` · ${listName}` : ''}
              {recurringLabel(task.recurring) ? ` · ${recurringLabel(task.recurring)}` : ''}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // ---- active variant ----
  const meta = [];
  // surface a meaningful priority (Medium is the default — keep it quiet)
  if (task.priority === 'high') meta.push({ t: 'High', color: '#E5544B' });
  else if (task.priority === 'low') meta.push({ t: 'Low', color: theme.text3 });
  if (listName) meta.push({ t: listName });
  if (recurringLabel(task.recurring)) {
    meta.push({ t: recurringLabel(task.recurring), accent: true });
  }
  if (task.dueAt) {
    const over = isOverdue(task.dueAt);
    meta.push({ t: (over ? 'Overdue · ' : '') + fmtDue(task.dueAt), accent: true });
  } else if (task.note) {
    meta.push({ t: task.note });
  }

  const ringBg = progress.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: ['rgba(0,0,0,0)', theme.accent, theme.accent],
    extrapolate: 'clamp',
  });
  const ringBorder = progress.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [theme.text4, theme.accent, theme.accent],
    extrapolate: 'clamp',
  });
  const ringScale = progress.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [1, 1.25, 0.92, 1],
    extrapolate: 'clamp',
  });
  const tickOpacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  const tickScale = progress.interpolate({
    inputRange: [0, 0.35, 0.65, 0.85, 1],
    outputRange: [0, 0, 1.45, 0.9, 1],
    extrapolate: 'clamp',
  });
  const titleColor = progress.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [theme.text, theme.text3, theme.text3],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        s.card,
        hero && s.cardHero,
        isActive && s.cardActive,
        {
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
        },
      ]}
    >
      {/* Animated border glow overlay */}
      {petAnimation && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: theme.radius,
            borderWidth: 2,
            borderColor: theme.accent,
            opacity: borderAnim,
            pointerEvents: 'none',
          }}
        />
      )}

      <Pressable onPress={complete} hitSlop={8} style={s.ringWrap}>
        <Animated.View
          style={[
            s.ring,
            hero && s.ringHero,
            {
              backgroundColor: ringBg,
              borderColor: ringBorder,
              transform: [{ scale: ringScale }],
            },
          ]}
        >
          <Animated.View style={{ opacity: tickOpacity, transform: [{ scale: tickScale }] }}>
            <Icon.tick size={hero ? 16 : 15} color={theme.onAccent} />
          </Animated.View>
        </Animated.View>
      </Pressable>

      <Pressable
        style={s.body}
        onPress={() => !phase && onOpen && onOpen(task)}
        onLongPress={drag}
        delayLongPress={180}
      >
        <Animated.Text
          style={[
            s.title,
            hero && s.titleHero,
            { fontFamily: sans ? FONT.sansMedium : FONT.serif, color: titleColor },
          ]}
        >
          {task.title}
        </Animated.Text>
        {task.subtasks && task.subtasks.length > 0 && (
          <View style={s.subtaskContainer} pointerEvents="box-none">
            {task.subtasks.map((st) => (
              <Pressable
                key={st.id}
                style={s.subtaskRow}
                onPress={() => {
                  selectionFeedback(settings);
                  actions.toggleSubtask(task.id, st.id, !st.done);
                }}
              >
                <View style={[s.subtaskCheck, st.done && s.subtaskCheckDone, { borderColor: theme.hairline2 }]}>
                  {st.done && <Icon.tick size={8} color={theme.onAccent} />}
                </View>
                <Text
                  style={[
                    s.subtaskTitle,
                    { color: st.done ? theme.text3 : theme.text2 },
                    st.done && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {st.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {meta.length > 0 && (
          <View style={s.metaRow}>
            {meta.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={s.dot} />}
                <Text style={[s.meta, m.accent && { color: theme.accent }, m.color && { color: m.color }]}>{m.t}</Text>
              </React.Fragment>
            ))}
          </View>
        )}
      </Pressable>

      {dragHandlers ? (
        <View {...dragHandlers} style={s.handle}>
          <Icon.grip color={theme.text4} />
        </View>
      ) : drag ? (
        <Pressable onLongPress={drag} delayLongPress={180} hitSlop={8} style={s.handle}>
          <Icon.grip color={theme.text4} />
        </Pressable>
      ) : null}

      {petAnimation && (
        <View style={[s.cardPetWrap, { right: drag ? 38 : 16 }]}>
          <Animated.View style={{ transform: [{ scale: borderAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1.15, 1.15, 0] }) }] }}>
            <Pet petId={settings.pet || 'zen'} theme={theme} size={56} mood={petAnimation} />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: t.radius,
      paddingVertical: 19,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 13,
      shadowColor: '#000',
      shadowOpacity: t.mode === 'light' ? 0.12 : 0.4,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    cardHero: { paddingVertical: 26, paddingHorizontal: 24, borderRadius: t.radius + 4 },
    cardActive: {
      shadowOpacity: 0.55,
      shadowRadius: 30,
      elevation: 12,
      transform: [{ scale: 1.03 }],
    },
    cardDone: {
      backgroundColor: 'transparent',
      shadowOpacity: 0,
      elevation: 0,
      paddingVertical: 14,
      marginBottom: 0,
    },
    ringWrap: { marginTop: 3 },
    ring: {
      width: 27,
      height: 27,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringHero: { width: 30, height: 30, borderRadius: 15 },
    ringFilled: { backgroundColor: t.accent, borderColor: t.accent, borderWidth: 1.5, marginTop: 3 },
    body: { flex: 1, minWidth: 0 },
    title: {
      fontSize: 19,
      lineHeight: 25,
      letterSpacing: -0.1,
      color: t.text,
      flexShrink: 1,
    },
    titleHero: { fontSize: 27, lineHeight: 34 },
    metaRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
    meta: { fontSize: 12.5, fontFamily: FONT.sansMedium, color: t.text3 },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.text4 },
    handle: { paddingLeft: 6, paddingTop: 4, alignSelf: 'center' },
    cardPetWrap: {
      position: 'absolute',
      top: '50%',
      marginTop: -28,
      zIndex: 10,
    },
    subtaskContainer: {
      marginTop: 10,
      gap: 7,
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 3,
    },
    subtaskCheck: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtaskCheckDone: {
      backgroundColor: t.accent,
      borderColor: t.accent,
    },
    subtaskTitle: {
      fontFamily: FONT.sansMedium,
      fontSize: 13.5,
      flexShrink: 1,
    },
  });
}
