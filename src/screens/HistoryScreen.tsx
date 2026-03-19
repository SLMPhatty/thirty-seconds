import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { getSessionStats, SessionStats } from '../utils/storage';

interface Props {
  onBack: () => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HistoryScreen({ onBack }: Props) {
  const [stats, setStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    getSessionStats().then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>your practice</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>this week</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.longestStreak}</Text>
          <Text style={styles.statLabel}>best streak</Text>
        </View>
      </View>

      <Text style={styles.weekTitle}>this week</Text>
      <View style={styles.weekRow}>
        {stats.weekDays.map((practiced, i) => (
          <View key={i} style={styles.dayCol}>
            <View style={[styles.dayDot, practiced && styles.dayDotActive]} />
            <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backText}>back</Text>
      </TouchableOpacity>
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
    fontSize: 36,
    color: colors.text,
    marginBottom: 48,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 56,
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'InstrumentSerif',
    fontSize: 40,
    color: colors.warm,
    lineHeight: 44,
  },
  statLabel: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 4,
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  weekTitle: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.textDim,
    marginBottom: 16,
    letterSpacing: 1,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 56,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dayDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: colors.textFaint,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(232, 228, 223, 0.04)',
  },
  backText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'DMSans',
  },
});
