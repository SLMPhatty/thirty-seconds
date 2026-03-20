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
import { PhaseConfig } from '../data/breathingPatterns';

export type BreathPhase = 'in' | 'hold' | 'out' | 'ready';

interface Props {
  phase: BreathPhase;
  phaseDuration: number;
  seconds: number;
  hideTimer: boolean;
  breathWord: string;
  phases: PhaseConfig[];
  holdAfterInhale?: boolean; // true if this hold follows an inhale (circle stays expanded)
}

const SIZE = 220;

export function BreathCircle({ phase, phaseDuration, seconds, hideTimer, breathWord, phases, holdAfterInhale }: Props) {
  const scale = useSharedValue(0.6);
  const pulseScale = useSharedValue(1);
  const started = useRef(false);
  const lastPhasesKey = useRef('');

  // Build the animation sequence from the full phase list
  useEffect(() => {
    const phasesKey = phases.map(p => `${p.phase}:${p.duration}`).join(',');

    if (phase === 'ready') {
      started.current = false;
      lastPhasesKey.current = '';
      scale.value = 0.6;
      pulseScale.value = 1;
    } else if (!started.current || lastPhasesKey.current !== phasesKey) {
      started.current = true;
      lastPhasesKey.current = phasesKey;

      // Build a sequence of timing animations from the phase configs
      const sequence: ReturnType<typeof withTiming>[] = [];
      for (const p of phases) {
        if (p.phase === 'in') {
          sequence.push(withTiming(1, { duration: p.duration, easing: Easing.inOut(Easing.ease) }));
        } else if (p.phase === 'out') {
          sequence.push(withTiming(0.6, { duration: p.duration, easing: Easing.inOut(Easing.ease) }));
        } else if (p.phase === 'hold') {
          // Hold: maintain current scale for the duration
          // We determine the target based on whether the previous phase was 'in' or 'out'
          const idx = phases.indexOf(p);
          const prevPhase = idx > 0 ? phases[idx - 1].phase : 'in';
          const holdTarget = prevPhase === 'in' ? 1 : 0.6;
          sequence.push(withTiming(holdTarget, { duration: p.duration, easing: Easing.linear }));
        }
      }

      scale.value = withRepeat(withSequence(...sequence) as number, -1, false);
    }
  }, [phase, phaseDuration, phases]);

  // Subtle pulse during hold phase
  useEffect(() => {
    if (phase === 'hold') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [phase]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
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
