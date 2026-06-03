// ============================================================
// Pet — HiTasky's signature animated companion.
//
// One component renders all five species (fox · owl · bunny · wolf
// · frog) as hand-built SVG, tinted by the active theme accent. Each
// pet has its own resting motion (idle float / blink cadence) and a
// distinct reaction to every life event:
//
//   add      → quick "I see it" gesture
//   complete → a celebration in its own personality
//   rest     → the settled pose for empty states
//
// Body motion runs on the native driver (Animated.View transforms).
// Blinks toggle SVG shapes on a timer. A little emote pops above the
// head on reactions. Pass `reactive` to subscribe to the global pet
// reaction bus; otherwise drive it with the `mood` prop.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G, Line } from 'react-native-svg';
import { getPet, onPetReaction } from '../lib/pets.js';

/* ---------------- eyes (shared) ---------------- */
function Eyes({ lx, rx, cy, r = 4.2, closed, ink, accent }) {
  if (closed) {
    return (
      <G stroke={ink} strokeWidth={3} strokeLinecap="round">
        <Path d={`M${lx - 5} ${cy} q5 4 10 0`} />
        <Path d={`M${rx - 5} ${cy} q5 4 10 0`} />
      </G>
    );
  }
  return (
    <G fill={ink}>
      <Circle cx={lx} cy={cy} r={r} />
      <Circle cx={rx} cy={cy} r={r} />
      <Circle cx={lx + 1.4} cy={cy - 1.4} r={r * 0.32} fill="#fff" opacity={0.9} />
      <Circle cx={rx + 1.4} cy={cy - 1.4} r={r * 0.32} fill="#fff" opacity={0.9} />
    </G>
  );
}

/* ---------------- species art (120×120 box) ---------------- */
function FoxArt({ accent, soft, ink, closed }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      {/* ears */}
      <Path d="M30 40 L37 12 L56 38 Z" fill={accent} />
      <Path d="M90 40 L83 12 L64 38 Z" fill={accent} />
      <Path d="M36 35 L39 20 L48 35 Z" fill={soft} />
      <Path d="M84 35 L81 20 L72 35 Z" fill={soft} />
      {/* head */}
      <Circle cx={60} cy={62} r={34} fill={accent} />
      {/* cheeks / muzzle */}
      <Path d="M60 96 C44 96 34 84 36 70 C44 78 76 78 84 70 C86 84 76 96 60 96 Z" fill={soft} />
      <Eyes lx={49} rx={71} cy={60} closed={closed} ink={ink} accent={accent} />
      {/* nose */}
      <Path d="M60 78 l-5 -6 h10 Z" fill={ink} />
      <Path d="M60 78 v6" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function OwlArt({ accent, soft, ink, closed }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      {/* ear tufts */}
      <Path d="M34 34 L30 16 L48 30 Z" fill={accent} />
      <Path d="M86 34 L90 16 L72 30 Z" fill={accent} />
      {/* body / head */}
      <Rect x={26} y={30} width={68} height={66} rx={30} fill={accent} />
      {/* belly */}
      <Path d="M60 96 C42 96 34 80 38 60 C46 70 74 70 82 60 C86 80 78 96 60 96 Z" fill={soft} />
      {/* eye discs */}
      <Circle cx={47} cy={58} r={15} fill={soft} />
      <Circle cx={73} cy={58} r={15} fill={soft} />
      <Eyes lx={47} rx={73} cy={58} r={6} closed={closed} ink={ink} accent={accent} />
      {/* beak */}
      <Path d="M60 64 l-6 8 h12 Z" fill={ink} />
    </Svg>
  );
}

