import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  Share,
  Alert,
} from 'react-native';
import { colors } from '../theme';
import {
  loadActiveChallenges,
  loadChallengeStatus,
  setMuted as setMutedStore,
  MAX_MEMBERS,
  type ChallengeStatus,
} from '../services/challengeSync';
import { getShareURL, leaveChallenge } from '../services/cloudkit';

interface Props {
  zoneName: string;
  ownerName: string;
  onBack: () => void;
  onLeft: () => void;
}

function daysAgo(created: number): string {
  const days = Math.max(0, Math.floor((Date.now() / 1000 - created) / 86400));
  if (days === 0) return 'started today';
  if (days === 1) return 'started 1 day ago';
  return `started ${days} days ago`;
}

export function ChallengeDetail({ zoneName, ownerName, onBack, onLeft }: Props) {
  const [status, setStatus] = useState<ChallengeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await loadActiveChallenges();
      const found = all.find(
        (c) => c.zoneName === zoneName && c.ownerName === ownerName
      );
      if (!found) {
        onBack();
        return;
      }
      const s = await loadChallengeStatus(found);
      setStatus(s);
      setMuted(s.muted);
    } finally {
      setLoading(false);
    }
  }, [zoneName, ownerName, onBack]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleInvite = async () => {
    if (!status) return;
    const url = await getShareURL(zoneName, ownerName);
    if (!url) {
      Alert.alert('cannot reshare', 'unable to fetch the invite link right now');
      return;
    }
    try {
      await Share.share({
        message: `sit with me. 30 seconds. ${url}`,
        url,
      });
    } catch {
      // user dismissed
    }
  };

  const handleLeave = () => {
    Alert.alert(
      status?.challenge.isOwner ? 'delete circle?' : 'leave circle?',
      status?.challenge.isOwner
        ? 'this will remove the circle for everyone.'
        : 'you can rejoin if invited again.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: status?.challenge.isOwner ? 'delete' : 'leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveChallenge(zoneName, ownerName);
              onLeft();
            } catch (e: any) {
              Alert.alert('could not leave', e?.message ?? 'try again');
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  const toggleMute = async (v: boolean) => {
    setMuted(v);
    await setMutedStore(zoneName, v);
  };

  if (loading || !status) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.textFaint} style={{ marginTop: 100 }} />
      </View>
    );
  }

  const canInvite = status.members.length < MAX_MEMBERS;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} numberOfLines={2}>
          {status.challenge.name}
        </Text>
        <Text style={styles.sub}>{daysAgo(status.challenge.createdAt)}</Text>

        <View style={styles.members}>
          {status.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.memberName}>
                {m.isSelf ? `${m.name} (you)` : m.name}
              </Text>
            </View>
          ))}
        </View>

        {canInvite && status.members.length < 8 && (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={handleInvite}
            activeOpacity={0.7}
          >
            <Text style={styles.inviteText}>invite someone</Text>
          </TouchableOpacity>
        )}

        <View style={styles.muteRow}>
          <Text style={styles.muteLabel}>notifications</Text>
          <Switch
            value={!muted}
            onValueChange={(v) => toggleMute(!v)}
            trackColor={{ false: colors.borderFaint, true: colors.accentBorder }}
            thumbColor={muted ? colors.textFaint : colors.accent}
          />
        </View>

        <TouchableOpacity
          onPress={handleLeave}
          disabled={leaving}
          style={styles.leaveBtn}
        >
          <Text style={styles.leaveText}>
            {status.challenge.isOwner ? 'delete circle' : 'leave circle'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.textFaint,
    marginBottom: 32,
  },
  members: {
    width: '100%',
    marginBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  memberDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  memberName: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 15,
    color: colors.text,
  },
  check: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.accent,
  },
  streakRow: {
    marginBottom: 24,
  },
  streakNum: {
    fontFamily: 'InstrumentSerif',
    fontSize: 18,
    color: colors.warm,
  },
  inviteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 24,
  },
  inviteText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.text,
  },
  muteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderFaint,
    marginBottom: 32,
  },
  muteLabel: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.text,
  },
  leaveBtn: {
    paddingVertical: 10,
  },
  leaveText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.textFaint,
    textDecorationLine: 'underline',
  },
  backBtn: {
    marginTop: 24,
    paddingVertical: 8,
  },
  backText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.textFaint,
    textDecorationLine: 'underline',
  },
});
