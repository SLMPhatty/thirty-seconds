import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState, Linking, Alert } from 'react-native';
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
import { ChallengeScreen } from './src/screens/ChallengeScreen';
import { ChallengeDetail } from './src/screens/ChallengeDetail';
import { recordSession, getPrefs, setPrefs as savePrefs, getStreak, getData, Prefs, unlock as unlockStorage, isUnlocked as checkUnlocked } from './src/utils/storage';
import * as StoreReview from 'expo-store-review';
import { DEFAULT_BREATH_PATTERN } from './src/data/breathingPatterns';
import { useStreakProtection } from './src/hooks/useStreakProtection';
import { updateWidget } from './src/utils/widget';
import { colors } from './src/theme';
import {
  recordChallengeCompletions,
  handleIncomingChallengeEntry,
  loadActiveChallenges,
  refreshChallengeNudge,
  subscribeToAllChallenges,
  wipeLegacyCirclesOnce,
} from './src/services/challengeSync';
import {
  acceptPendingShare,
  acceptShare,
  addCloudKitShareInviteListener,
  addEntryListener,
  addMembershipListener,
  consumePendingAcceptedShare,
  consumePendingInviteShareURL,
  getDisplayName,
  hasPendingShareInvite,
  isCloudKitAvailable,
  registerForPushNotifications,
} from './src/services/cloudkit';

LogBox.ignoreAllLogs();
SplashScreen.preventAutoHideAsync();

type Screen =
  | 'onboarding'
  | 'start'
  | 'breath'
  | 'afterglow'
  | 'done'
  | 'reminder'
  | 'unlock'
  | 'history'
  | 'challenge'
  | 'challengeDetail';

interface ChallengeSelection {
  zoneName: string;
  ownerName: string;
}

