import { useEffect } from 'react';
import { startBreathSwell, stopBreathSwell } from '../../modules/thirty-haptics/src';

/**
 * Continuous Core Haptics swell, locked to the breath phase.
 * If the native engine is missing (simulator, haptics off), the visual still moves.
 */
export function useBreathHaptics(
  enabled: boolean,
  ready: boolean,
  phase: string,
  durationMs: number
) {
  useEffect(() => {
    if (!enabled || !ready) {
      stopBreathSwell();
      return;
    }
    startBreathSwell(phase, durationMs);
    return () => {
      stopBreathSwell();
    };
  }, [enabled, ready, phase, durationMs]);
}
