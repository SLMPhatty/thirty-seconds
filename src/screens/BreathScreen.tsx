import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { BreathCircle, BreathPhase } from '../components/BreathCircle';
import { useAudio } from '../hooks/useAudio';
import { Prefs, setPrefs } from '../utils/storage';
import {
  BREATHING_PATTERNS,
  BreathPattern,
  DEFAULT_BREATH_PATTERN,
  PREMIUM_PATTERNS,
} from '../data/breathingPatterns';
import { colors } from '../theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chimeSound = require('../../assets/audio/chime.wav');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rainSound = require('../../assets/audio/rain-loop.wav');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brownSound = require('../../assets/audio/brown-loop.wav');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bowlSound = require('../../assets/audio/bowl-loop.wav');

const READY_DELAY = 3000;
const AMBIENT_VOLUME = 0.25;
const FADE_DURATION = 2000;
const LOOP_DURATIONS = { rain: 57000, brown: 60000, bowl: 44000 };
const CROSSFADE_DURATION = 4000;

interface Props {
  prefs: Prefs;
  onFinish: () => void;
  onVisualStateChange?: (phase: BreathPhase, duration: number, phaseIndex: number) => void;
}

export function BreathScreen({ prefs, onFinish, onVisualStateChange }: Props) {
  const showPatternPicker = prefs.duration >= 60;
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern>(
    showPatternPicker ? prefs.breathPattern : DEFAULT_BREATH_PATTERN
  );
  const pattern = BREATHING_PATTERNS[selectedPattern] || BREATHING_PATTERNS[DEFAULT_BREATH_PATTERN];
  const PHASES = pattern.phases;

  const hasAmbient = prefs.ambientSound !== 'off';
  const soundMap = { rain: rainSound, brown: brownSound, bowl: bowlSound } as const;
  const loopSound = soundMap[prefs.ambientSound as keyof typeof soundMap] || rainSound;
  const loopDuration = LOOP_DURATIONS[prefs.ambientSound as keyof typeof LOOP_DURATIONS] || LOOP_DURATIONS.rain;
  const [seconds, setSeconds] = useState(prefs.duration || 30);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [awaitingFinalExhale, setAwaitingFinalExhale] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const { playAsset, playLoop, stopAll } = useAudio();
  const ambientARef = useRef<AudioPlayer | null>(null);
  const ambientBRef = useRef<AudioPlayer | null>(null);
  const crossfadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionVolRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  const currentPhase = PHASES[phaseIndex];

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showPatternPicker && selectedPattern !== DEFAULT_BREATH_PATTERN) {
      setSelectedPattern(DEFAULT_BREATH_PATTERN);
    }
  }, [showPatternPicker, selectedPattern]);

  useEffect(() => {
    setPhaseIndex(0);
  }, [selectedPattern]);

  // Load two ambient sound instances on mount for crossfade looping
  useEffect(() => {
    if (!hasAmbient) return;
    let cancelled = false;

    const loadAmbient = async () => {
      const [a, b] = await Promise.all([
        playLoop(loopSound, 0),
        playLoop(loopSound, 0),
      ]);
      if (cancelled) return;
      ambientARef.current = a;
      ambientBRef.current = b;

      if (b) {
        await b.seekTo(loopDuration / 2000);
      }
    };

    loadAmbient();
    return () => { cancelled = true; };
  }, []);

  // 3-2-1 countdown then start
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const completeSession = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setSessionComplete(true);
    playAsset(chimeSound, 0.5);

    if (ambientARef.current || ambientBRef.current) {
      const startTime = performance.now();
      const startVol = sessionVolRef.current;
      const fadeOut = () => {
        const t = Math.min((performance.now() - startTime) / FADE_DURATION, 1);
        sessionVolRef.current = startVol * (1 - t);
        if (t < 1) rafRef.current = requestAnimationFrame(fadeOut);
      };
      rafRef.current = requestAnimationFrame(fadeOut);
    }

    setTimeout(() => {
      cleanup();
      onFinish();
    }, 2500);
  }, [onFinish, playAsset]);

  const advancePhase = useCallback(() => {
    if (awaitingFinalExhale && currentPhase.phase === 'out') {
      completeSession();
      return;
    }

    setPhaseIndex((prev) => {
      const next = (prev + 1) % PHASES.length;
      return next;
    });
  }, [PHASES.length, awaitingFinalExhale, completeSession, currentPhase.phase]);

  useEffect(() => {
    if (!ready || !prefs.haptics || currentPhase.phase !== 'in') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentPhase.phase, phaseIndex, prefs.haptics, ready]);

  // Phase cycling — only when ready
  useEffect(() => {
    if (!ready) return;
    phaseTimeout.current = setTimeout(advancePhase, currentPhase.duration);
    return () => {
      if (phaseTimeout.current) clearTimeout(phaseTimeout.current);
    };
  }, [ready, phaseIndex, advancePhase, currentPhase.duration]);

  useEffect(() => {
    onVisualStateChange?.(ready ? (currentPhase.phase as BreathPhase) : 'ready', ready ? currentPhase.duration : READY_DELAY, phaseIndex);
  }, [currentPhase.duration, currentPhase.phase, onVisualStateChange, ready, phaseIndex]);

  // Fade ambient sound in when session starts + crossfade polling
  useEffect(() => {
    if (!ready || !hasAmbient) return;

    const waitAndStart = () => {
      if (!ambientARef.current) {
        setTimeout(waitAndStart, 100);
        return;
      }

      const fadeStart = performance.now();
      const fadeIn = () => {
        const t = Math.min((performance.now() - fadeStart) / FADE_DURATION, 1);
        sessionVolRef.current = t * AMBIENT_VOLUME;
        if (t < 1) rafRef.current = requestAnimationFrame(fadeIn);
      };
      rafRef.current = requestAnimationFrame(fadeIn);

      crossfadeRef.current = setInterval(async () => {
        const vol = sessionVolRef.current;
        const a = ambientARef.current;
        const b = ambientBRef.current;

        try {
          if (a) {
            const statusA = a.currentStatus;
            if (statusA.isLoaded) {
              const pos = (statusA.currentTime * 1000) % loopDuration;
              const distToEnd = loopDuration - pos;
              if (distToEnd < CROSSFADE_DURATION) {
                a.volume = vol * (distToEnd / CROSSFADE_DURATION);
              } else if (pos < CROSSFADE_DURATION) {
                a.volume = vol * (pos / CROSSFADE_DURATION);
              } else {
                a.volume = vol;
              }
            }
          }

          if (b) {
            const statusB = b.currentStatus;
            if (statusB.isLoaded) {
              const pos = (statusB.currentTime * 1000) % loopDuration;
              const distToEnd = loopDuration - pos;
              if (distToEnd < CROSSFADE_DURATION) {
                b.volume = vol * (distToEnd / CROSSFADE_DURATION);
              } else if (pos < CROSSFADE_DURATION) {
                b.volume = vol * (pos / CROSSFADE_DURATION);
              } else {
                b.volume = vol;
              }
            }
          }
        } catch {}
      }, 200);
    };

    waitAndStart();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (crossfadeRef.current) {
        clearInterval(crossfadeRef.current);
        crossfadeRef.current = null;
      }
    };
  }, [ready]);

  // Start countdown timer once ready
  useEffect(() => {
    if (!ready) return;

    timerInterval.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
          setAwaitingFinalExhale(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return cleanup;
  }, [ready]);

  const cleanup = () => {
    if (phaseTimeout.current) clearTimeout(phaseTimeout.current);
    if (timerInterval.current) clearInterval(timerInterval.current);
    if (crossfadeRef.current) clearInterval(crossfadeRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopAll();
  };

  useEffect(() => {
    return () => {
      onVisualStateChange?.('ready', READY_DELAY, 0);
    };
  }, [onVisualStateChange]);

  // Determine if current hold is after inhale
  const holdAfterInhale = currentPhase.phase === 'hold' && phaseIndex > 0 && PHASES[phaseIndex - 1].phase === 'in';
  const isFinalExhale = awaitingFinalExhale && currentPhase.phase === 'out';

  const handlePatternSelect = useCallback(async (patternKey: BreathPattern) => {
    if (!showPatternPicker || selectedPattern === patternKey) return;
    setSelectedPattern(patternKey);
    await setPrefs({ ...prefs, breathPattern: patternKey });
  }, [prefs, selectedPattern, showPatternPicker]);

  return (
    <View style={styles.container}>
      {showPatternPicker && (
        <View style={styles.patternWrap}>
          <Text style={styles.patternLabel}>pattern</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.patternList}
          >
            {(Object.keys(BREATHING_PATTERNS) as BreathPattern[]).map((patternKey) => (
              <TouchableOpacity
                key={patternKey}
                style={[
                  styles.patternPill,
                  selectedPattern === patternKey && styles.patternPillActive,
                ]}
                onPress={() => handlePatternSelect(patternKey)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.patternText,
                    selectedPattern === patternKey && styles.patternTextActive,
                  ]}
                >
                  {BREATHING_PATTERNS[patternKey].label}
                  {PREMIUM_PATTERNS.includes(patternKey) ? ` · ${BREATHING_PATTERNS[patternKey].cycleSeconds}s` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <BreathCircle
        phase={ready ? (currentPhase.phase as BreathPhase) : 'ready'}
        phaseDuration={ready ? currentPhase.duration : READY_DELAY}
        phaseIndex={phaseIndex}
        seconds={ready ? seconds : prefs.duration || 30}
        hideTimer={prefs.hideTimer}
        breathWord={sessionComplete ? '' : ready ? currentPhase.label : String(countdown)}
        isFinalExhale={isFinalExhale}
        phases={PHASES}
        holdAfterInhale={holdAfterInhale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  patternWrap: {
    position: 'absolute',
    top: 96,
    left: 0,
    right: 0,
  },
  patternLabel: {
    color: colors.textFaint,
    fontFamily: 'DMSans',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  patternList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  patternPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: 'rgba(232, 228, 223, 0.03)',
  },
  patternPillActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSurface,
  },
  patternText: {
    color: colors.textFaint,
    fontFamily: 'DMSans',
    fontSize: 13,
  },
  patternTextActive: {
    color: colors.text,
  },
});
