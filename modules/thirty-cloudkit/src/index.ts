import { requireNativeModule, NativeModule } from 'expo-modules-core';

export interface ChallengeSummary {
  id: string;
  zoneName: string;
  ownerName: string;
  name: string;
  createdAt: number;
  creatorName: string;
  isOwner: boolean;
}

export interface ChallengeMember {
  id: string;
  name: string;
  isSelf: boolean;
}

export interface CompletionEntry {
  memberId: string;
  memberName: string;
  date: string;
  completedAt: number;
}

export interface CreateChallengeResult {
  challenge: ChallengeSummary;
  shareURL: string;
}

type ThirtyCloudKitEvents = {
  onChallengeEntryReceived: (e: { zoneName: string; ownerName: string }) => void;
  onMembershipChanged: (e: { zoneName?: string; ownerName?: string }) => void;
  onCloudKitShareInvite: (e: { shareURL?: string; hasPendingMetadata?: boolean }) => void;
} & Record<string, (...args: any[]) => any>;

interface ThirtyCloudKitModule extends NativeModule<ThirtyCloudKitEvents> {
  isAvailable(): Promise<boolean>;
  getDeviceOwnerName(): Promise<string>;
  getDisplayName(): Promise<string | null>;
  setDisplayName(name: string): Promise<void>;
  listChallenges(): Promise<ChallengeSummary[]>;
  createChallenge(name: string, creatorName: string): Promise<CreateChallengeResult>;
  acceptShare(url: string): Promise<ChallengeSummary>;
  acceptPendingShare(): Promise<ChallengeSummary>;
  hasPendingShareInvite(): Promise<boolean>;
  consumePendingAcceptedShare(): Promise<{ zoneName?: string; ownerName?: string } | null>;
  consumePendingInviteShareURL(): Promise<string | null>;
  getShareURL(zoneName: string, ownerName: string): Promise<string | null>;
  getMembers(zoneName: string, ownerName: string): Promise<ChallengeMember[]>;
  getTodayCompletions(zoneName: string, ownerName: string): Promise<CompletionEntry[]>;
  getCompletionsForDate(
    zoneName: string,
    ownerName: string,
    date: string
  ): Promise<CompletionEntry[]>;
  recordCompletion(
    zoneName: string,
    ownerName: string,
    memberName: string
  ): Promise<string>;
  subscribeToChallenge(zoneName: string, ownerName: string): Promise<string>;
  leaveChallenge(zoneName: string, ownerName: string): Promise<boolean>;
  registerForPushNotifications(): Promise<void>;
}

const ThirtyCloudKit = requireNativeModule<ThirtyCloudKitModule>('ThirtyCloudKit');

export default ThirtyCloudKit;
