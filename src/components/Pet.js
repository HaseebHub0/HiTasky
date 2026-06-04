// ============================================================
// Pet — HiTasky's signature animated companion.
//
// Renders each species as its emoji (🐸 🦊 🦉 🐰 🐺 🐱 🐼 🐧) so the
// in-app companions match the marketing artwork exactly. The motion
// personality is preserved: each pet has its own resting float and a
// distinct reaction to every life event:
//
//   add      → quick "I see it" gesture
//   complete → a celebration in its own personality
//   rest     → the settled pose for empty states
//
// Body motion runs on the native driver (Animated.View transforms).
// A little emote pops above the head on reactions. Pass `reactive` to
// subscribe to the global pet reaction bus; otherwise drive it with the
// `mood` prop.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View, Pressable } from 'react-native';
import { getPet, onPetReaction } from '../lib/pets.js';

/* ---------------- the animated companion ---------------- */
export function Pet({ petId, theme, size = 96, mood, reactive = false, idle = true, still = false }) {
  const pet = getPet(petId);
  const emoji = pet.emoji || '🐸';

  const float = useRef(new Animated.Value(0)).current; // idle breathing
  const pop = useRef(new Animated.Value(1)).current; // reaction scale
  const hop = useRef(new Animated.Value(0)).current; // reaction translateY
  const rot = useRef(new Animated.Value(0)).current; // reaction rotate (-1..1)
  const emoteV = useRef(new Animated.Value(0)).current; // emote pop
  const [emote, setEmote] = useState('');

  /* ---- idle float ---- */
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
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { translateY: Animated.add(floatY, hop) },
            { scale: Animated.multiply(floatS, pop) },
            { rotate: spin },
          ],
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontSize: size * 0.78,
            lineHeight: size * 0.98,
            textAlign: 'center',
            ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
          }}
        >
          {emoji}
        </Text>
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

export function HeaderPet({ petId, theme, onPress }) {
  const [mood, setMood] = useState('idle');
  const timeoutRef = useRef(null);

  const triggerReaction = () => {
    const moods = ['add', 'complete', 'rest'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    setMood(randomMood);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setMood('idle');
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Pressable
      onPress={() => { triggerReaction(); onPress(); }}
      style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}
      hitSlop={8}
    >
      <Pet petId={petId} theme={theme} size={38} mood={mood} reactive={false} still={false} />
    </Pressable>
  );
}
