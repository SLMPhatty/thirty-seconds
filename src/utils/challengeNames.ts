const prefixes = ['the', 'team', 'club', 'squad', 'crew'];

const adjectives = [
  'morning',
  'midnight',
  'silent',
  'still',
  'calm',
  'gentle',
  'cosmic',
  'tiny',
  'peaceful',
  'brave',
];

const nouns = [
  'crew',
  'circle',
  'squad',
  'breathers',
  'collective',
  'monks',
  'seekers',
  'stillness',
  'pause',
  'calm',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateChallengeName(): string {
  const usePrefix = Math.random() < 0.6;
  const adj = pick(adjectives);
  const noun = pick(nouns);

  if (usePrefix) {
    const prefix = pick(prefixes);
    if (prefix === 'the') return `the ${adj} ${noun}`;
    return `${prefix} ${noun}`;
  }
  return `${adj} ${noun}`;
}
