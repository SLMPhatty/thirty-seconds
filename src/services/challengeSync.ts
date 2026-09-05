import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as CK from './cloudkit';
import type {
  ChallengeSummary,
  ChallengeMember,
  CompletionEntry,
} from './cloudkit';

export const MAX_ACTIVE_CHALLENGES = 3;
export const MAX_MEMBERS = 8;

const MUTE_PREFIX = 'thirty.challenge.mute.';
const RECORDED_PREFIX = 'thirty.challenge.recorded.';
const GROUP_STREAK_PREFIX = 'thirty.challenge.groupStreak.';
const MILESTONE_PREFIX = 'thirty.challenge.milestone.';
const NUDGE_KIND = 'challenge-nudge';

const MILESTONE_COPY: Record<number, string> = {
  1: 'the circle sat together.',
  7: 'a week of sitting together.',
  30: 'a month of sitting together.',
};

interface ChallengeStatus {
  challenge: ChallengeSummary;
  members: ChallengeMember[];
  completionsToday: CompletionEntry[];
  selfCompletedToday: boolean;
  muted: boolean;
  groupStreak: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getMuted(zoneName: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(MUTE_PREFIX + zoneName);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setMuted(zoneName: string, muted: boolean): Promise<void> {
  await AsyncStorage.setItem(MUTE_PREFIX + zoneName, muted ? '1' : '0');
}

export async function getGroupStreak(zoneName: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(GROUP_STREAK_PREFIX + zoneName);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function setGroupStreak(zoneName: string, streak: number): Promise<void> {
  await AsyncStorage.setItem(GROUP_STREAK_PREFIX + zoneName, String(streak));
}

const LEGACY_WIPE_KEY = 'thirty.circle.legacyWipe.v1';

/** One-time: delete leftover Challenges-WIP circles from iCloud. Empty until invite or join. */
export async function wipeLegacyCirclesOnce(): Promise<void> {
  const done = await AsyncStorage.getItem(LEGACY_WIPE_KEY);
  if (done === '1') return;
  try {
    const all = await CK.listChallenges();
    await Promise.all(
      all.map((c) => CK.leaveChallenge(c.zoneName, c.ownerName).catch(() => false))
    );
  } catch {
    // listing can fail on a fresh schema — still mark so we do not loop
  }
  await AsyncStorage.setItem(LEGACY_WIPE_KEY, '1');
}

export async function loadActiveChallenges(): Promise<ChallengeSummary[]> {
  const all = await CK.listChallenges();
  return all.slice(0, MAX_ACTIVE_CHALLENGES);
}

export async function loadChallengeStatus(
  challenge: ChallengeSummary
): Promise<ChallengeStatus> {
  const [members, completionsToday, muted, groupStreak] = await Promise.all([
    CK.getMembers(challenge.zoneName, challenge.ownerName),
    CK.getTodayCompletions(challenge.zoneName, challenge.ownerName),
    getMuted(challenge.zoneName),
    getGroupStreak(challenge.zoneName),
  ]);

  const selfId = members.find((m) => m.isSelf)?.id;
  const selfCompletedToday = selfId
    ? completionsToday.some((c) => c.memberId === selfId)
    : false;

  return {
    challenge,
    members,
    completionsToday,
    selfCompletedToday,
    muted,
    groupStreak,
  };
}

export async function recordChallengeCompletions(
  displayName: string
): Promise<void> {
  const challenges = await CK.listChallenges();
  const today = todayKey();

  await Promise.all(
    challenges.map(async (c) => {
      const recordedKey = RECORDED_PREFIX + c.zoneName + '.' + today;
      const already = await AsyncStorage.getItem(recordedKey);
      if (already === '1') return;
      try {
        await CK.recordCompletion(c.zoneName, c.ownerName, displayName);
        await AsyncStorage.setItem(recordedKey, '1');
        // no group streak — a missed day by one person does not break anything
      } catch {
        // network/offline — CloudKit's own queue will retry. We don't mark recorded
        // so we'll try again on next session/app open.
      }
    })
  );
}

async function updateGroupStreakIfAllComplete(
  challenge: ChallengeSummary
): Promise<void> {
  try {
    const [members, completions] = await Promise.all([
      CK.getMembers(challenge.zoneName, challenge.ownerName),
      CK.getTodayCompletions(challenge.zoneName, challenge.ownerName),
    ]);
    const completedIds = new Set(completions.map((c) => c.memberId));
    const allDone = members.length > 0 && members.every((m) => completedIds.has(m.id));
    if (allDone) {
      const cur = await getGroupStreak(challenge.zoneName);
      const next = cur + 1;
      await setGroupStreak(challenge.zoneName, next);
      await maybeFireMilestone(challenge, next);
    }
  } catch {
    // ignore
  }
}

async function maybeFireMilestone(
  challenge: ChallengeSummary,
  streak: number
): Promise<void> {
  const body = MILESTONE_COPY[streak];
  if (!body) return;
  const muted = await getMuted(challenge.zoneName);
  if (muted) return;
  const firedKey = `${MILESTONE_PREFIX}${challenge.zoneName}.${streak}`;
  const alreadyFired = await AsyncStorage.getItem(firedKey);
  if (alreadyFired === '1') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: challenge.name,
        body,
        sound: true,
        data: { kind: 'challenge-milestone', zoneName: challenge.zoneName, streak },
      },
      trigger: null,
    });
    await AsyncStorage.setItem(firedKey, '1');
  } catch {
    // ignore
  }
}

