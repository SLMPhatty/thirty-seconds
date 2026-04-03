import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
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

// ── Sizing to match website exactly ──
// Website: .breathing-wrap is the full container
// Website: .breathing-ring is inset:0 (full size), scales 0.88→1.06
// Website: .breathing-core is inset:18% (64% of container), scales 0.94→1.04
// Website: ::before (warm halo) is inset:12% (76% of container)
// Website: ::after (center glow) is inset:28% (44% of container)
const SIZE = 280;
const CORE_SIZE = SIZE * 0.64;
const HALO_SIZE = SIZE * 0.76;
const CENTER_GLOW_SIZE = SIZE * 0.44;

// Website uses 6s cycle for the hero idle animation
const IDLE_HALF_CYCLE = 3000;

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
  // Matches website: ring scales 0.88 → 1.06
  const ringScale = useSharedValue(0.88);
  // Matches website: core scales 0.94 → 1.04
  const coreScale = useSharedValue(0.94);
  // Matches website: ring opacity 0.72 → 1.0
  const ringOpacity = useSharedValue(0.72);
  // Halo breathes with ring
  const haloOpacity = useSharedValue(0.5);
  // Color driver: 0=exhaled(dim) → 1=inhaled(bright)
  const colorPhase = useSharedValue(0);
  // Hold pulse
  const pulseScale = useSharedValue(1);
  // Word fade
  const wordOpacity = useSharedValue(1);
  // Final exhale golden shift
  const finalExhaleProgress = useSharedValue(0);

  const started = useRef(false);
  const lastPhasesKey = useRef('');

  useEffect(() => {
    const phasesKey = phases.map(p => `${p.phase}:${p.duration}`).join(',');
    const ease = Easing.inOut(Easing.ease);

    if (phase === 'ready') {
      // ── IDLE STATE ──
      // Matches website hero: gentle 6s breathing cycle
      started.current = false;
      lastPhasesKey.current = '';

      ringScale.value = 0.88;
      ringScale.value = withRepeat(
        withTiming(0.92, { duration: IDLE_HALF_CYCLE, easing: ease }),
        -1, true
      );
      coreScale.value = 0.94;
      coreScale.value = withRepeat(
        withTiming(0.97, { duration: IDLE_HALF_CYCLE, easing: ease }),
        -1, true
      );
      ringOpacity.value = 0.72;
      ringOpacity.value = withRepeat(
        withTiming(0.85, { duration: IDLE_HALF_CYCLE, easing: ease }),
        -1, true
      );
      haloOpacity.value = 0.4;
      haloOpacity.value = withRepeat(
        withTiming(0.6, { duration: IDLE_HALF_CYCLE, easing: ease }),
        -1, true
      );
      colorPhase.value = 0;
      colorPhase.value = withRepeat(
        withTiming(0.3, { duration: IDLE_HALF_CYCLE, easing: ease }),
        -1, true
      );
    } else if (!started.current || lastPhasesKey.current !== phasesKey) {
      // ── ACTIVE BREATHING ──
      started.current = true;
      lastPhasesKey.current = phasesKey;

      const isSimpleBreath = phases.length === 2 && phases[0].phase === 'in' && phases[1].phase === 'out';

      if (isSimpleBreath) {
        // Simple in/out: use reverse:true for perfectly seamless breathing
        // This matches the website's CSS keyframes behavior exactly
        const inDur = phases[0].duration;

        ringScale.value = 0.88;
        ringScale.value = withRepeat(
          withTiming(1.06, { duration: inDur, easing: ease }),
          -1, true
        );
        coreScale.value = 0.94;
        coreScale.value = withRepeat(
          withTiming(1.04, { duration: inDur, easing: ease }),
          -1, true
        );
        ringOpacity.value = 0.72;
        ringOpacity.value = withRepeat(
          withTiming(1, { duration: inDur, easing: ease }),
          -1, true
        );
        haloOpacity.value = 0.4;
        haloOpacity.value = withRepeat(
          withTiming(0.8, { duration: inDur, easing: ease }),
          -1, true
        );
        colorPhase.value = 0;
        colorPhase.value = withRepeat(
          withTiming(1, { duration: inDur, easing: ease }),
          -1, true
        );
      } else {
        // Multi-phase patterns (box, 4-7-8, coherence)
        const ringSeq: ReturnType<typeof withTiming>[] = [];
        const coreSeq: ReturnType<typeof withTiming>[] = [];
        const opacitySeq: ReturnType<typeof withTiming>[] = [];
        const haloSeq: ReturnType<typeof withTiming>[] = [];
        const colorSeq: ReturnType<typeof withTiming>[] = [];

        for (const p of phases) {
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

        // Reset to initial values before starting multi-phase sequence
        ringScale.value = 0.88;
        coreScale.value = 0.94;
        ringOpacity.value = 0.72;
        haloOpacity.value = 0.4;
        colorPhase.value = 0;

        ringScale.value = withRepeat(withSequence(...ringSeq), -1, false);
        coreScale.value = withRepeat(withSequence(...coreSeq), -1, false);
        ringOpacity.value = withRepeat(withSequence(...opacitySeq), -1, false);
        haloOpacity.value = withRepeat(withSequence(...haloSeq), -1, false);
        colorPhase.value = withRepeat(withSequence(...colorSeq), -1, false);
      }
    }
  }, [phase, phaseDuration, phases]);

  // Hold pulse
  useEffect(() => {
    if (phase === 'hold') {
      pulseScale.value = 1;
      pulseScale.value = withRepeat(
        withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true,
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

  // ── ANIMATED STYLES ──
  // Split transforms from color interpolation into separate worklets so that
  // if interpolateColor fails on the UI thread (reanimated 4.x issue), the
  // scale/opacity animations still work.

  const ringTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value * pulseScale.value }],
    opacity: ringOpacity.value,
  }));

  const ringColorStyle = useAnimatedStyle(() => {
    const cp = colorPhase.value;
    const fe = finalExhaleProgress.value;
    const t = interpolate(cp, [0, 0.5, 1], [0, 1, 2]) * (1 - fe) + 3 * fe;

    const borderColor = interpolateColor(t, [0, 1, 2, 3],
      ['rgba(165, 148, 249, 0.45)', 'rgba(200, 180, 230, 0.65)', 'rgba(165, 148, 249, 0.85)', 'rgba(240, 200, 150, 0.85)']);
    const shadowColor = interpolateColor(t, [0, 2, 3],
      ['rgba(165, 148, 249, 0.08)', 'rgba(165, 148, 249, 0.30)', 'rgba(240, 200, 150, 0.3)']);

    return { borderColor, shadowColor };
  });

  const coreTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value * pulseScale.value }],
  }));

  const coreColorStyle = useAnimatedStyle(() => {
    const cp = colorPhase.value;
    const fe = finalExhaleProgress.value;
    const t = interpolate(cp, [0, 0.5, 1], [0, 1, 2]) * (1 - fe) + 3 * fe;

    const backgroundColor = interpolateColor(t, [0, 1, 2, 3],
      ['rgba(165, 148, 249, 0.12)', 'rgba(200, 180, 230, 0.20)', 'rgba(165, 148, 249, 0.32)', 'rgba(240, 200, 150, 0.25)']);

    return { backgroundColor };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: ringScale.value * 0.95 }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
  }));

  return (
    <View style={styles.wrap}>
      {/* Website ::before — warm radial gradient halo behind ring */}
      <Animated.View style={[styles.halo, haloStyle]} />

      {/* Website .breathing-ring — thin border + purple glow */}
      <Animated.View style={[styles.ring, ringTransformStyle, ringColorStyle]} />

      {/* Website .breathing-core — frosted glass */}
      <Animated.View style={[styles.core, coreTransformStyle, coreColorStyle]} />

      {/* Website ::after — center white glow */}
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
  // Website ::before — warm radial gradient halo
  // inset: 12% = 76% of container
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: 'rgba(240, 200, 150, 0.14)',
  },
  // Website .breathing-ring
  // border: 1.5px solid rgba(165, 148, 249, 0.85)
  // box-shadow: 0 0 50px rgba(165, 148, 249, 0.25)
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(165, 148, 249, 0.85)',
    backgroundColor: 'transparent',
    shadowColor: 'rgba(165, 148, 249, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
  },
  // Website .breathing-core
  // inset: 18% = 64% of container
  // background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 35%),
  //             radial-gradient(circle, rgba(165,148,249,0.32), ...)
  // backdrop-filter: blur(18px)
  core: {
    position: 'absolute',
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: 'rgba(165, 148, 249, 0.32)',
    shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    overflow: 'hidden',
  },
  // Website ::after — center white glow
  // inset: 28% = 44% of container
  centerGlow: {
    position: 'absolute',
    width: CENTER_GLOW_SIZE,
    height: CENTER_GLOW_SIZE,
    borderRadius: CENTER_GLOW_SIZE / 2,
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
