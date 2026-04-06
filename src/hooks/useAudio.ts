import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { useRef, useCallback } from 'react';

export function useAudio() {
  const soundsRef = useRef<AudioPlayer[]>([]);

  const configureAudioMode = useCallback(async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: 'mixWithOthers',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      // silently fail — audio is optional
    }
  }, []);

  const playAsset = useCallback(async (asset: AudioSource, volume = 1.0) => {
    try {
      await configureAudioMode();
      const sound = createAudioPlayer(asset, {
        keepAudioSessionActive: true,
        updateInterval: 100,
      });
      sound.volume = volume;
      soundsRef.current.push(sound);
      const subscription = sound.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          subscription.remove();
          sound.remove();
          soundsRef.current = soundsRef.current.filter((s) => s !== sound);
        }
      });
      sound.play();
    } catch (e) {
      // silently fail — audio is optional
    }
  }, [configureAudioMode]);

  const playLoop = useCallback(async (asset: AudioSource, volume = 1.0): Promise<AudioPlayer | null> => {
    try {
      await configureAudioMode();
      const sound = createAudioPlayer(asset, {
        keepAudioSessionActive: true,
        updateInterval: 100,
      });
      sound.volume = volume;
      sound.loop = true;
      soundsRef.current.push(sound);
      sound.play();
      return sound;
    } catch {
      return null;
    }
  }, [configureAudioMode]);

  const stopAll = useCallback(async () => {
    const sounds = [...soundsRef.current];
    soundsRef.current = [];
    for (const s of sounds) {
      try {
        s.pause();
        s.remove();
      } catch {}
    }
  }, []);

  return { playAsset, playLoop, stopAll };
}
