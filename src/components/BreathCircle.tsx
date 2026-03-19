import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

export type BreathPhase = 'in' | 'hold' | 'out' | 'ready';

interface Props {
  phase: BreathPhase;
  phaseDuration: number;
  seconds: number;
  hideTimer: boolean;
  breathWord: string;
}

const SIZE = 220;

export function BreathCircle({ phase, phaseDuration, seconds, hideTimer, breathWord }: Props) {
  const scale = useSharedValue(0.6);
  const started = useRef(false);

  useEffect(() => {
    if (phase === 'ready') {
      started.current = false;
      scale.value = 0.6;
    } else if (!started.current) {
      // First non-ready phase — kick off continuous breathing loop
      started.current = true;
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: phaseDuration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [phase, phaseDuration]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const circlePhaseStyle =
    phase === 'in' || phase === 'ready'
      ? styles.circleInhale
      : phase === 'hold'
        ? styles.circleHold
        : styles.circleExhale;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.circle, circlePhaseStyle, circleStyle]}
      />
      {!hideTimer && (
        <Text style={styles.timer}>{seconds > 0 ? seconds : ''}</Text>
      )}
      <Text style={styles.word}>{breathWord}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  circle: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
  },
  circleInhale: {
    borderColor: 'rgba(232, 228, 223, 0.18)',
    backgroundColor: 'rgba(165, 148, 249, 0.08)',
  },
  circleExhale: {
    borderColor: 'rgba(232, 228, 223, 0.08)',
    backgroundColor: 'rgba(165, 148, 249, 0.03)',
  },
  circleHold: {
    borderColor: 'rgba(240, 200, 150, 0.2)',
    backgroundColor: 'rgba(240, 200, 150, 0.06)',
  },
  timer: {
    fontSize: 42,
    color: colors.text,
    fontFamily: 'DMSans',
    letterSpacing: -1,
  },
  word: {
    position: 'absolute',
    bottom: -48,
    fontSize: 32,
    color: colors.text,
    fontFamily: 'InstrumentSerif',
    opacity: 0.9,
  },
});
