/**
 * BreathCircle — React Native Animated API (no reanimated)
 *
 * WHY: react-native-reanimated 4.x worklets require the New Architecture
 * (Fabric/JSI) and a specific babel plugin pass that runs during EAS builds.
 * Across builds 13-19 this produced a static circle in TestFlight while
 * working fine in the simulator. Rather than continuing to chase the worklet
 * compilation issue, all animations here use React Native's built-in
 * Animated API which is guaranteed to work in every build configuration.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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

// Sizing matches website exactly
// .breathing-ring:  full SIZE, scales 0.88 → 1.06
// .breathing-core:  inset 18% = 64% of container, scales 0.94 → 1.04
// ::before (halo):  inset 12% = 76% of container
// ::after (glow):   inset 28% = 44% of container
const SIZE = 280;
const CORE_SIZE = SIZE * 0.64;
const HALO_SIZE = SIZE * 0.76;
const CENTER_GLOW_SIZE = SIZE * 0.44;
const IDLE_HALF_CYCLE = 3000; // 6s total idle cycle

export function BreathCircle({
  phase,
  phaseDuration,
  phaseIndex,
  seconds,
  hideTimer,
  breathWord,
  isFinalExhale,
  phases,
}: Props) {
  // ── Animated values ──
  // breathAnim: 0 = fully exhaled, 1 = fully inhaled — drives scale/opacity/color
  const breathAnim = useRef(new Animated.Value(0)).current;
  const wordOpacityAnim = useRef(new Animated.Value(1)).current;
  const finalExhaleAnim = useRef(new Animated.Value(0)).current;
  // Hold pulse: subtle ±1% scale during hold phases
  const holdPulseAnim = useRef(new Animated.Value(0)).current; // 0 = no extra, additive

  const mainAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastPhasesKeyRef = useRef('');
  const startedRef = useRef(false);

  // ── Main breathing animation ──
  // Only restart when switching between ready/active or when the pattern changes.
  // The looped animation runs continuously — do NOT stop it on every phase change.
  useEffect(() => {
    const phasesKey = phases.map(p => `${p.phase}:${p.duration}`).join(',');
    const ease = Easing.inOut(Easing.ease);

    if (phase === 'ready') {
      // Entering idle — stop any running animation and start idle pulse
      mainAnimRef.current?.stop();
      startedRef.current = false;
      lastPhasesKeyRef.current = '';
      breathAnim.setValue(0);

      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, { toValue: 0.3, duration: IDLE_HALF_CYCLE, easing: ease, useNativeDriver: false }),
          Animated.timing(breathAnim, { toValue: 0, duration: IDLE_HALF_CYCLE, easing: ease, useNativeDriver: false }),
        ])
      );
      mainAnimRef.current = anim;
      anim.start();

    } else if (!startedRef.current || lastPhasesKeyRef.current !== phasesKey) {
      // First active phase or pattern changed — start the breath loop
      mainAnimRef.current?.stop();
      startedRef.current = true;
      lastPhasesKeyRef.current = phasesKey;
      breathAnim.setValue(0);

      const isSimpleBreath =
        phases.length === 2 && phases[0].phase === 'in' && phases[1].phase === 'out';

      let anim: Animated.CompositeAnimation;

      if (isSimpleBreath) {
        const dur = phases[0].duration;
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(breathAnim, { toValue: 1, duration: dur, easing: ease, useNativeDriver: false }),
            Animated.timing(breathAnim, { toValue: 0, duration: dur, easing: ease, useNativeDriver: false }),
          ])
        );
      } else {
        // Multi-phase patterns (box, 4-7-8, coherence)
        const steps: Animated.CompositeAnimation[] = [];
        for (const p of phases) {
          if (p.phase === 'in') {
            steps.push(Animated.timing(breathAnim, { toValue: 1, duration: p.duration, easing: ease, useNativeDriver: false }));
          } else if (p.phase === 'out') {
            steps.push(Animated.timing(breathAnim, { toValue: 0, duration: p.duration, easing: ease, useNativeDriver: false }));
          } else {
            // hold — stay at current inhale/exhale position
            const idx = phases.indexOf(p);
            const prev = idx > 0 ? phases[idx - 1].phase : 'in';
            steps.push(Animated.timing(breathAnim, {
              toValue: prev === 'in' ? 1 : 0,
              duration: p.duration,
              easing: Easing.linear,
              useNativeDriver: false,
            }));
          }
        }
        anim = Animated.loop(Animated.sequence(steps));
      }

      mainAnimRef.current = anim;
      anim.start();
    }
    // Note: when phase changes within an active session (in→out→in…) but the
    // pattern hasn't changed, we intentionally do nothing — the looped animation
    // is already running and stays in sync.
  }, [phase, phaseDuration, phases]);

  // ── Hold pulse ──
  useEffect(() => {
    holdAnimRef.current?.stop();

    if (phase === 'hold') {
      holdPulseAnim.setValue(0);
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(holdPulseAnim, { toValue: 0.02, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(holdPulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      );
      holdAnimRef.current = anim;
      anim.start();
    } else {
      Animated.timing(holdPulseAnim, { toValue: 0, duration: 300, easing: Easing.linear, useNativeDriver: false }).start();
    }
  }, [phase]);

  // ── Word fade ──
  useEffect(() => {
    wordOpacityAnim.setValue(0);
    Animated.timing(wordOpacityAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, [breathWord]);

  // ── Final exhale — stop the loop, gracefully animate to zero, hold still ──
  useEffect(() => {
    if (isFinalExhale) {
      // Stop the looped breathing animation
      mainAnimRef.current?.stop();
      holdAnimRef.current?.stop();
      holdPulseAnim.setValue(0);

      // Smoothly animate breath to fully exhaled (0) and golden glow in
      const exhaleDuration = Math.min(phaseDuration, 3000);
      Animated.parallel([
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: exhaleDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(finalExhaleAnim, {
          toValue: 1,
          duration: Math.min(exhaleDuration, 1200),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(finalExhaleAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [isFinalExhale, phaseDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mainAnimRef.current?.stop();
      holdAnimRef.current?.stop();
    };
  }, []);

  // ── Derived animated values ──
  // Ring scale: 0.88 → 1.06 + hold pulse (additive, max +0.02)
  const ringBaseScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] });
  const ringScale = Animated.add(ringBaseScale, holdPulseAnim);

  // Core scale: 0.94 → 1.04 + hold pulse
  const coreBaseScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] });
  const coreScale = Animated.add(coreBaseScale, holdPulseAnim);

  // Ring opacity: 0.72 → 1.0
  const ringOpacity = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.0] });

  // Halo opacity: 0.4 → 0.8; scale follows ring * 0.95
  const haloOpacity = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  const haloScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88 * 0.95, 1.06 * 0.95] });

  // Ring border color: dim purple → bright purple
  const ringBorderColor = breathAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      'rgba(165, 148, 249, 0.45)',
      'rgba(200, 180, 230, 0.65)',
      'rgba(165, 148, 249, 0.85)',
    ],
  });

  // Core background color
  const coreBackground = breathAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      'rgba(165, 148, 249, 0.12)',
      'rgba(200, 180, 230, 0.20)',
      'rgba(165, 148, 249, 0.32)',
    ],
  });

  // Golden ring overlay opacity — fades in on final exhale
  const goldenOpacity = Animated.multiply(ringOpacity, finalExhaleAnim);

  // Golden ring scale — same as ring
  const ringBaseScale2 = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] });
  const ringScale2 = Animated.add(ringBaseScale2, holdPulseAnim);

  return (
    <View style={styles.wrap}>
      {/* Warm radial halo behind ring */}
      <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale as any }] }]} />

      {/* Main ring — thin border + purple glow */}
      <Animated.View style={[styles.ring, {
        transform: [{ scale: ringScale as any }],
        opacity: ringOpacity,
        borderColor: ringBorderColor,
      }]} />

      {/* Golden ring overlay — appears during final exhale */}
      <Animated.View style={[styles.ring, {
        transform: [{ scale: ringScale2 as any }],
        opacity: goldenOpacity as any,
        borderColor: 'rgba(240, 200, 150, 0.85)',
        shadowColor: 'rgba(240, 200, 150, 1)',
      }]} />

      {/* Core — frosted glass sphere */}
      <Animated.View style={[styles.core, {
        transform: [{ scale: coreScale as any }],
        backgroundColor: coreBackground,
      }]} />

      {/* Center white glow */}
      <View style={styles.centerGlow} />

      {/* Timer */}
      {!hideTimer && (
        <Text style={styles.timer}>{seconds > 0 ? seconds : ''}</Text>
      )}

      {/* Breath word */}
      <Animated.Text style={[styles.word, { opacity: wordOpacityAnim }]}>{breathWord}</Animated.Text>
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
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: 'rgba(240, 200, 150, 0.14)',
  },
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
