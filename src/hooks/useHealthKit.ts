import { useCallback } from 'react';
import { logMindfulMinutes } from '../utils/healthkit';

export function useHealthKit() {
  const logSessionToHealthKit = useCallback(async (durationSeconds: number) => {
    await logMindfulMinutes(durationSeconds);
  }, []);

  return { logSessionToHealthKit };
}
