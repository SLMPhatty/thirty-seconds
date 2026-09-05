const modifiers = [
  'air',
  'amber',
  'aurora',
  'balance',
  'breath',
  'calm',
  'cedar',
  'clear',
  'cloud',
  'deep',
  'dawn',
  'drift',
  'ease',
  'ember',
  'flow',
  'gentle',
  'golden',
  'hush',
  'inner',
  'lotus',
  'lunar',
  'mindful',
  'quiet',
  'soft',
  'zen',
] as const;

const roots = [
  'breath',
  'pause',
  'still',
  'focus',
  'mantra',
  'lotus',
  'inhale',
  'exhale',
  'present',
  'center',
  'ground',
  'flow',
  'calm',
  'mind',
  'heart',
  'chime',
  'bell',
  'om',
  'light',
  'space',
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMeditationHandle(): string {
  const modifier = pick(modifiers);
  const root = pick(roots);
  if (modifier === root) return root;
  return `${modifier}${root}`;
}

export const MEDITATION_HANDLE_POOL_SIZE = modifiers.length * roots.length;
