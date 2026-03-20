import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
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
  phaseIndex: number;
  seconds: number;
  hideTimer: boolean;
  breathWord: string;
  isFinalExhale: boolean;
  phases: PhaseConfig[];
  holdAfterInhale?: boolean;
}

const SIZE = 280;
const CORE_SIZE = SIZE * 0.64; // inner core is 64% of ring — matches website's inset: 18%
const HALO_SIZE = SIZE * 0.76; // warm halo behind core

export function BreathCircle({
  phase,
  phaseDuration,
  phaseIndex,
  seconds,
  hideTimer,
  breathWord,
  isFinalExhale,
  phases,
  holdAfterInhale,
}: Props) {
  // Ring scale: 0.88 → 1.06 (matches website exactly)
  const ringScale = useSharedValue(0.88);
  // Core scale: 0.94 → 1.04 (slightly less = parallax depth)
  const coreScale = useSharedValue(0.94);
  // Ring opacity: 0.72 → 1.0
  const ringOpacity = useSharedValue(0.72);
  // Halo opacity
  const haloOpacity = useSharedValue(0.5);
  // Color phase: 0 = exhale (dim), 1 = inhale (bright) — drives smooth color crossfade
  const colorPhase = useSharedValue(0);
  // Hold pulse
  const pulseScale = useSharedValue(1);
  // Word fade
  const wordOpacity = useSharedValue(1);
  // Final exhale golden shift
  const finalExhaleProgress = useSharedValue(0);

  const started = useRef(false);
  const lastPhasesKey = useRef('');

  // Build ring + core animation sequences from phase configs
  useEffect(() => {
    const phasesKey = phases.map(p => `${p.phase}:${p.duration}`).join(',');

    if (phase === 'ready') {
      started.current = false;
      lastPhasesKey.current = '';
      // Gentle idle breathing
      ringScale.value = withRepeat(
        withSequence(
          withTiming(0.92, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.88, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false
      );
      coreScale.value = withRepeat(
        withSequence(
          withTiming(0.97, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.94, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.72, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false
      );
      haloOpacity.value = 0.5;
      colorPhase.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false
      );
    } else if (!started.current || lastPhasesKey.current !== phasesKey) {
      started.current = true;
      lastPhasesKey.current = phasesKey;

      const ringSeq: ReturnType<typeof withTiming>[] = [];
      const coreSeq: ReturnType<typeof withTiming>[] = [];
      const opacitySeq: ReturnType<typeof withTiming>[] = [];
      const haloSeq: ReturnType<typeof withTiming>[] = [];
      const colorSeq: ReturnType<typeof withTiming>[] = [];

      for (const p of phases) {
        const ease = Easing.inOut(Easing.ease);
        if (p.phase === 'in') {
          ringSeq.push(withTiming(1.06, { duration: p.duration, easing: ease }));
          coreSeq.push(withTiming(1.04, { duration: p.duration, easing: ease }));
          opacitySeq.push(withTiming(1, { duration: p.duration, easing: ease }));
          haloSeq.push(withTiming(0.8, { duration: p.duration, easing: ease }));
          colorSeq.push(withTiming(1, { duration: p.duration, easing: ease }));
        } else if (p.phase === 'out') {
          ringSeq.push(withTiming(0.88, { duration: p.duration, easing: ease }));
          coreSeq.push(withTiming(0.94, { duration: p.duration, easing: ease }));
          opacitySeq.push(withTiming(0.72, { duration: p.duration, easing: ease }));
          haloSeq.push(withTiming(0.4, { duration: p.duration, easing: ease }));
          colorSeq.push(withTiming(0, { duration: p.duration, easing: ease }));
        } else if (p.phase === 'hold') {
          const idx = phases.indexOf(p);
          const prev = idx > 0 ? phases[idx - 1].phase : 'in';
          ringSeq.push(withTiming(prev === 'in' ? 1.06 : 0.88, { duration: p.duration, easing: Easing.linear }));
          coreSeq.push(withTiming(prev === 'in' ? 1.04 : 0.94, { duration: p.duration, easing: Easing.linear }));
          opacitySeq.push(withTiming(prev === 'in' ? 1 : 0.72, { duration: p.duration, easing: Easing.linear }));
          haloSeq.push(withTiming(prev === 'in' ? 0.8 : 0.4, { duration: p.duration, easing: Easing.linear }));
          colorSeq.push(withTiming(0.5, { duration: p.duration, easing: Easing.linear }));
        }
      }

      ringScale.value = withRepeat(withSequence(...ringSeq) as number, -1, false);
      coreScale.value = withRepeat(withSequence(...coreSeq) as number, -1, false);
      ringOpacity.value = withRepeat(withSequence(...opacitySeq) as number, -1, false);
      haloOpacity.value = withRepeat(withSequence(...haloSeq) as number, -1, false);
      colorPhase.value = withRepeat(withSequence(...colorSeq) as number, -1, false);
    }
  }, [phase, phaseDuration, phases]);

  // Hold pulse
  useEffect(() => {
    if (phase === 'hold') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [phase]);

  // Word fade on change
  useEffect(() => {
    wordOpacity.value = 0;
    wordOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [breathWord, wordOpacity]);

  // Final exhale golden glow
  useEffect(() => {
    finalExhaleProgress.value = withTiming(isFinalExhale ? 1 : 0, {
      duration: Math.min(phaseDuration, 1200),
      easing: Easing.inOut(Easing.ease),
    });
  }, [finalExhaleProgress, isFinalExhale, phaseDuration]);

  // === ANIMATED STYLES ===

  // Outer ring — thin border with massive purple glow, smooth color crossfade
  const ringStyle = useAnimatedStyle(() => {
    const cp = colorPhase.value;
    const fe = finalExhaleProgress.value;

    // Base colors: exhale (dim) → inhale (bright)
    const baseBorder = interpolateColor(cp, [0, 0.5, 1],
      ['rgba(165, 148, 249, 0.45)', 'rgba(200, 180, 230, 0.65)', 'rgba(165, 148, 249, 0.85)']);
    const baseShadow = interpolateColor(cp, [0, 1],
      ['rgba(165, 148, 249, 0.08)', 'rgba(165, 148, 249, 0.30)']);

    // Final exhale: shift to golden
    const borderColor = interpolateColor(fe, [0, 1], [baseBorder as string, 'rgba(240, 200, 150, 0.85)']);
    const shadowColor = interpolateColor(fe, [0, 1], [baseShadow as string, 'rgba(240, 200, 150, 0.3)']);

    return {
      transform: [{ scale: ringScale.value * pulseScale.value }],
      opacity: ringOpacity.value,
      borderColor,
      shadowColor,
    };
  });

  // Inner frosted core — parallax with ring, color synced to breath
  const coreStyle = useAnimatedStyle(() => {
    const cp = colorPhase.value;
    const fe = finalExhaleProgress.value;

    // Exhale = dimmer, inhale = brighter
    const baseBg = interpolateColor(cp, [0, 0.5, 1],
      ['rgba(165, 148, 249, 0.12)', 'rgba(200, 180, 230, 0.20)', 'rgba(165, 148, 249, 0.32)']);
    const bg = interpolateColor(fe, [0, 1], [baseBg as string, 'rgba(240, 200, 150, 0.25)']);

    return {
      transform: [{ scale: coreScale.value * pulseScale.value }],
      backgroundColor: bg,
    };
  });

  // Warm halo behind everything
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: ringScale.value * 0.95 }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
  }));

  return (
    <View style={styles.wrap}>
      {/* Warm halo glow — behind ring */}
      <Animated.View style={[styles.halo, haloStyle]} />

      {/* Outer breathing ring — thin border + box shadow glow */}
      <Animated.View style={[styles.ring, ringStyle]} />

      {/* Inner frosted core — parallax scale */}
      <Animated.View style={[styles.core, coreStyle]}>
        {/* Highlight spot (top-left light reflection) */}
        <View style={styles.highlight} />
      </Animated.View>

      {/* Center white glow */}
      <View style={styles.centerGlow} />

      {/* Timer */}
      {!hideTimer && (
        <Text style={styles.timer}>{seconds > 0 ? seconds : ''}</Text>
      )}

      {/* Breath word */}
      <Animated.Text style={[styles.word, wordStyle]}>{breathWord}</Animated.Text>
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
  // Warm halo behind the ring
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: 'rgba(240, 200, 150, 0.12)',
  },
  // Outer ring — matches website's breathing-ring
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(165, 148, 249, 0.85)',
    backgroundColor: 'transparent',
    // React Native shadow (iOS) — emulates box-shadow glow
    shadowColor: 'rgba(165, 148, 249, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
  },
  // Inner core — matches website's breathing-core (frosted glass effect)
  core: {
    position: 'absolute',
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: 'rgba(165, 148, 249, 0.32)',
    // Inner glow shadow
    shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    overflow: 'hidden',
  },
  // Highlight spot — top-left light reflection like website
  highlight: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    width: '35%',
    height: '35%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  // Center white glow
  centerGlow: {
    position: 'absolute',
    width: CORE_SIZE * 0.5,
    height: CORE_SIZE * 0.5,
    borderRadius: (CORE_SIZE * 0.5) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  timer: {
    fontSize: 42,
    color: colors.text,
    fontFamily: 'DMSans',
    letterSpacing: -1,
    zIndex: 10,
  },
  word: {
    position: 'absolute',
    bottom: -48,
    fontSize: 32,
    color: colors.text,
    fontFamily: 'InstrumentSerif',
    opacity: 0.9,
    zIndex: 10,
  },
});
