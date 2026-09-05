import type {
  ChallengeSummary,
  ChallengeMember,
  CompletionEntry,
  CreateChallengeResult,
} from '../../modules/thirty-cloudkit/src';

export type { ChallengeSummary, ChallengeMember, CompletionEntry, CreateChallengeResult };

let nativeModule: any = null;
try {
  nativeModule = require('../../modules/thirty-cloudkit/src').default;
} catch {
  // Native module unavailable (Expo Go, web, etc.) — calls return safe defaults.
  nativeModule = null;
}

export function isCloudKitAvailable(): boolean {
  return nativeModule !== null;
}

export async function isAccountAvailable(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.isAvailable();
  } catch {
    return false;
  }
}

export async function getDeviceOwnerName(): Promise<string> {
  if (!nativeModule) return '';
  try {
    return await nativeModule.getDeviceOwnerName();
  } catch {
    return '';
  }
}

export async function getDisplayName(): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.getDisplayName();
}

export async function setDisplayName(name: string): Promise<void> {
  if (!nativeModule) return;
  return nativeModule.setDisplayName(name);
}

export async function listChallenges(): Promise<ChallengeSummary[]> {
  if (!nativeModule) return [];
  try {
    return await nativeModule.listChallenges();
  } catch (e: any) {
    // In a fresh CloudKit Development schema, CKChallenge may exist but not yet
    // have query indexes. Return an empty list so the user can still create the
    // first CKShare, which materializes `cloudkit.share` for schema deployment.
    if (String(e?.message ?? e).includes('Type is not marked indexable')) {
      return [];
    }
    throw e;
  }
}

export async function createChallenge(
  name: string,
  creatorName: string
): Promise<CreateChallengeResult> {
  if (!nativeModule) throw new Error('CloudKit unavailable');
  return nativeModule.createChallenge(name, creatorName);
}

export async function acceptShare(url: string): Promise<ChallengeSummary> {
  if (!nativeModule) throw new Error('CloudKit unavailable');
  return nativeModule.acceptShare(url);
}

export async function acceptPendingShare(): Promise<ChallengeSummary> {
  if (!nativeModule) throw new Error('CloudKit unavailable');
  return nativeModule.acceptPendingShare();
}

export async function hasPendingShareInvite(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.hasPendingShareInvite();
  } catch {
    return false;
  }
}

export async function consumePendingAcceptedShare(): Promise<{
  zoneName?: string;
  ownerName?: string;
} | null> {
  if (!nativeModule) return null;
  return nativeModule.consumePendingAcceptedShare();
}

export async function consumePendingInviteShareURL(): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.consumePendingInviteShareURL();
}

export async function getShareURL(
  zoneName: string,
  ownerName: string
): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.getShareURL(zoneName, ownerName);
}

export async function getMembers(
  zoneName: string,
  ownerName: string
): Promise<ChallengeMember[]> {
  if (!nativeModule) return [];
  return nativeModule.getMembers(zoneName, ownerName);
}

export async function getTodayCompletions(
  zoneName: string,
  ownerName: string
): Promise<CompletionEntry[]> {
  if (!nativeModule) return [];
  return nativeModule.getTodayCompletions(zoneName, ownerName);
}

export async function getCompletionsForDate(
  zoneName: string,
  ownerName: string,
  date: string
): Promise<CompletionEntry[]> {
  if (!nativeModule) return [];
  return nativeModule.getCompletionsForDate(zoneName, ownerName, date);
}

export async function recordCompletion(
  zoneName: string,
  ownerName: string,
  memberName: string
): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.recordCompletion(zoneName, ownerName, memberName);
}

export async function subscribeToChallenge(
  zoneName: string,
  ownerName: string
): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.subscribeToChallenge(zoneName, ownerName);
}

export async function leaveChallenge(
  zoneName: string,
  ownerName: string
): Promise<boolean> {
  if (!nativeModule) return false;
  return nativeModule.leaveChallenge(zoneName, ownerName);
}

export async function registerForPushNotifications(): Promise<void> {
  if (!nativeModule) return;
  return nativeModule.registerForPushNotifications();
}

export function addEntryListener(
  handler: (e: { zoneName: string; ownerName: string }) => void
): () => void {
  if (!nativeModule) return () => {};
  const sub = nativeModule.addListener('onChallengeEntryReceived', handler);
  return () => sub.remove();
}

export function addMembershipListener(
  handler: (e: { zoneName?: string; ownerName?: string }) => void
): () => void {
  if (!nativeModule) return () => {};
  const sub = nativeModule.addListener('onMembershipChanged', handler);
  return () => sub.remove();
}

export function addCloudKitShareInviteListener(
  handler: (e: { shareURL?: string; hasPendingMetadata?: boolean }) => void
): () => void {
  if (!nativeModule) return () => {};
  const sub = nativeModule.addListener('onCloudKitShareInvite', handler);
  return () => sub.remove();
}
