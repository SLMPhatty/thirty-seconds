import { useCallback } from 'react';
import { logMindfulMinutes } from '../utils/healthkit';

export function useHealthKit() {
  const logSessionToHealthKit = useCallback(async (durationSeconds: number) => {
    return logMindfulMinutes(durationSeconds);
  }, []);

  return { logSessionToHealthKit };
}
