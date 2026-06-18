// ============================================================
// FocusTimer — Pomodoro with soul.
//
// Features:
//   • 4-session cycle: Work → Short Break → ... → Long Break
//   • Pet companion meditating inside the ring
//   • Motivational quotes that rotate each session
//   • Custom duration picker (15 / 25 / 30 / 45 / 60 min)
//   • Daily focus stats persisted in AsyncStorage
//   • Optional "Focus on [task]" link to the top task
//   • Background-safe countdown via AppState + timestamps
// ============================================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Modal, Pressable, AppState, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { FONT } from '../theme.js';
import { Icon } from './icons.js';
import { Pet } from './Pet.js';
import { Confetti } from './Confetti.js';

// ---- quotes that feel hand-picked, not AI-generated ----
const QUOTES = [
  { text: 'Deep work is rare, and therefore valuable.', author: 'Cal Newport' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'Small daily improvements lead to stunning results.', author: 'Robin Sharma' },
  { text: "You don't need more time. You need fewer distractions.", author: '' },
  { text: 'Progress, not perfection.', author: '' },
  { text: 'One thing at a time. Most important thing first.', author: '' },
  { text: "If it's your job, don't quit until it's done.", author: '' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: '' },
  { text: 'Discipline is choosing what you want most over what you want now.', author: '' },
  { text: "Don't count the days. Make the days count.", author: 'Muhammad Ali' },
];

const DURATION_OPTIONS = [15, 25, 30, 45, 60];
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const SESSIONS_BEFORE_LONG = 4;
const STATS_KEY = 'hitasky.focus.stats';

function pickQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

async function loadStats() {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.date === today) return parsed;
    }
  } catch (_) { /* ignore */ }
  return { date: new Date().toISOString().slice(0, 10), sessions: 0, minutes: 0 };
}

async function saveStats(stats) {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (_) { /* ignore */ }
}

