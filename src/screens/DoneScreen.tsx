import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';
import { getQuote } from '../utils/quotes';
import { getData, isUnlocked as checkUnlocked, getMilestoneMessage, getFreeSessions, getPrefs, MILESTONES } from '../utils/storage';

interface Props {
  onAgain: () => void;
  onUnlock: () => void;
}

async function celebrationHaptic() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await new Promise((r) => setTimeout(r, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise((r) => setTimeout(r, 110));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function DoneScreen({ onAgain, onUnlock }: Props) {
  const [quote, setQuote] = useState('');
  const [streak, setStreak] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState(0);
  useEffect(() => {
    (async () => {
      const d = await getData();
      const p = await getPrefs();
      setQuote(getQuote(d.totalSessions));
      setStreak(d.streak);
      setUnlocked(await checkUnlocked());
      const msg = getMilestoneMessage(d.streak);
      setMilestone(msg);
      setFreeLeft(await getFreeSessions());

      // Celebration haptic on milestone
      if (MILESTONES.includes(d.streak)) {
        celebrationHaptic();
      }
    })();
  }, []);

  const handleShare = async () => {
    const msg = milestone
      ? `${streak} days of stillness. ${milestone} #thirty`
      : `I just took 30 seconds for myself. #thirty`;
    await Share.share({ message: msg });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.doneWord}>still.</Text>
      <Text style={styles.quote}>{quote}</Text>

      <View style={styles.streakWrap}>
        <Text style={[styles.streakNum, milestone && styles.streakNumMilestone]}>{streak}</Text>
        {milestone ? (
          <>
            <Animated.Text entering={FadeIn.duration(800)} style={styles.milestoneText}>
              milestone reached
            </Animated.Text>
            <Animated.Text entering={FadeIn.duration(900)} style={styles.milestoneSubtext}>
              {milestone}
            </Animated.Text>
          </>
        ) : (
          <Text style={styles.streakLabel}>day streak</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.againBtn} onPress={onAgain} activeOpacity={0.7}>
          <Text style={styles.againText}>once more</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareText}>share</Text>
        </TouchableOpacity>
      </View>

      {!unlocked && (
        <Text style={styles.supportLink}>
          {freeLeft > 0 ? (
            <Text style={styles.freeCount}>
              {freeLeft} free session{freeLeft !== 1 ? 's' : ''} left {' · '}
            </Text>
          ) : (
            <Text style={styles.freeCount}>no free sessions left {' · '}</Text>
          )}
          <Text style={styles.supportLinkText} onPress={onUnlock}>
            unlock unlimited — $4.99
          </Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  doneWord: {
    fontFamily: 'InstrumentSerif',
    fontSize: 48,
    color: colors.text,
    marginBottom: 12,
  },
  quote: {
    fontSize: 16,
    color: colors.textDim,
    fontFamily: 'DMSans',
    marginBottom: 48,
    textAlign: 'center',
  },
  streakWrap: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 48,
  },
  streakNum: {
    fontFamily: 'InstrumentSerif',
    fontSize: 64,
    color: colors.warm,
    lineHeight: 64,
  },
  streakLabel: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  healthKitNote: {
    fontSize: 12,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    marginBottom: 24,
  },
  streakNumMilestone: {
    fontSize: 80,
    color: colors.accent,
  },
  milestoneText: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: 'DMSans_500Medium',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  milestoneSubtext: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: 'DMSans',
    textAlign: 'center',
    opacity: 0.88,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  againBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(232, 228, 223, 0.04)',
  },
  againText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'DMSans',
  },
  shareBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(232, 228, 223, 0.04)',
  },
  shareText: {
    fontSize: 15,
    color: colors.textDim,
    fontFamily: 'DMSans',
  },
  supportLink: {
    marginTop: 40,
    textAlign: 'center',
  },
  freeCount: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
  },
  supportLinkText: {
    fontSize: 13,
    color: colors.warm,
    fontFamily: 'DMSans',
  },
});
