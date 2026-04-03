import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BreathPattern,
  DEFAULT_BREATH_PATTERN,
} from '../data/breathingPatterns';

const STORE_KEY = 'thirty-v1';
const PREFS_KEY = 'thirty-prefs';

interface SessionEntry {
  date: string;
  duration: number;
}

interface AppData {
  streak: number;
  lastDate: string;
  sessionsToday: number;
  totalSessions: number;
  unlocked: boolean;
  sessionLog: SessionEntry[];
}

export type AmbientSound = 'off' | 'rain' | 'brown' | 'bowl';

export interface Prefs {
  ambientSound: AmbientSound;
  hideTimer: boolean;
  haptics: boolean;
  healthKit: boolean;
  duration: number;
  breathPattern: BreathPattern;
  reminderTime: 'morning' | 'afternoon' | 'evening' | 'off';
  onboardingSeen: boolean;
}

const defaultData: AppData = {
  streak: 0,
  lastDate: '',
  sessionsToday: 0,
  totalSessions: 0,
  unlocked: false,
  sessionLog: [],
};

const defaultPrefs: Prefs = {
  ambientSound: 'rain',
  hideTimer: false,
  haptics: true,
  healthKit: true,
  duration: 30,
  breathPattern: DEFAULT_BREATH_PATTERN,
  reminderTime: 'off',
  onboardingSeen: false,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function getData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? { ...defaultData, ...JSON.parse(raw) } : { ...defaultData };
  } catch {
    return { ...defaultData };
  }
}

async function setData(d: AppData): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(d));
}

export async function getPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...defaultPrefs };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = JSON.parse(raw);
    // Migrate old waves boolean → ambientSound
    if ('waves' in parsed && !('ambientSound' in parsed)) {
      parsed.ambientSound = parsed.waves ? 'rain' : 'off';
      delete parsed.waves;
    }
    // Remove deprecated fields
    delete parsed.waves;
    if (parsed.breathPattern === 'calm') {
      parsed.breathPattern = DEFAULT_BREATH_PATTERN;
    }
    return { ...defaultPrefs, ...parsed };
  } catch {
    return { ...defaultPrefs };
  }
}

export async function setPrefs(p: Prefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export async function getStreak(): Promise<number> {
  const d = await getData();
  return d.streak;
}

export async function getSessionsToday(): Promise<number> {
  const d = await getData();
  if (d.lastDate !== today()) return 0;
  return d.sessionsToday;
}

export async function isUnlocked(): Promise<boolean> {
  if (DEV_UNLOCKED) return true;
  const d = await getData();
  return d.unlocked === true;
}

const FREE_SESSIONS = 3;

// Dev mode — set to true to bypass purchase lock during development
const DEV_UNLOCKED = __DEV__;

export async function canPlay(): Promise<boolean> {
  if (DEV_UNLOCKED) return true;
  const d = await getData();
  return d.unlocked || d.totalSessions < FREE_SESSIONS;
}

export async function getFreeSessions(): Promise<number> {
  const d = await getData();
  if (d.unlocked) return Infinity;
  return Math.max(0, FREE_SESSIONS - d.totalSessions);
}

export async function isPremiumFeature(feature: 'haptics' | 'duration'): Promise<boolean> {
  return await isUnlocked();
}

export const MILESTONES = [7, 14, 30, 60, 90, 180, 365];

export function getMilestoneMessage(streak: number): string | null {
  const messages: Record<number, string> = {
    7: 'one week of showing up',
    14: 'two weeks. the ritual is taking hold',
    30: 'a whole month of stillness',
    60: 'sixty days — this is who you are now',
    90: 'ninety days of returning to yourself',
    180: 'six months of steady presence',
    365: 'one year. you changed your life.',
  };
  return messages[streak] || null;
}

export async function recordSession(duration = 30): Promise<void> {
  const d = await getData();
  const t = today();

  if (d.lastDate === t) {
    d.sessionsToday = (d.sessionsToday || 0) + 1;
  } else {
    d.sessionsToday = 1;
    if (d.lastDate === yesterday()) {
      d.streak = (d.streak || 0) + 1;
    } else {
      d.streak = 1;
    }
  }
  d.lastDate = t;
  d.totalSessions = (d.totalSessions || 0) + 1;
  if (!d.sessionLog) d.sessionLog = [];
  d.sessionLog.push({ date: t, duration });
  await setData(d);
}

export interface SessionStats {
  total: number;
  thisWeek: number;
  longestStreak: number;
  weekDays: boolean[]; // Mon-Sun, true if practiced
}

export async function getSessionStats(): Promise<SessionStats> {
  const d = await getData();
  const log = d.sessionLog || [];

  // This week (Mon-Sun)
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const mondayStr = monday.toISOString().slice(0, 10);

  const weekDates = new Set<string>();
  for (const entry of log) {
    if (entry.date >= mondayStr) weekDates.add(entry.date);
  }

  const weekDays: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d2 = new Date(monday);
    d2.setDate(monday.getDate() + i);
    weekDays.push(weekDates.has(d2.toISOString().slice(0, 10)));
  }

  // Longest streak from log
  const uniqueDates = [...new Set(log.map((e) => e.date))].sort();
  let longest = 0;
  let current = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
  }

  return {
    total: d.totalSessions,
    thisWeek: weekDates.size,
    longestStreak: Math.max(longest, d.streak),
    weekDays,
  };
}

export async function hasPracticedToday(): Promise<boolean> {
  const d = await getData();
  return d.lastDate === today();
}

export async function unlock(): Promise<void> {
  const d = await getData();
  d.unlocked = true;
  await setData(d);
}
