import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  ReduceMotion,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BREATH_DURATION = 4000;
const PHASE_MS = 300;

function usePhasedBreath(delayMs: number) {
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, {
          duration: BREATH_DURATION,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.Never,
      ),
    );
  }, [breath, delayMs]);

  return breath;
}

export function BackgroundOrbs() {
  const a = usePhasedBreath(0);
  const b = usePhasedBreath(PHASE_MS);
  const c = usePhasedBreath(PHASE_MS * 2);

  const orb1Style = useAnimatedStyle(() => {
    const scale = interpolate(a.value, [0, 1], [0.9, 1.14]);
    const opacity = interpolate(a.value, [0, 1], [0.18, 0.42]);
    return { opacity, transform: [{ scale }] };
  });

  const orb2Style = useAnimatedStyle(() => {
    const scale = interpolate(b.value, [0, 1], [0.95, 1.1]);
    const opacity = interpolate(b.value, [0, 1], [0.16, 0.38]);
    return { opacity, transform: [{ scale }] };
  });

  const orb3Style = useAnimatedStyle(() => {
    const scale = interpolate(c.value, [0, 1], [0.88, 1.16]);
    const opacity = interpolate(c.value, [0, 1], [0.14, 0.36]);
    return { opacity, transform: [{ scale }] };
  });

  const radialStyle = useAnimatedStyle(() => {
    const opacity = interpolate(a.value, [0, 1], [0.06, 0.16]);
    return { opacity };
  });

  const screenPulseStyle = useAnimatedStyle(() => {
    const opacity = interpolate(a.value, [0, 1], [0, 0.018]);
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
    backgroundColor: 'rgba(237, 230, 220, 0.14)',
  },
  warmGlow: {
    position: 'absolute',
    top: SCREEN_H * 0.1,
    right: -SCREEN_W * 0.1,
    width: SCREEN_W * 0.5,
    height: SCREEN_H * 0.3,
    borderRadius: 999,
    backgroundColor: 'rgba(196, 168, 148, 0.1)',
  },
  screenPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EDE6DC',
  },
  orb1: {
    width: 500,
    height: 500,
    backgroundColor: 'rgba(237, 230, 220, 0.12)',
    top: -SCREEN_H * 0.1,
    left: -SCREEN_W * 0.1,
  },
  orb2: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(196, 168, 148, 0.14)',
    bottom: -SCREEN_H * 0.1,
    right: -SCREEN_W * 0.1,
  },
  orb3: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(224, 196, 160, 0.1)',
    top: SCREEN_H * 0.35,
    left: SCREEN_W * 0.2,
  },
});
