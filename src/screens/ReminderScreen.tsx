import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '../theme';
import { getPrefs, setPrefs } from '../utils/storage';

interface Props {
  onDone: () => void;
}

const options = [
  { label: 'morning', hour: 8 },
  { label: 'afternoon', hour: 13 },
  { label: 'evening', hour: 20 },
  { label: 'no thanks', hour: -1 },
] as const;

async function scheduleDailyReminder(hour: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (hour < 0) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'thirty',
      body: 'your 30 seconds of stillness awaits.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

export function ReminderScreen({ onDone }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = async (label: string, hour: number) => {
    setSelected(label);
    const time = hour < 0 ? 'off' : label;
    await scheduleDailyReminder(hour);
    const prefs = await getPrefs();
    await setPrefs({ ...prefs, reminderTime: time as any });
    setTimeout(onDone, 400);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>remind me daily</Text>
      <Text style={styles.subtitle}>a gentle nudge to take 30 seconds</Text>

      <View style={styles.options}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.optBtn, selected === opt.label && styles.optBtnActive]}
            onPress={() => handleSelect(opt.label, opt.hour)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optText, selected === opt.label && styles.optTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 15,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 48,
  },
  options: {
    gap: 12,
    width: '100%',
    maxWidth: 240,
  },
  optBtn: {
    paddingVertical: 14,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  optBtnActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSurface,
  },
  optText: {
    fontFamily: 'DMSans',
    fontSize: 16,
    color: colors.text,
  },
  optTextActive: {
    color: colors.accent,
  },
});
