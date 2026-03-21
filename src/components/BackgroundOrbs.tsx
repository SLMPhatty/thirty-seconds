import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BREATH_DURATION = 4000;

export function BackgroundOrbs() {
  // Single driver: 0 → 1 → 0 continuously
  // Using reverse:true so the easing curve is mirrored seamlessly
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse — smoothly goes 0→1→0 with no skip
    );
  }, []);

  // Orb 1 — top left, large purple
  const orb1Style = useAnimatedStyle(() => {
    const scale = interpolate(breath.value, [0, 1], [0.9, 1.15]);
    const opacity = interpolate(breath.value, [0, 1], [0.25, 0.55]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Orb 2 — bottom right, warm
  const orb2Style = useAnimatedStyle(() => {
    const scale = interpolate(breath.value, [0, 1], [0.95, 1.1]);
    const opacity = interpolate(breath.value, [0, 1], [0.2, 0.45]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Orb 3 — center, purple
  const orb3Style = useAnimatedStyle(() => {
    const scale = interpolate(breath.value, [0, 1], [0.85, 1.2]);
    const opacity = interpolate(breath.value, [0, 1], [0.2, 0.5]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Radial purple fade from top
  const radialStyle = useAnimatedStyle(() => {
    const opacity = interpolate(breath.value, [0, 1], [0.1, 0.24]);
    return { opacity };
  });

  // Screen brightness pulse
  const screenPulseStyle = useAnimatedStyle(() => {
    const opacity = interpolate(breath.value, [0, 1], [0, 0.025]);
    return { opacity };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.radialFade, radialStyle]} />
      <View style={styles.warmGlow} />
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
      <Animated.View style={[styles.orb, styles.orb3, orb3Style]} />
      <Animated.View style={[styles.screenPulse, screenPulseStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  radialFade: {
    position: 'absolute',
    top: -SCREEN_H * 0.2,
    left: -SCREEN_W * 0.3,
    width: SCREEN_W * 1.6,
    height: SCREEN_H * 0.6,
    borderRadius: 999,
    backgroundColor: 'rgba(165, 148, 249, 0.16)',
  },
  warmGlow: {
    position: 'absolute',
    top: SCREEN_H * 0.1,
    right: -SCREEN_W * 0.1,
    width: SCREEN_W * 0.5,
    height: SCREEN_H * 0.3,
    borderRadius: 999,
    backgroundColor: 'rgba(240, 200, 150, 0.08)',
  },
  screenPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  orb1: {
    width: 500,
    height: 500,
    backgroundColor: 'rgba(165, 148, 249, 0.15)',
    top: -SCREEN_H * 0.1,
    left: -SCREEN_W * 0.1,
  },
  orb2: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(249, 191, 148, 0.1)',
    bottom: -SCREEN_H * 0.1,
    right: -SCREEN_W * 0.1,
  },
  orb3: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(165, 148, 249, 0.15)',
    top: SCREEN_H * 0.35,
    left: SCREEN_W * 0.2,
  },
});
