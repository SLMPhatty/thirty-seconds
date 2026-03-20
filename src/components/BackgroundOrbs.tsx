import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type BreathPhase = 'in' | 'hold' | 'out' | 'ready';

interface Props {
  breathPhase?: BreathPhase;
  phaseDuration?: number;
}

export function BackgroundOrbs({ breathPhase = 'ready', phaseDuration = 3000 }: Props) {
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3Scale = useSharedValue(1);
  const groupScale = useSharedValue(1);
  const holdPulse = useSharedValue(0);
  const orbOpacity = useSharedValue(0.4);
  const radialStrength = useSharedValue(0.16);
  const screenPulseOpacity = useSharedValue(0);

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

  useEffect(() => {
    if (breathPhase === 'ready') {
      cancelAnimation(holdPulse);
      groupScale.value = withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) });
      orbOpacity.value = withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.ease) });
      radialStrength.value = withTiming(0.16, { duration: 1600, easing: Easing.inOut(Easing.ease) });
      screenPulseOpacity.value = withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) });
      return;
    }

    if (breathPhase === 'in') {
      cancelAnimation(holdPulse);
      holdPulse.value = withTiming(0, { duration: 150 });
      groupScale.value = withTiming(1.3, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      orbOpacity.value = withTiming(0.7, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      radialStrength.value = withTiming(0.26, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      screenPulseOpacity.value = withTiming(0.02, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      return;
    }

    if (breathPhase === 'out') {
      cancelAnimation(holdPulse);
      holdPulse.value = withTiming(0, { duration: 150 });
      groupScale.value = withTiming(0.85, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      orbOpacity.value = withTiming(0.35, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      radialStrength.value = withTiming(0.1, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      screenPulseOpacity.value = withTiming(0, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) });
      return;
    }

    holdPulse.value = withRepeat(
      withSequence(
        withTiming(0.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [breathPhase, phaseDuration, groupScale, holdPulse, orbOpacity, radialStrength, screenPulseOpacity]);

  const style1 = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [
      { translateX: orb1X.value },
      { translateY: orb1Y.value },
      { scale: groupScale.value + holdPulse.value },
    ],
  }));

  const style2 = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [
      { translateX: orb2X.value },
      { translateY: orb2Y.value },
      { scale: groupScale.value + holdPulse.value },
    ],
  }));

  const style3 = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [
      { scale: (breathPhase === 'ready' ? orb3Scale.value : 1) * (groupScale.value + holdPulse.value) },
    ],
  }));

  const radialFadeStyle = useAnimatedStyle(() => ({
    opacity: radialStrength.value,
  }));

  const screenPulseStyle = useAnimatedStyle(() => ({
    opacity: screenPulseOpacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Radial purple fade from top */}
      <Animated.View style={[styles.radialFade, radialFadeStyle]} />
      {/* Warm accent glow */}
      <View style={styles.warmGlow} />
      <Animated.View style={[styles.orb, styles.orb1, style1]} />
      <Animated.View style={[styles.orb, styles.orb2, style2]} />
      <Animated.View style={[styles.orb, styles.orb3, style3]} />
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
  screenPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
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
