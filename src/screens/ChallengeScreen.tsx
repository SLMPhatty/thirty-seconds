import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { colors } from '../theme';
import { Constellation } from '../components/Constellation';
import { ChallengeCard } from '../components/ChallengeCard';
import { DisplayNamePrompt } from '../components/DisplayNamePrompt';
import { ChallengeNamePrompt } from '../components/ChallengeNamePrompt';
import {
  loadActiveChallenges,
  loadChallengeStatus,
  MAX_ACTIVE_CHALLENGES,
  subscribeToAllChallenges,
  type ChallengeStatus,
} from '../services/challengeSync';
import {
  createChallenge,
  getDisplayName,
  isCloudKitAvailable,
} from '../services/cloudkit';

interface Props {
  onBack: () => void;
  onOpenChallenge: (zoneName: string, ownerName: string) => void;
}

export function ChallengeScreen({ onBack, onOpenChallenge }: Props) {
  const [statuses, setStatuses] = useState<ChallengeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [needsGroupName, setNeedsGroupName] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingCreatorName, setPendingCreatorName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isCloudKitAvailable()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await loadActiveChallenges();
      const detailed = await Promise.all(list.map(loadChallengeStatus));
      setStatuses(detailed);
      subscribeToAllChallenges(list).catch(() => {});
    } catch (e: any) {
      // Fresh CloudKit Development containers may not have query indexes enabled yet.
      // Do not block the invite creation flow; creating a challenge/share is what
      // materializes cloudkit.share so the schema can be promoted to Production.
      if (String(e?.message ?? e).includes('Type is not marked indexable')) {
        setStatuses([]);
      } else {
        throw e;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startCreate = async () => {
    if (statuses.length >= MAX_ACTIVE_CHALLENGES) {
      Alert.alert(
        'three circles',
        'you can be in up to three circles. leave one to start another.'
      );
      return;
    }
    const name = await getDisplayName();
    if (!name || name.trim().length === 0) {
      setPendingCreate(true);
      setNeedsName(true);
      return;
    }
    beginGroupName(name.trim());
  };

  const beginGroupName = (creatorName: string) => {
    setPendingCreatorName(creatorName);
    setNeedsGroupName(true);
  };

  const doCreate = async (creatorName: string, challengeName: string) => {
    setCreating(true);
    try {
      const result = await createChallenge(challengeName, creatorName);
      // Seed UI immediately so inviter sees the circle even if listChallenges fails.
      try {
        const seeded = await loadChallengeStatus(result.challenge);
        setStatuses((prev) => {
          const without = prev.filter(
            (s) =>
              !(
                s.challenge.zoneName === result.challenge.zoneName &&
                s.challenge.ownerName === result.challenge.ownerName
              )
          );
          return [seeded, ...without];
        });
      } catch {
        setStatuses((prev) => {
          const without = prev.filter(
            (s) =>
              !(
                s.challenge.zoneName === result.challenge.zoneName &&
                s.challenge.ownerName === result.challenge.ownerName
              )
          );
          return [
            {
              challenge: result.challenge,
              members: [],
              completionsToday: [],
              selfCompletedToday: false,
              muted: false,
              groupStreak: 0,
            },
            ...without,
          ];
        });
      }
      try {
        await Share.share({
          message: `sit with me. 30 seconds.\n${result.shareURL}`,
          url: result.shareURL,
        });
      } catch {
        // user dismissed share sheet — challenge still created
      }
      await refresh().catch(() => {});
    } catch (e: any) {
      Alert.alert('could not create', e?.message ?? 'try again in a moment');
    } finally {
      setCreating(false);
    }
  };

  const onNameContinue = (name: string) => {
    setNeedsName(false);
    if (pendingCreate) {
      setPendingCreate(false);
      beginGroupName(name);
    }
  };

  const onGroupNameContinue = (groupName: string) => {
    const creatorName = pendingCreatorName;
    setNeedsGroupName(false);
    setPendingCreatorName(null);
    if (creatorName) {
      doCreate(creatorName, groupName);
    }
  };

  const featured = statuses[0];
  const totalToday = featured
    ? new Set(featured.completionsToday.map((c) => c.memberId)).size
    : 0;
  const memberCount = featured?.members.length ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>circle</Text>

        {loading ? (
          <ActivityIndicator color={colors.textFaint} style={{ marginTop: 40 }} />
        ) : featured ? (
          <>
            <View style={styles.constellationWrap}>
              <Constellation
                members={featured.members}
                completions={featured.completionsToday}
                centerLabel={featured.challenge.name}
              />
            </View>
            <Text style={styles.summary}>
              {totalToday === 0
                ? 'no one has sat yet'
                : totalToday === 1
                  ? '1 sat today'
                  : `${totalToday} sat today`}
            </Text>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>no circle yet</Text>
            <Text style={styles.emptyBody}>
              create a circle of friends to meditate. 2–8 people.
            </Text>
          </View>
        )}

        {statuses.length > 0 && (
          <View style={styles.cards}>
            {statuses.map((s) => (
              <ChallengeCard
                key={s.challenge.zoneName}
                status={s}
                onPress={() =>
                  onOpenChallenge(s.challenge.zoneName, s.challenge.ownerName)
                }
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.startBtn}
          onPress={startCreate}
          activeOpacity={0.7}
          disabled={creating}
        >
          <Text style={styles.startBtnText}>
            {creating ? 'creating...' : 'invite'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>back</Text>
        </TouchableOpacity>
      </ScrollView>

      {needsName && (
        <DisplayNamePrompt
          onContinue={onNameContinue}
          onCancel={() => {
            setNeedsName(false);
            setPendingCreate(false);
          }}
        />
      )}

      {needsGroupName && (
        <ChallengeNamePrompt
          onContinue={onGroupNameContinue}
          onCancel={() => {
            setNeedsGroupName(false);
            setPendingCreatorName(null);
          }}
        />
      )}
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
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 36,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 28,
  },
  constellationWrap: {
    marginBottom: 18,
  },
  summary: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.textDim,
    marginBottom: 4,
  },
  streak: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.warm,
    marginBottom: 24,
  },
  cards: {
    width: '100%',
    marginTop: 24,
    marginBottom: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  emptyTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: colors.textDim,
    marginBottom: 10,
  },
  emptyBody: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
  startBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSurface,
  },
  startBtnText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 18,
    color: colors.text,
  },
  backBtn: {
    marginTop: 28,
    paddingVertical: 10,
  },
  backText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: colors.textFaint,
    textDecorationLine: 'underline',
  },
});