export function FocusTimer({ open, onClose, theme, petId }) {
  // ---- state ----
  const [mode, setMode] = useState('focus');          // 'focus' | 'break'
  const [workDuration, setWorkDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // completed work sessions
  const [quote, setQuote] = useState(pickQuote);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [stats, setStats] = useState({ date: '', sessions: 0, minutes: 0 });
  const [petMood, setPetMood] = useState('idle');

  const backgroundTimeRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // ---- load daily stats on open ----
  useEffect(() => {
    if (open) {
      loadStats().then(setStats);
      setMode('focus');
      setTimeLeft(workDuration * 60);
      setIsRunning(false);
      setConfetti(false);
      setQuote(pickQuote());
      setPetMood('idle');
    }
  }, [open]);

  // ---- gentle pulse while running ----
  useEffect(() => {
    if (isRunning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isRunning]);

  // ---- background tracking ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        if (isRunning) backgroundTimeRef.current = Date.now();
      } else if (next === 'active') {
        if (isRunning && backgroundTimeRef.current) {
          const elapsed = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
          setTimeLeft((p) => Math.max(0, p - elapsed));
          backgroundTimeRef.current = null;
        }
      }
    });
    return () => sub.remove();
  }, [isRunning]);

  // ---- timer countdown ----
  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    } else if (isRunning && timeLeft <= 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // ---- completion handler ----
  const handleTimerComplete = async () => {
    setIsRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (mode === 'focus') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      setConfetti(true);
      setPetMood('complete');

      // Update daily stats
      const updated = {
        date: new Date().toISOString().slice(0, 10),
        sessions: stats.sessions + 1,
        minutes: stats.minutes + workDuration,
      };
      setStats(updated);
      await saveStats(updated);

      // Auto-suggest break
      setTimeout(() => {
        const isLongBreak = newCount % SESSIONS_BEFORE_LONG === 0;
        setMode('break');
        setTimeLeft(isLongBreak ? LONG_BREAK : SHORT_BREAK);
        setQuote(pickQuote());
        setPetMood('rest');
      }, 2000);
    } else {
      // Break finished — back to focus
      setMode('focus');
      setTimeLeft(workDuration * 60);
      setQuote(pickQuote());
      setPetMood('idle');
    }
  };

  const toggleTimer = () => {
    if (!isRunning) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPetMood('idle');
    }
    setIsRunning(!isRunning);
  };

  const switchMode = () => {
    const next = mode === 'focus' ? 'break' : 'focus';
    setMode(next);
    if (next === 'focus') {
      setTimeLeft(workDuration * 60);
      setPetMood('idle');
    } else {
      const isLong = sessionCount > 0 && sessionCount % SESSIONS_BEFORE_LONG === 0;
      setTimeLeft(isLong ? LONG_BREAK : SHORT_BREAK);
      setPetMood('rest');
    }
    setIsRunning(false);
    setQuote(pickQuote());
  };

  const selectDuration = (mins) => {
    setWorkDuration(mins);
    if (mode === 'focus' && !isRunning) {
      setTimeLeft(mins * 60);
    }
    setShowDurationPicker(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = mode === 'focus' ? workDuration * 60 : (sessionCount > 0 && sessionCount % SESSIONS_BEFORE_LONG === 0 ? LONG_BREAK : SHORT_BREAK);
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;

  // SVG ring
  const radius = 110;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.max(0, progress) * circumference;

  const isLongBreak = mode === 'break' && sessionCount > 0 && sessionCount % SESSIONS_BEFORE_LONG === 0;
  const breakLabel = isLongBreak ? 'Long Break' : 'Short Break';
  const currentSession = Math.min(sessionCount + 1, SESSIONS_BEFORE_LONG);

  const st = useMemo(() => makeStyles(theme), [theme]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.container}>
        {/* Header */}
        <View style={st.header}>
          <Pressable onPress={onClose} style={st.closeBtn}>
            <Icon.chevLeft size={20} color={theme.text2} />
          </Pressable>
          <Text style={st.title}>
            {mode === 'focus' ? 'Focus Session' : breakLabel}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Session dots: ● ● ○ ○ */}
        <View style={st.sessionRow}>
          {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
            <View
              key={i}
              style={[
                st.sessionDot,
                {
                  backgroundColor: i < sessionCount
                    ? theme.accent
                    : (i === sessionCount && mode === 'focus')
                      ? theme.accentSoft
                      : theme.surface2,
                },
              ]}
            />
          ))}
          <Text style={[st.sessionLabel, { color: theme.text3 }]}>
            Session {currentSession} of {SESSIONS_BEFORE_LONG}
          </Text>
        </View>

        {/* Timer ring + pet */}
        <Animated.View
          style={[
            st.timerWrap,
            {
              transform: [{ scale: pulseScale }],
              shadowColor: theme.accent,
              shadowOpacity: isRunning ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }) : 0,
              shadowRadius: isRunning ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 30] }) : 0,
            }
          ]}
        >
          <Svg width={radius * 2 + strokeWidth * 2} height={radius * 2 + strokeWidth * 2}>
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke={theme.surface2}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke={mode === 'focus' ? theme.accent : '#4ade80'}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              rotation="-90"
              origin={`${radius + strokeWidth}, ${radius + strokeWidth}`}
            />
          </Svg>
          <View style={st.timeTextWrap}>
            {/* Pet inside the ring */}
            <Pet
              petId={petId || 'zen'}
              theme={theme}
              size={48}
              mood={petMood}
              reactive={false}
              idle={isRunning}
              still={!isRunning}
            />
            <Pressable onPress={() => !isRunning && setShowDurationPicker(true)}>
              <Text style={st.timeText}>{formatTime(timeLeft)}</Text>
            </Pressable>
            <Text style={st.modeText}>
              {mode === 'focus' ? 'WORK' : 'RELAX'}
            </Text>
          </View>
        </Animated.View>

        {/* Quote */}
        <View style={st.quoteWrap}>
          <Text style={[st.quoteText, { color: theme.text3 }]}>
            "{quote.text}"
          </Text>
          {quote.author ? (
            <Text style={[st.quoteAuthor, { color: theme.text4 }]}>
              — {quote.author}
            </Text>
          ) : null}
        </View>

        {/* Daily stats */}
        {stats.sessions > 0 && (
          <View style={[st.statsRow, { backgroundColor: theme.surface }]}>
            <Text style={[st.statsText, { color: theme.text2 }]}>
              Today: {stats.sessions} session{stats.sessions !== 1 ? 's' : ''} · {stats.minutes} min focused
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={st.controls}>
          <Pressable style={[st.btn, st.btnSecondary, { borderColor: theme.surface2 }]} onPress={switchMode}>
            <Text style={[st.btnSecondaryText, { color: theme.text2 }]}>
              {mode === 'focus' ? 'Break' : 'Focus'}
            </Text>
          </Pressable>
          <Pressable
            style={[st.btn, { backgroundColor: isRunning ? theme.surface2 : theme.accent }]}
            onPress={toggleTimer}
          >
            <Text style={[st.btnText, { color: isRunning ? theme.text : theme.onAccent }]}>
              {isRunning ? 'Pause' : 'Start'}
            </Text>
          </Pressable>
        </View>

        {/* Duration picker modal */}
        <Modal visible={showDurationPicker} transparent animationType="fade" onRequestClose={() => setShowDurationPicker(false)}>
          <Pressable style={st.pickerScrim} onPress={() => setShowDurationPicker(false)}>
            <View style={[st.pickerCard, { backgroundColor: theme.surface }]}>
              <Text style={[st.pickerTitle, { color: theme.text }]}>Focus Duration</Text>
              {DURATION_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  style={[st.pickerOption, m === workDuration && { backgroundColor: theme.accentSoft }]}
                  onPress={() => selectDuration(m)}
                >
                  <Text style={[st.pickerOptionText, { color: m === workDuration ? theme.accent : theme.text2 }]}>
                    {m} minutes
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {confetti && <Confetti trigger={confetti} onComplete={() => setConfetti(false)} />}
      </View>
    </Modal>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
      paddingTop: 56,
      paddingHorizontal: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: t.surface,
    },
    title: {
      fontFamily: FONT.serif,
      fontSize: 20,
      color: t.text,
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    sessionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    sessionLabel: {
      fontFamily: FONT.sansMedium,
      fontSize: 12,
      marginLeft: 8,
    },
    focusTaskWrap: {
      alignItems: 'center',
      marginTop: 16,
      paddingHorizontal: 32,
    },
    focusTaskLabel: {
      fontFamily: FONT.sansMedium,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    focusTaskTitle: {
      fontFamily: FONT.serifMedium || FONT.serif,
      fontSize: 17,
      marginTop: 4,
    },
    timerWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeTextWrap: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      fontFamily: FONT.sansSemi,
      fontSize: 56,
      color: t.text,
      letterSpacing: -2,
      marginTop: 4,
    },
    modeText: {
      fontFamily: FONT.sansMedium,
      fontSize: 13,
      color: t.text3,
      marginTop: 4,
      letterSpacing: 3,
    },
    quoteWrap: {
      alignItems: 'center',
      paddingHorizontal: 30,
      marginBottom: 12,
    },
    quoteText: {
      fontFamily: FONT.serifItalic || FONT.serif,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 21,
    },
    quoteAuthor: {
      fontFamily: FONT.sansMedium,
      fontSize: 11,
      marginTop: 4,
    },
    statsRow: {
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
    },
    statsText: {
      fontFamily: FONT.sansMedium,
      fontSize: 12,
    },
    controls: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 48,
    },
    btn: {
      flex: 1,
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
    },
    btnText: {
      fontFamily: FONT.sansBold,
      fontSize: 16,
    },
    btnSecondaryText: {
      fontFamily: FONT.sansBold,
      fontSize: 16,
    },
    // Duration picker
    pickerScrim: {
      flex: 1,
      backgroundColor: t.scrim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerCard: {
      width: 260,
      borderRadius: 20,
      padding: 20,
    },
    pickerTitle: {
      fontFamily: FONT.serif,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 12,
    },
    pickerOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    pickerOptionText: {
      fontFamily: FONT.sansSemi,
      fontSize: 15,
    },
  });
}
