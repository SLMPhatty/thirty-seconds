import { useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { getStreak, hasPracticedToday } from '../utils/storage';

const STREAK_PROTECTION_KIND = 'streak-protection';
const STREAK_PROTECTION_HOUR = 18;

async function cancelStreakProtectionNotification() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.kind === STREAK_PROTECTION_KIND)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function refreshStreakProtectionNotification(): Promise<void> {
  await cancelStreakProtectionNotification();

  const [streak, practicedToday] = await Promise.all([
    getStreak(),
    hasPracticedToday(),
  ]);

  if (streak <= 0 || practicedToday) {
    return;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'thirty',
      body: `Dont break your ${streak}-day streak 🔥`,
      sound: true,
      data: { kind: STREAK_PROTECTION_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: STREAK_PROTECTION_HOUR,
      minute: 0,
    },
  });
}

export function useStreakProtection() {
  const refresh = useCallback(async () => {
    await refreshStreakProtectionNotification();
  }, []);

  return { refreshStreakProtection: refresh };
}