function BunnyArt({ accent, soft, ink, closed }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      {/* ears */}
      <Rect x={44} y={6} width={13} height={50} rx={6.5} fill={accent} transform="rotate(-8 50 30)" />
      <Rect x={63} y={6} width={13} height={50} rx={6.5} fill={accent} transform="rotate(8 70 30)" />
      <Rect x={47} y={12} width={6} height={36} rx={3} fill={soft} transform="rotate(-8 50 30)" />
      <Rect x={66} y={12} width={6} height={36} rx={3} fill={soft} transform="rotate(8 70 30)" />
      {/* head */}
      <Circle cx={60} cy={70} r={32} fill={accent} />
      {/* cheeks */}
      <Circle cx={44} cy={78} r={9} fill={soft} />
      <Circle cx={76} cy={78} r={9} fill={soft} />
      <Eyes lx={49} rx={71} cy={66} closed={closed} ink={ink} accent={accent} />
      {/* nose + mouth */}
      <Path d="M60 78 l-4 -4 h8 Z" fill={ink} />
      <Path d="M60 78 v4 M60 82 q-5 4 -9 1 M60 82 q5 4 9 1" stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function WolfArt({ accent, soft, ink, closed }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      {/* ears (upright, sharp) */}
      <Path d="M30 44 L34 14 L54 40 Z" fill={accent} />
      <Path d="M90 44 L86 14 L66 40 Z" fill={accent} />
      <Path d="M37 36 L39 22 L48 36 Z" fill={soft} />
      <Path d="M83 36 L81 22 L72 36 Z" fill={soft} />
      {/* head */}
      <Path d="M26 58 C26 40 42 30 60 30 C78 30 94 40 94 58 C94 74 82 86 60 94 C38 86 26 74 26 58 Z" fill={accent} />
      {/* muzzle */}
      <Path d="M60 94 C50 90 44 80 46 70 C52 76 68 76 74 70 C76 80 70 90 60 94 Z" fill={soft} />
      <Eyes lx={49} rx={71} cy={58} closed={closed} ink={ink} accent={accent} />
      {/* nose */}
      <Path d="M60 76 l-5 -5 h10 Z" fill={ink} />
      <Path d="M60 76 v7" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function FrogArt({ accent, soft, ink, closed }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      {/* eye bumps */}
      <Circle cx={42} cy={40} r={16} fill={accent} />
      <Circle cx={78} cy={40} r={16} fill={accent} />
      <Circle cx={42} cy={40} r={9} fill={soft} />
      <Circle cx={78} cy={40} r={9} fill={soft} />
      <Eyes lx={42} rx={78} cy={40} r={4.6} closed={closed} ink={ink} accent={accent} />
      {/* head */}
      <Ellipse cx={60} cy={68} rx={40} ry={30} fill={accent} />
      {/* belly */}
      <Ellipse cx={60} cy={82} rx={26} ry={14} fill={soft} />
      {/* smile */}
      <Path d="M40 70 q20 18 40 0" stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <Circle cx={36} cy={72} r={5} fill={soft} opacity={0.8} />
      <Circle cx={84} cy={72} r={5} fill={soft} opacity={0.8} />
    </Svg>
  );
}

const ART = { fox: FoxArt, owl: OwlArt, bunny: BunnyArt, wolf: WolfArt, frog: FrogArt };

/* ---------------- the animated companion ---------------- */
export function Pet({ petId, theme, size = 96, mood, reactive = false, idle = true, still = false }) {
  const pet = getPet(petId);
  const Art = ART[pet.species] || FoxArt;

  const float = useRef(new Animated.Value(0)).current; // idle breathing
  const pop = useRef(new Animated.Value(1)).current; // reaction scale
  const hop = useRef(new Animated.Value(0)).current; // reaction translateY
  const rot = useRef(new Animated.Value(0)).current; // reaction rotate (-1..1)
  const emoteV = useRef(new Animated.Value(0)).current; // emote pop
  const [closed, setClosed] = useState(false);
  const [emote, setEmote] = useState('');
  const restPose = mood === 'rest';

  /* ---- idle float + blink ---- */
  useEffect(() => {
    if (!idle || still) return undefined;
    const cfg = {
      gentle: 2600, slow: 3600, bob: 1700, min: 4200, breathe: 3200, sway: 3000,
    }[pet.anim.float] || 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: cfg, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: cfg, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pet.anim.float, idle, still]);

  // blink — sleeping pets (rest+owl/sleep) stay closed
  useEffect(() => {
    if (still) {
      setClosed(false);
      return undefined;
    }
    if (restPose && pet.anim.rest.type === 'sleep') {
      setClosed(true);
      return undefined;
    }
    setClosed(false);
    let alive = true;
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        if (!alive) return;
        setClosed(true);
        setTimeout(() => alive && setClosed(false), 150);
        schedule();
      }, pet.anim.blink + Math.random() * 1400);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [pet.anim.blink, restPose, pet.anim.rest.type, still]);

  /* ---- reactions ---- */
  const play = (kind) => {
    const spec = pet.anim[kind];
    if (!spec) return;
    if (spec.emote) {
      setEmote(spec.emote);
      emoteV.setValue(0);
      Animated.sequence([
        Animated.spring(emoteV, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }),
        Animated.delay(520),
        Animated.timing(emoteV, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
    runMotion(spec.type, { pop, hop, rot });
  };

  // drive reaction from explicit mood prop (one-shot when it changes)
  useEffect(() => {
    if (mood === 'add' || mood === 'complete') play(mood);
    else if (mood === 'rest') play('rest');
  }, [mood]);

  // subscribe to the global bus
  useEffect(() => {
    if (!reactive) return undefined;
    return onPetReaction((m) => play(m));
  }, [reactive, pet.id]);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });
  const floatS = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.025, 1] });
  const spin = rot.interpolate({ inputRange: [-1, 1], outputRange: ['-16deg', '16deg'] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* emote */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -size * 0.16,
          opacity: emoteV,
          transform: [
            { translateY: emoteV.interpolate({ inputRange: [0, 1], outputRange: [6, -size * 0.18] }) },
            { scale: emoteV.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          ],
          zIndex: 5,
        }}
      >
        <Text style={{ fontSize: size * 0.3 }}>{emote}</Text>
      </Animated.View>

      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            { translateY: Animated.add(floatY, hop) },
            { scale: Animated.multiply(floatS, pop) },
            { rotate: spin },
          ],
        }}
      >
        <Art accent={theme.accent} soft={theme.accentSoft} ink={theme.text} closed={closed} />
      </Animated.View>
    </View>
  );
}

