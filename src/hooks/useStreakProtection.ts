import { useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { getData } from '../utils/storage';

const STREAK_PROTECTION_KIND = 'streak-protection';
const STREAK_PROTECTION_HOUR = 18;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function today(): string {
  return dateKey(new Date());
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

function nextStreakProtectionDate(): Date | null {
  const triggerDate = new Date();
  triggerDate.setHours(STREAK_PROTECTION_HOUR, 0, 0, 0);
  return triggerDate.getTime() > Date.now() ? triggerDate : null;
}

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

  const data = await getData();
  const practicedToday = data.lastDate === today();
  const hasActiveStreakToProtect = data.streak > 0 && data.lastDate === yesterday();

  if (!hasActiveStreakToProtect || practicedToday) {
    return;
  }

  const triggerDate = nextStreakProtectionDate();
  if (!triggerDate) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'thirty',
      body: `Don’t break your ${data.streak}-day streak 🔥`,
      sound: true,
      data: { kind: STREAK_PROTECTION_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export function useStreakProtection() {
  const refresh = useCallback(async () => {
    await refreshStreakProtectionNotification();
  }, []);

  return { refreshStreakProtection: refresh };
}
