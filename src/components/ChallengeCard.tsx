import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import type { ChallengeStatus } from '../services/challengeSync';

interface Props {
  status: ChallengeStatus;
  onPress: () => void;
}

export function ChallengeCard({ status, onPress }: Props) {
  const { challenge, members, completionsToday } = status;
  const completed = new Set(completionsToday.map((c) => c.memberId)).size;
  const total = members.length || 1;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {challenge.name}
        </Text>
        <Text style={styles.sub}>
          {completed === 0 ? 'quiet today' : completed === 1 ? '1 sat today' : `${completed} sat today`}
        </Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  left: {
    flex: 1,
  },
  name: {
    fontFamily: 'InstrumentSerif',
    fontSize: 20,
    color: colors.text,
    marginBottom: 2,
  },
  sub: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: colors.textFaint,
  },
  chev: {
    fontFamily: 'InstrumentSerif',
    fontSize: 24,
    color: colors.textFaint,
  },
});
