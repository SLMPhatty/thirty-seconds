import { requireNativeModule } from 'expo-modules-core';

interface ThirtyHapticsModule {
  isAvailable(): Promise<boolean>;
  startSwell(phase: string, durationMs: number): Promise<void>;
  stop(): Promise<void>;
}

let native: ThirtyHapticsModule | null = null;
try {
  native = requireNativeModule<ThirtyHapticsModule>('ThirtyHaptics');
} catch {
  native = null;
}

export async function isBreathHapticsAvailable(): Promise<boolean> {
  try {
    return native ? await native.isAvailable() : false;
  } catch {
    return false;
  }
}

export async function startBreathSwell(phase: string, durationMs: number): Promise<void> {
  if (!native) return;
  try {
    await native.startSwell(phase, durationMs);
  } catch {
    // visual still moves
  }
}

export async function stopBreathSwell(): Promise<void> {
  if (!native) return;
  try {
    await native.stop();
  } catch {
    // ignore
  }
}
