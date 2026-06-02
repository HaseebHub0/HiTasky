import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#E58A4B', '#E0A24A', '#C25A4E', '#7E8C5A', '#5A7E8C', '#9A6A8C'];
const SHAPES = ['square', 'circle', 'triangle'];

function ConfettiParticle({ index, active, onAnimationEnd }) {
  const progress = useSharedValue(0);
  const sway = useSharedValue(0);
  const rotation = useSharedValue(0);

  const color = COLORS[index % COLORS.length];
  const shape = SHAPES[index % SHAPES.length];
  const size = Math.random() * 8 + 6; // 6 to 14 px
  
  // Random start and end positions
  const startX = Math.random() * SCREEN_WIDTH;
  const endX = startX + (Math.random() * 100 - 50); // sway -50 to 50
  
  // Random delays and speeds
  const delay = Math.random() * 800; // up to 0.8s
  const duration = Math.random() * 1500 + 1500; // 1.5s to 3s

  useEffect(() => {
    if (active) {
      progress.value = 0;
      sway.value = 0;
      rotation.value = 0;

      // Animate progress (Y fall)
      progress.value = withDelay(
        delay,
        withTiming(1, { duration }, (isFinished) => {
          if (isFinished && index === 0 && onAnimationEnd) {
            runOnJS(onAnimationEnd)();
          }
        })
      );

      // Animate sway
      sway.value = withDelay(
        delay,
        withTiming(1, { duration })
      );

      // Animate rotation
      rotation.value = withDelay(
        delay,
        withTiming(1, { duration })
      );
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = -20 + progress.value * (SCREEN_HEIGHT + 40);
    const translateX = startX + (endX - startX) * sway.value;
    const rotate = `${rotation.value * (Math.random() * 360 + 360)}deg`;
    const opacity = progress.value > 0.85 ? 1 - (progress.value - 0.85) / 0.15 : 1;

    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: size,
      height: size,
      backgroundColor: shape === 'triangle' ? 'transparent' : color,
      borderRadius: shape === 'circle' ? size / 2 : 0,
      transform: [
        { translateX },
        { translateY },
        { rotate },
      ],
      opacity,
      // If it is a triangle, draw a CSS triangle
      borderLeftWidth: shape === 'triangle' ? size / 2 : 0,
      borderRightWidth: shape === 'triangle' ? size / 2 : 0,
      borderBottomWidth: shape === 'triangle' ? size : 0,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: color,
    };
  });

  return <Animated.View style={animatedStyle} pointerEvents="none" />;
}

export function Confetti({ trigger, onComplete }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setActive(true);
    }
  }, [trigger]);

  const handleAnimationEnd = () => {
    setActive(false);
    if (onComplete) {
      onComplete();
    }
  };

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 60 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          index={i}
          active={active}
          onAnimationEnd={handleAnimationEnd}
        />
      ))}
    </View>
  );
}
