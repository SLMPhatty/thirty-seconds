import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BackgroundOrbs } from './src/components/BackgroundOrbs';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { StartScreen } from './src/screens/StartScreen';
import { BreathScreen } from './src/screens/BreathScreen';
import { DoneScreen } from './src/screens/DoneScreen';
import { UnlockScreen } from './src/screens/UnlockScreen';
import { ReminderScreen } from './src/screens/ReminderScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { AfterglowScreen } from './src/screens/AfterglowScreen';
import { recordSession, getPrefs, setPrefs as savePrefs, Prefs } from './src/utils/storage';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

type Screen = 'onboarding' | 'start' | 'breath' | 'afterglow' | 'done' | 'reminder' | 'unlock' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [prefs, setLocalPrefs] = useState<Prefs>({
    ambientSound: 'rain',
    hideTimer: false,
    haptics: true,
    duration: 30,
    reminderTime: 'off',
    onboardingSeen: false,
  });
  const [firstSession, setFirstSession] = useState(true);

  const [fontsLoaded] = useFonts({
    InstrumentSerif: require('./assets/fonts/InstrumentSerif-Regular.ttf'),
    DMSans: require('./assets/fonts/DMSans-Regular.ttf'),
    DMSans_500Medium: require('./assets/fonts/DMSans-Medium.ttf'),
  });

  useEffect(() => {
    (async () => {
      const p = await getPrefs();
      setLocalPrefs(p);
      if (!p.onboardingSeen) {
        setScreen('onboarding');
      }
      if (p.reminderTime !== 'off') {
        setFirstSession(false);
      }
    })();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
    setScreen('afterglow');
  };

  const handleAgain = () => {
    setScreen('start');
  };

  const handleUnlocked = () => {
    setScreen('start');
  };

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <BackgroundOrbs breathing={screen === 'breath'} />

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
        <BreathScreen prefs={prefs} onFinish={handleFinish} />
      )}
      {screen === 'afterglow' && (
        <AfterglowScreen onComplete={() => setScreen('done')} />
      )}
      {screen === 'done' && (
        <DoneScreen
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