/* ---------------- motion primitives ---------------- */
function runMotion(type, { pop, hop, rot }) {
  const spring = (v, to, friction = 5, tension = 140) =>
    Animated.spring(v, { toValue: to, useNativeDriver: true, friction, tension });

  switch (type) {
    case 'pop': // fox add — quick squash-stretch
      Animated.sequence([spring(pop, 1.16, 4, 200), spring(pop, 1, 5, 140)]).start();
      Animated.sequence([spring(rot, 0.5, 4), spring(rot, 0, 5)]).start();
      break;
    case 'jump': // fox complete — leap + spin-lite
      Animated.sequence([
        Animated.timing(hop, { toValue: -size(0.34), duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(hop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
      ]).start();
      Animated.sequence([spring(pop, 1.1), spring(pop, 1)]).start();
      Animated.sequence([spring(rot, 0.7, 5), spring(rot, -0.4, 5), spring(rot, 0, 5)]).start();
      break;
    case 'tilt': // owl add — head tilt to think
      Animated.sequence([spring(rot, 0.7, 4), Animated.delay(180), spring(rot, 0, 4)]).start();
      break;
    case 'nod': // owl/zen complete/add — a knowing nod
      Animated.sequence([
        spring(hop, 6, 5, 200), spring(hop, -3, 5), spring(hop, 0, 6),
      ]).start();
      break;
    case 'wiggle': // bunny add — ear wiggle (fast rotate jitter)
      Animated.sequence([
        spring(rot, 0.5, 3, 300), spring(rot, -0.5, 3, 300), spring(rot, 0.3, 3, 300), spring(rot, 0, 5),
      ]).start();
      break;
    case 'hop': // bunny complete — full hop + squash
      Animated.sequence([
        Animated.timing(pop, { toValue: 0.9, duration: 90, useNativeDriver: true }),
        Animated.timing(hop, { toValue: -size(0.4), duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(hop, { toValue: 0, friction: 3.5, tension: 130, useNativeDriver: true }),
      ]).start();
      Animated.sequence([Animated.delay(120), spring(pop, 1.08), spring(pop, 1)]).start();
      break;
    case 'shake': // wolf add — minimal alert shiver
      Animated.sequence([
        spring(rot, 0.22, 3, 400), spring(rot, -0.22, 3, 400), spring(rot, 0.12, 3, 400), spring(rot, 0, 6),
      ]).start();
      break;
    case 'puff': // wolf complete — chest puff of pride
      Animated.sequence([spring(pop, 1.14, 4, 120), Animated.delay(140), spring(pop, 1, 6)]).start();
      Animated.sequence([spring(hop, -4, 5), spring(hop, 0, 6)]).start();
      break;
    case 'pulse': // frog complete — calm breath pulse
      Animated.sequence([spring(pop, 1.12, 6, 90), spring(pop, 1, 7, 70)]).start();
      break;
    case 'sway': // fox rest
      Animated.sequence([spring(rot, 0.35, 5), spring(rot, -0.2, 5), spring(rot, 0, 6)]).start();
      break;
    case 'nibble': // bunny rest
      Animated.sequence([spring(pop, 1.04, 6), spring(pop, 1, 7)]).start();
      break;
    default:
      break;
  }
}

// hop amount relative to a nominal 96px pet (kept simple — px values)
function size(frac) {
  return 96 * frac;
}
