// ============================================================
// Custom illustrations — hand-drawn SVG scenes in the HiTasky
// "quiet luxury / editorial" voice. Two-tone: one ember accent
// over warm hairlines. Used in empty states instead of the logo.
//
// Each scene fades + rises on mount and then breathes with a
// slow float — the signature micro-interaction.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G, Ellipse } from 'react-native-svg';

/* ---- individual scenes (drawn on a 140×140 canvas) ---- */

function CalmScene({ accent, soft, faint, ink }) {
  // A serene horizon: a low sun, gentle hills, a single resting bird-stroke.
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
      {/* halo */}
      <Circle cx={70} cy={62} r={48} fill={soft} opacity={0.5} />
      {/* sun */}
      <Circle cx={70} cy={60} r={22} stroke={accent} strokeWidth={2.4} fill="none" />
      <Circle cx={70} cy={60} r={6} fill={accent} opacity={0.85} />
      {/* sun rays */}
      <Path
        d="M70 26v-9M70 103v9M104 60h9M27 60h-9M94 36l6-6M40 84l-6 6M94 84l6 6M40 36l-6-6"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.55}
      />
      {/* horizon */}
      <Line x1={16} y1={104} x2={124} y2={104} stroke={faint} strokeWidth={2.2} strokeLinecap="round" />
      {/* hill */}
      <Path d="M30 104c10-16 26-18 40-8 12 8 28 6 40-6" stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
      {/* a calm bird */}
      <Path d="M92 30c3-3 6-3 8 0M100 30c2-3 5-3 7 0" stroke={ink} strokeWidth={1.8} strokeLinecap="round" opacity={0.45} />
    </Svg>
  );
}

function JournalScene({ accent, soft, faint, ink }) {
  // An open book with a soft spark above — for the Journal/Done view.
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
      <Ellipse cx={70} cy={118} rx={46} ry={7} fill={soft} opacity={0.5} />
      {/* left page */}
      <Path d="M70 44C58 36 44 34 30 38v54c14-4 28-2 40 6V44Z" fill={soft} stroke={accent} strokeWidth={2.2} strokeLinejoin="round" />
      {/* right page */}
      <Path d="M70 44c12-8 26-10 40-6v54c-14-4-28-2-40 6V44Z" fill="none" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" opacity={0.55} />
      {/* spine */}
      <Line x1={70} y1={44} x2={70} y2={104} stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
      {/* ruled lines */}
      <Path d="M40 52c8-2 16-1 22 3M40 64c8-2 16-1 22 3M40 76c8-2 16-1 22 3" stroke={accent} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
      <Path d="M100 52c-8-2-16-1-22 3M100 64c-8-2-16-1-22 3M100 76c-8-2-16-1-22 3" stroke={ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.3} />
      {/* spark */}
      <Path d="M70 14v12M64 20h12M104 26l0 8M100 30h8" stroke={accent} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}

function PageScene({ accent, soft, faint, ink }) {
  // A fresh ruled sheet with a fountain-pen nib resting on it.
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
      <Ellipse cx={70} cy={120} rx={42} ry={6} fill={soft} opacity={0.5} />
      {/* sheet */}
      <Rect x={38} y={24} width={64} height={84} rx={10} fill={soft} stroke={accent} strokeWidth={2.2} />
      {/* ruled lines */}
      <Path d="M50 44h40M50 56h40M50 68h28" stroke={ink} strokeWidth={1.8} strokeLinecap="round" opacity={0.35} />
      {/* first line drawn in ember */}
      <Path d="M50 80h22" stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
      {/* nib */}
      <G>
        <Path d="M86 92l16 16" stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        <Path d="M96 82l14 14-6 6-14-14 2-4 4-2Z" fill={soft} stroke={accent} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M99 88l5 5" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function DoneAllScene({ accent, soft, faint, ink }) {
  // A satisfied check inside a ring with a couple of confetti ticks.
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
      <Circle cx={70} cy={70} r={46} fill={soft} opacity={0.5} />
      <Circle cx={70} cy={70} r={34} stroke={accent} strokeWidth={2.6} fill="none" />
      <Path d="M55 71l10 10 22-24" stroke={accent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M30 36l4 4M110 36l-4 4M26 92l5 1M114 92l-5 1" stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    </Svg>
  );
}

const SCENES = {
  calm: CalmScene,
  journal: JournalScene,
  page: PageScene,
  done: DoneAllScene,
};

/**
 * Animated empty-state illustration.
 * @param {string} name  one of: calm | journal | page | done
 */
export function Illustration({ name = 'calm', theme }) {
  const Scene = SCENES[name] || CalmScene;

  const enter = useRef(new Animated.Value(0)).current; // 0 → 1 fade/rise
  const float = useRef(new Animated.Value(0)).current; // gentle breathing

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 620,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [name]);

  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] });

  const accent = theme.accent;
  const soft = theme.accentSoft;
  const faint = theme.hairline2;
  const ink = theme.text3;

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: Animated.add(enterY, floatY) }],
      }}
    >
      <View>
        <Scene accent={accent} soft={soft} faint={faint} ink={ink} />
      </View>
    </Animated.View>
  );
}
