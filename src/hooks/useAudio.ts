import { Audio } from 'expo-av';
import { useRef, useCallback } from 'react';

export function useAudio() {
  const soundsRef = useRef<Audio.Sound[]>([]);

  const playAsset = useCallback(async (asset: any, volume = 1.0) => {
    try {
      const { sound } = await Audio.Sound.createAsync(asset, { volume });
      soundsRef.current.push(sound);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundsRef.current = soundsRef.current.filter((s) => s !== sound);
        }
      });
    } catch (e) {
      // silently fail — audio is optional
    }
  }, []);

  const playLoop = useCallback(async (asset: any, volume = 1.0): Promise<Audio.Sound | null> => {
    try {
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume,
        isLooping: true,
      });
      soundsRef.current.push(sound);
      await sound.playAsync();
      return sound;
    } catch {
      return null;
    }
  }, []);

  const stopAll = useCallback(async () => {
    const sounds = [...soundsRef.current];
    soundsRef.current = [];
    for (const s of sounds) {
      try {
        await s.stopAsync();
        await s.unloadAsync();
      } catch {}
    }
  }, []);

  return { playAsset, playLoop, stopAll };
}