export async function ensureDisplayName(fallback?: string): Promise<string | null> {
  const existing = await CK.getDisplayName();
  if (existing && existing.trim().length > 0) return existing;
  if (fallback) {
    await CK.setDisplayName(fallback);
    return fallback;
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'name must be at least 2 characters';
  if (trimmed.length > 30) return 'name must be 30 characters or fewer';
  return null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const firstName = (memberName: string): string => {
  const n = (memberName || 'someone').trim().split(/\s+/)[0];
  return n || 'someone';
};

function circleDingBody(names: string[]): string {
  const uniq = [...new Set(names.map(firstName).filter(Boolean))];
  if (uniq.length === 0) return 'someone was still.';
  if (uniq.length === 1) return `${uniq[0]} was still.`;
  if (uniq.length === 2) return `${uniq[0]} and ${uniq[1]} were still.`;
  return `${uniq.slice(0, -1).join(', ')}, and ${uniq[uniq.length - 1]} were still.`;
}

export async function handleIncomingChallengeEntry(
  zoneName: string,
  ownerName: string
): Promise<void> {
  const muted = await getMuted(zoneName);
  if (muted) return;
  try {
    const [members, completionsToday] = await Promise.all([
      CK.getMembers(zoneName, ownerName),
      CK.getTodayCompletions(zoneName, ownerName),
    ]);
    if (completionsToday.length === 0) return;
    const latest = completionsToday.reduce((a, b) =>
      b.completedAt > a.completedAt ? b : a
    );
    const self = members.find((m) => m.isSelf);
    if (self && latest.memberId === self.id) return;

    const windowMs = 10 * 60 * 1000;
    const recent = completionsToday.filter((c) => latest.completedAt - c.completedAt <= windowMs);
    const names = recent
      .filter((c) => !self || c.memberId !== self.id)
      .map((c) => c.memberName || 'someone');
    if (names.length === 0) return;
    const body = circleDingBody(names);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'thirty',
        body,
        sound: true,
        data: { kind: 'challenge-entry', zoneName, ownerName },
      },
      trigger: null,
    });
  } catch {
    // swallow — best-effort notification
  }
}

export function subscribeToAllChallenges(
  challenges: ChallengeSummary[]
): Promise<void> {
  return Promise.all(
    challenges.map((c) => CK.subscribeToChallenge(c.zoneName, c.ownerName))
  ).then(() => undefined);
}

async function cancelChallengeNudge(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === NUDGE_KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function refreshChallengeNudge(): Promise<void> {
  await cancelChallengeNudge();
  try {
    const challenges = await loadActiveChallenges();
    if (challenges.length === 0) return;

    // Build a snapshot for the body. We schedule one nudge at 6 PM
    // using the current state — Yoda copy with the leading challenge's progress.
    const top = challenges[0];
    const [members, completions] = await Promise.all([
      CK.getMembers(top.zoneName, top.ownerName),
      CK.getTodayCompletions(top.zoneName, top.ownerName),
    ]);
    const completedCount = new Set(completions.map((c) => c.memberId)).size;
    const total = members.length;
    const self = members.find((m) => m.isSelf);
    const selfDone = self ? completions.some((c) => c.memberId === self.id) : false;

    // Don't nudge if you're done or no one else has practiced.
    if (selfDone || completedCount === 0 || total === 0) return;

    const muted = await getMuted(top.zoneName);
    if (muted) return;

    const body = 'the circle sat today. 30 seconds, if you want.';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: top.name,
        body,
        sound: true,
        data: { kind: NUDGE_KIND, zoneName: top.zoneName },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  } catch {
    // ignore
  }
}

export type { ChallengeSummary, ChallengeMember, CompletionEntry, ChallengeStatus };