const REMINDER_HOURS: Record<string, number> = { morning: 8, afternoon: 13, evening: 20 };

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'ready'>('ready');
  const [phaseDuration, setPhaseDuration] = useState(3000);
  const [phaseCounter, setPhaseCounter] = useState(0);
  const [prefs, setLocalPrefs] = useState<Prefs>({
    ambientSound: 'rain',
    hideTimer: true,
    haptics: true,
    duration: 30,
    breathPattern: DEFAULT_BREATH_PATTERN,
    reminderTime: 'off',
    onboardingSeen: false,
  });
  const [firstSession, setFirstSession] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeSelection | null>(null);
  const { refreshStreakProtection } = useStreakProtection();
  const splashHidden = useRef(false);
  const displayNameRef = useRef<string | null>(null);
  const pendingInviteUrlRef = useRef<string | null>(null);

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

  const acceptPaidChallengeInvite = useCallback(async (shareURL: string) => {
    if (!isCloudKitAvailable()) return;
    // Empty shareURL means accept via stashed CKShare.Metadata (share.url often nil).
    if (!(await checkUnlocked())) {
      pendingInviteUrlRef.current = shareURL;
      Alert.alert(
        'unlock to join',
        'group challenges are for paid members. unlock thirty to accept this invite.'
      );
      setScreen('unlock');
      return;
    }
    if (shareURL) {
      await acceptShare(shareURL);
    } else {
      await acceptPendingShare();
    }
    pendingInviteUrlRef.current = null;
    setScreen('challenge');
    refreshChallengeNudge().catch(() => {});
  }, []);

  useEffect(() => {
    if (appReady) hideSplash();
  }, [appReady, hideSplash]);

  useEffect(() => {
    (async () => {
      const p = await getPrefs();
      setLocalPrefs(p);
      setScreen(p.onboardingSeen ? 'start' : 'onboarding');
      if (p.reminderTime !== 'off') {
        setFirstSession(false);
        // Re-schedule generic daily reminder on each app launch
        const hour = REMINDER_HOURS[p.reminderTime];
        if (hour) {
          scheduleDailyReminder(hour);
        }
      }
      await refreshStreakProtection();

      if (isCloudKitAvailable()) {
        try {
          await registerForPushNotifications();
          displayNameRef.current = await getDisplayName();
          await wipeLegacyCirclesOnce();
          const acceptedShare = await consumePendingAcceptedShare();
          if (acceptedShare) {
            setScreen('challenge');
          }
          const pendingInviteShareURL = await consumePendingInviteShareURL();
          const hasPendingInvite = await hasPendingShareInvite();
          if (pendingInviteShareURL) {
            acceptPaidChallengeInvite(pendingInviteShareURL).catch(() => {
              Alert.alert('could not join', 'try opening the invite again');
            });
          } else if (hasPendingInvite) {
            acceptPaidChallengeInvite('').catch(() => {
              Alert.alert('could not join', 'try opening the invite again');
            });
          }
          const challenges = await loadActiveChallenges();
          subscribeToAllChallenges(challenges).catch(() => {});
          refreshChallengeNudge().catch(() => {});
        } catch {
          // CloudKit unavailable (no iCloud account, etc.) — feature degrades silently
        }
      }
    })();
  }, [refreshStreakProtection, acceptPaidChallengeInvite]);

  // CloudKit entry events → fire local notification (Yoda copy in challengeSync)
  useEffect(() => {
    const remove = addEntryListener(({ zoneName, ownerName }) => {
      if (zoneName && ownerName) {
        handleIncomingChallengeEntry(zoneName, ownerName).catch(() => {});
      } else {
        // Unknown payload shape — sweep all active challenges
        loadActiveChallenges()
          .then((cs) =>
            cs.forEach((c) =>
              handleIncomingChallengeEntry(c.zoneName, c.ownerName).catch(() => {})
            )
          )
          .catch(() => {});
      }
    });
    return remove;
  }, []);

  // Refresh on foreground so we catch entries that landed while closed
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !isCloudKitAvailable()) return;
      try {
        const challenges = await loadActiveChallenges();
        for (const c of challenges) {
          handleIncomingChallengeEntry(c.zoneName, c.ownerName).catch(() => {});
        }
      } catch {
        // ignore
      }
    });
    return () => sub.remove();
  }, []);

  // Gate CloudKit share acceptance behind the lifetime unlock. The native
  // AppDelegate opens the app from the Apple share link, but intentionally does
  // not call CKAcceptSharesOperation until JS confirms the purchase state.
  useEffect(() => {
    const remove = addCloudKitShareInviteListener(({ shareURL }) => {
      // Fire even when shareURL is missing — metadata was stashed natively.
      acceptPaidChallengeInvite(shareURL ?? '').catch(() => {
        Alert.alert('could not join', 'try opening the invite again');
      });
    });
    return remove;
  }, [acceptPaidChallengeInvite]);

  // System CloudKit sharing accepts do not arrive as normal Linking URLs.
  // iOS calls AppDelegate.userDidAcceptCloudKitShareWith; the native module
  // accepts the share and emits this event so the app can show the challenge list.
  useEffect(() => {
    const remove = addMembershipListener(() => {
      setScreen('challenge');
      refreshChallengeNudge().catch(() => {});
    });
    return remove;
  }, []);

  // Handle CloudKit share URLs (universal links)
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !isCloudKitAvailable()) return;
      if (!url.includes('icloud.com/share')) return;
      try {
        await acceptPaidChallengeInvite(url);
      } catch {
        Alert.alert('could not join', 'try opening the invite again');
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [acceptPaidChallengeInvite]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const RNIap = require('react-native-iap');
        await RNIap.initConnection();
        const purchases = await RNIap.getAvailablePurchases();
        const hasLifetimeUnlock = purchases.some(
          (purchase: { productId?: string }) => purchase.productId === 'thirty.lifetime.unlock'
        );

        if (active && hasLifetimeUnlock) {
          await unlockStorage();
          // Silent restore can finish after cold-start invite handling ran while locked.
          // Re-check pending invite so join proceeds without visiting UnlockScreen.
          if (isCloudKitAvailable()) {
            try {
              let pendingUrl = pendingInviteUrlRef.current;
              if (pendingUrl === null || pendingUrl.length === 0) {
                const stored = await consumePendingInviteShareURL();
                if (stored && stored.length > 0) pendingUrl = stored;
              }
              const hasPendingInvite = await hasPendingShareInvite();
              if (pendingUrl !== null || hasPendingInvite) {
                await acceptPaidChallengeInvite(pendingUrl ?? '');
              }
            } catch {
              // Invite accept can retry when user opens Circles / re-taps link.
            }
          }
        }
      } catch {
        // react-native-iap not available (e.g. Expo Go / development)
      } finally {
        try {
          const RNIap = require('react-native-iap');
          RNIap.endConnection();
        } catch {
          // ignore
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [acceptPaidChallengeInvite]);

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
        await scheduleDailyReminder(hour);
      }
    }
    await refreshStreakProtection();

    if (isCloudKitAvailable()) {
      const name = displayNameRef.current || (await getDisplayName());
      if (name && name.trim().length > 0) {
        recordChallengeCompletions(name).catch(() => {});
      }
      refreshChallengeNudge().catch(() => {});
    }

    // Prompt for App Store review after 5th, 10th, and 15th session
    const d = await getData();
    if ([5, 10, 15].includes(d.totalSessions)) {
      try {
        if (await StoreReview.isAvailableAsync()) {
          // Small delay so the afterglow screen loads first
          setTimeout(() => StoreReview.requestReview(), 2000);
        }
      } catch {}
    }

    setScreen('afterglow');
  };

  const handleAgain = () => {
    setScreen('start');
  };

  const handleUnlocked = async () => {
    // After IAP unlock/restore, always attempt pending Circle accept — not only when
    // pendingInviteUrlRef is set. Process death can clear the ref while native archive
    // / flag / URL still indicate a pending invite.
    try {
      // null = no JS-known pending; '' = metadata-only pending (share.url was nil).
      let url: string | null = pendingInviteUrlRef.current;
      let hasPendingInvite = false;
      if (isCloudKitAvailable()) {
        // Prefer a concrete URL for acceptShare; otherwise acceptPendingShare uses archive.
        if (url === null || url.length === 0) {
          const stored = await consumePendingInviteShareURL();
          if (stored && stored.length > 0) {
            url = stored;
          }
        }
        hasPendingInvite = await hasPendingShareInvite();
      }

      const shouldAccept = url !== null || hasPendingInvite;
      if (shouldAccept) {
        await acceptPaidChallengeInvite(url ?? '');
        return;
      }
    } catch {
      Alert.alert('could not join', 'try opening the invite again');
      setScreen('start');
      return;
    }
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
          onChallenge={() => setScreen('challenge')}
        />
      )}
      {screen === 'challenge' && (
        <ChallengeScreen
          onBack={() => setScreen('start')}
          onOpenChallenge={(zoneName, ownerName) => {
            setSelectedChallenge({ zoneName, ownerName });
            setScreen('challengeDetail');
          }}
        />
      )}
      {screen === 'challengeDetail' && selectedChallenge && (
        <ChallengeDetail
          zoneName={selectedChallenge.zoneName}
          ownerName={selectedChallenge.ownerName}
          onBack={() => {
            setSelectedChallenge(null);
            setScreen('challenge');
          }}
          onLeft={() => {
            setSelectedChallenge(null);
            setScreen('challenge');
          }}
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
          onChallenge={() => setScreen('challenge')}
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
