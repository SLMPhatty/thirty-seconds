import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const HEALTHKIT_STATUS_KEY = 'thirty-healthkit-status';

type HealthKitStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

type AppleHealthKitModule = {
  Constants?: {
    Permissions?: {
      MindfulSession?: string;
    };
  };
  initHealthKit?: (permissions: object, callback: (error?: unknown) => void) => void;
  saveMindfulSession?: (
    input: { startDate: string; endDate: string },
    callback: (error?: unknown, result?: unknown) => void
  ) => void;
};

function getHealthKitModule(): AppleHealthKitModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const nativeModule = NativeModules.AppleHealthKit as AppleHealthKitModule | undefined;
  if (nativeModule?.initHealthKit && nativeModule?.saveMindfulSession) {
    return nativeModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const required = require('react-native-health');
    return (required.default || required) as AppleHealthKitModule;
  } catch {
    return null;
  }
}

async function getStoredStatus(): Promise<HealthKitStatus> {
  const stored = await AsyncStorage.getItem(HEALTHKIT_STATUS_KEY);
  if (stored === 'granted' || stored === 'denied' || stored === 'unavailable') {
    return stored;
  }
  return 'unknown';
}

async function setStoredStatus(status: HealthKitStatus): Promise<void> {
  await AsyncStorage.setItem(HEALTHKIT_STATUS_KEY, status);
}

export async function requestHealthKitAuth(): Promise<boolean> {
  const module = getHealthKitModule();
  if (!module?.initHealthKit) {
    await setStoredStatus('unavailable');
    return false;
  }

  const mindfulPermission =
    module.Constants?.Permissions?.MindfulSession ?? 'MindfulSession';

  return new Promise((resolve) => {
    module.initHealthKit?.(
      {
        permissions: {
          read: [],
          write: [mindfulPermission],
        },
      },
      async (error?: unknown) => {
        const granted = !error;
        await setStoredStatus(granted ? 'granted' : 'denied');
        resolve(granted);
      }
    );
  });
}

export async function logMindfulMinutes(durationSeconds: number): Promise<void> {
  const module = getHealthKitModule();
  if (!module?.saveMindfulSession) {
    await setStoredStatus('unavailable');
    return;
  }

  let status = await getStoredStatus();
  if (status === 'unavailable' || status === 'denied') {
    return;
  }

  if (status === 'unknown') {
    const granted = await requestHealthKitAuth();
    if (!granted) {
      return;
    }
    status = 'granted';
  }

  if (status !== 'granted') {
    return;
  }

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - durationSeconds * 1000);

  await new Promise<void>((resolve) => {
    module.saveMindfulSession?.(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      async (error?: unknown) => {
        if (error) {
          console.warn('[HealthKit] Failed to save mindful session', error);
        }
        resolve();
      }
    );
  });
}
