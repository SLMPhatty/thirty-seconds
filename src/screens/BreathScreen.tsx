import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { BreathCircle, BreathPhase } from '../components/BreathCircle';
import { useAudio } from '../hooks/useAudio';
import { Prefs } from '../utils/storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chimeSound = require('../../assets/audio/chime.wav');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rainSound = require('../../assets/audio/rain-loop.wav');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brownSound = require('../../assets/audio/brown-loop.wav');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bowlSound = require('../../assets/audio/bowl-loop.wav');

interface PhaseConfig {
  phase: BreathPhase;
  duration: number;
  label: string;
}

const PHASES: PhaseConfig[] = [
  { phase: 'in', duration: 4000, label: 'breathe in' },
  { phase: 'out', duration: 4000, label: 'breathe out' },
];

const READY_DELAY = 3000;
const AMBIENT_VOLUME = 0.25;
const FADE_DURATION = 2000;
const LOOP_DURATIONS = { rain: 57000, brown: 60000, bowl: 44000 };
const CROSSFADE_DURATION = 4000; // 4s crossfade near loop boundary

interface Props {
  prefs: Prefs;
  onFinish: () => void;
}

export function BreathScreen({ prefs, onFinish }: Props) {
  const hasAmbient = prefs.ambientSound !== 'off';
  const soundMap = { rain: rainSound, brown: brownSound, bowl: bowlSound } as const;
  const loopSound = soundMap[prefs.ambientSound as keyof typeof soundMap] || rainSound;
  const loopDuration = LOOP_DURATIONS[prefs.ambientSound as keyof typeof LOOP_DURATIONS] || LOOP_DURATIONS.rain;
  const [seconds, setSeconds] = useState(prefs.duration || 30);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const { playAsset, playLoop, stopAll } = useAudio();
  const ambientARef = useRef<Audio.Sound | null>(null);
  const ambientBRef = useRef<Audio.Sound | null>(null);
  const crossfadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionVolRef = useRef(0); // current session volume (for fade-in/out)
  const rafRef = useRef<number | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  const currentPhase = PHASES[phaseIndex];

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

      // Offset instance B by half the loop duration for staggered crossfade
      if (b) {
        await b.setPositionAsync(loopDuration / 2);
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

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => {
      const next = (prev + 1) % PHASES.length;
      const nextPhase = PHASES[next];

      if (prefs.haptics) {
        if (nextPhase.phase === 'in') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (nextPhase.phase === 'out') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
      }

      return next;
    });
  }, [prefs.haptics]);

  // Phase cycling — only when ready
  useEffect(() => {
    if (!ready) return;
    phaseTimeout.current = setTimeout(advancePhase, currentPhase.duration);
    return () => {
      if (phaseTimeout.current) clearTimeout(phaseTimeout.current);
    };
  }, [ready, phaseIndex, advancePhase, currentPhase.duration]);

  // Fade ambient sound in when session starts + crossfade polling
  useEffect(() => {
    if (!ready || !hasAmbient) return;

    // Wait for audio to be loaded before starting fade-in
    const waitAndStart = () => {
      if (!ambientARef.current) {
        setTimeout(waitAndStart, 100);
        return;
      }

      // Fade in session volume
      const fadeStart = performance.now();
      const fadeIn = () => {
        const t = Math.min((performance.now() - fadeStart) / FADE_DURATION, 1);
        sessionVolRef.current = t * AMBIENT_VOLUME;
        if (t < 1) rafRef.current = requestAnimationFrame(fadeIn);
      };
      rafRef.current = requestAnimationFrame(fadeIn);

      // Crossfade polling: adjust volumes near loop boundaries
      crossfadeRef.current = setInterval(async () => {
        const vol = sessionVolRef.current;
        const a = ambientARef.current;
        const b = ambientBRef.current;

        try {
          if (a) {
            const statusA = await a.getStatusAsync();
            if (statusA.isLoaded) {
              const pos = statusA.positionMillis % loopDuration;
              const distToEnd = loopDuration - pos;
              if (distToEnd < CROSSFADE_DURATION) {
                a.setVolumeAsync(vol * (distToEnd / CROSSFADE_DURATION)).catch(() => {});
              } else if (pos < CROSSFADE_DURATION) {
                a.setVolumeAsync(vol * (pos / CROSSFADE_DURATION)).catch(() => {});
              } else {
                a.setVolumeAsync(vol).catch(() => {});
              }
            }
          }

          if (b) {
            const statusB = await b.getStatusAsync();
            if (statusB.isLoaded) {
              const pos = statusB.positionMillis % loopDuration;
              const distToEnd = loopDuration - pos;
              if (distToEnd < CROSSFADE_DURATION) {
                b.setVolumeAsync(vol * (distToEnd / CROSSFADE_DURATION)).catch(() => {});
              } else if (pos < CROSSFADE_DURATION) {
                b.setVolumeAsync(vol * (pos / CROSSFADE_DURATION)).catch(() => {});
              } else {
                b.setVolumeAsync(vol).catch(() => {});
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

    // Countdown
    timerInterval.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (!finished.current) {
            finished.current = true;
            playAsset(chimeSound, 0.5);
            // Fade out ambient sound
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
          }
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

  return (
    <View style={styles.container}>
      <BreathCircle
        phase={ready ? currentPhase.phase : 'ready'}
        phaseDuration={ready ? currentPhase.duration : READY_DELAY}
        seconds={ready ? seconds : prefs.duration || 30}
        hideTimer={prefs.hideTimer}
        breathWord={ready ? currentPhase.label : String(countdown)}
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
});
