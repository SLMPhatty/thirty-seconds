import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function BackgroundOrbs({ breathing = false }: { breathing?: boolean }) {
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3Scale = useSharedValue(1);

  useEffect(() => {
    orb1X.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 6600, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 6600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 6600, easing: Easing.inOut(Easing.ease) }),
        withTiming(60, { duration: 6600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    orb2X.value = withRepeat(
      withSequence(
        withTiming(-50, { duration: 8300, easing: Easing.inOut(Easing.ease) }),
        withTiming(40, { duration: 8300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 8400, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 8300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-50, { duration: 8300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 8400, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    orb3Scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  const style3 = useAnimatedStyle(() => ({
    transform: [{ scale: orb3Scale.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Radial purple fade from top */}
      <View style={styles.radialFade} />
      {/* Warm accent glow */}
      <View style={styles.warmGlow} />
      <Animated.View
        style={[styles.orb, styles.orb1, { opacity: breathing ? 0.7 : 0.4 }, style1]}
      />
      <Animated.View
        style={[styles.orb, styles.orb2, { opacity: breathing ? 0.7 : 0.4 }, style2]}
      />
      <Animated.View
        style={[styles.orb, styles.orb3, { opacity: breathing ? 0.7 : 0.4 }, style3]}
      />
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
    top: '-20%',
    left: '-30%',
    width: '160%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(165, 148, 249, 0.16)',
  },
  warmGlow: {
    position: 'absolute',
    top: '10%',
    right: '-10%',
    width: '50%',
    height: '30%',
    borderRadius: 999,
    backgroundColor: 'rgba(240, 200, 150, 0.08)',
  },
  orb1: {
    width: 500,
    height: 500,
    backgroundColor: 'rgba(165, 148, 249, 0.15)',
    top: '-10%',
    left: '-10%',
  },
  orb2: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(249, 191, 148, 0.1)',
    bottom: '-10%',
    right: '-10%',
  },
  orb3: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(165, 148, 249, 0.15)',
    top: '35%',
    left: '20%',
  },
});
