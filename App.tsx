import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
// NOTE: ReduceMotion.Never is applied per-animation instead of using
// ReducedMotionConfig wrapper (which crashes in Hermes Release builds)
import { BackgroundOrbs } from './src/components/BackgroundOrbs';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { StartScreen } from './src/screens/StartScreen';
import { BreathScreen } from './src/screens/BreathScreen';
import { DoneScreen } from './src/screens/DoneScreen';
import { UnlockScreen } from './src/screens/UnlockScreen';
import { ReminderScreen, scheduleDailyReminder } from './src/screens/ReminderScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { AfterglowScreen } from './src/screens/AfterglowScreen';
import { recordSession, getPrefs, setPrefs as savePrefs, getStreak, Prefs } from './src/utils/storage';
import { DEFAULT_BREATH_PATTERN } from './src/data/breathingPatterns';
import { useStreakProtection } from './src/hooks/useStreakProtection';
import { updateWidget } from './src/utils/widget';
import { colors } from './src/theme';

LogBox.ignoreAllLogs();
SplashScreen.preventAutoHideAsync();

type Screen = 'onboarding' | 'start' | 'breath' | 'afterglow' | 'done' | 'reminder' | 'unlock' | 'history';

const REMINDER_HOURS: Record<string, number> = { morning: 8, afternoon: 13, evening: 20 };

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'ready'>('ready');
  const [phaseDuration, setPhaseDuration] = useState(3000);
  const [phaseCounter, setPhaseCounter] = useState(0);
  const [prefs, setLocalPrefs] = useState<Prefs>({
    ambientSound: 'rain',
    hideTimer: false,
    haptics: true,
    duration: 30,
    breathPattern: DEFAULT_BREATH_PATTERN,
    reminderTime: 'off',
    onboardingSeen: false,
  });
  const [firstSession, setFirstSession] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const { refreshStreakProtection } = useStreakProtection();
  const splashHidden = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif: require('./assets/fonts/InstrumentSerif-Regular.ttf'),
    DMSans: require('./assets/fonts/DMSans-Regular.ttf'),
    DMSans_500Medium: require('./assets/fonts/DMSans-Medium.ttf'),
  });

  // Mark app as ready when fonts load or fail
  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  // Absolute safety net: force ready after 3 seconds no matter what
  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Hide splash screen whenever app becomes ready
  const hideSplash = useCallback(async () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    try { await SplashScreen.hideAsync(); } catch {}
  }, []);

  useEffect(() => {
    if (appReady) hideSplash();
  }, [appReady, hideSplash]);

  useEffect(() => {
    (async () => {
      const p = await getPrefs();
      setLocalPrefs(p);
      // Always show onboarding intro on app open
      setScreen('onboarding');
      if (p.reminderTime !== 'off') {
        setFirstSession(false);
        // Re-schedule notification with current streak on each app launch
        const hour = REMINDER_HOURS[p.reminderTime];
        if (hour) {
          const streak = await getStreak();
          scheduleDailyReminder(hour, streak);
        }
      }
      await refreshStreakProtection();
    })();
  }, [refreshStreakProtection]);

  useEffect(() => {
    if (screen !== 'breath') {
      setBreathPhase('ready');
      setPhaseDuration(3000);
    }
  }, [screen]);

  // Don't block render — show the app even if fonts failed
  if (!appReady) return null;

  const handleOnboardingComplete = async () => {
    const updated = { ...prefs, onboardingSeen: true };
    setLocalPrefs(updated);
    await savePrefs(updated);
    setScreen('start');
  };

  const handleBegin = (p: Prefs) => {
    setLocalPrefs(p);
    setScreen('breath');
  };

  const handleFinish = async () => {
    await recordSession(prefs.duration);
    const streak = await getStreak();
    await updateWidget(streak);
    if (prefs.reminderTime !== 'off') {
      const hour = REMINDER_HOURS[prefs.reminderTime];
      if (hour) {
        await scheduleDailyReminder(hour, streak);
      }
    }
    await refreshStreakProtection();
    setScreen('afterglow');
  };

  const handleAgain = () => {
    setScreen('start');
  };

  const handleUnlocked = () => {
    setScreen('start');
  };

  return (
    
    <View style={styles.container} onLayout={hideSplash}>
      <StatusBar style="light" />
      <BackgroundOrbs />

      {screen === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {screen === 'start' && (
        <StartScreen
          onBegin={handleBegin}
          onUnlock={() => setScreen('unlock')}
          onHistory={() => setScreen('history')}
        />
      )}
      {screen === 'breath' && (
        <BreathScreen
          prefs={prefs}
          onFinish={handleFinish}
          onVisualStateChange={(phase, duration, idx) => {
            setBreathPhase(phase);
            setPhaseDuration(duration);
            setPhaseCounter(idx);
          }}
        />
      )}
      {screen === 'afterglow' && (
        <AfterglowScreen
          duration={prefs.duration}
          onComplete={() => setScreen('done')}
        />
      )}
      {screen === 'done' && (
        <DoneScreen
          duration={prefs.duration}
          onAgain={handleAgain}
          onUnlock={() => setScreen('unlock')}
        />
      )}
      {screen === 'reminder' && (
        <ReminderScreen onDone={() => setScreen('start')} />
      )}
      {screen === 'history' && (
        <HistoryScreen onBack={() => setScreen('start')} />
      )}
      {screen === 'unlock' && (
        <UnlockScreen
          onBack={() => setScreen('start')}
          onUnlocked={handleUnlocked}
        />
      )}
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg1,
  },
});
