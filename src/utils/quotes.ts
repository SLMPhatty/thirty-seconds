const quotes = [
  'always there, the quiet was',
  'chose to pause, you did — matters, that does',
  'needed to change, nothing did',
  'thirty seconds, fully yours they were',
  'stay with you, the stillness will',
  'enough, that was',
  'do more, you need not',
  'complete, this moment was',
  'a reward, rest is not — a right, it is',
  'knows the way, the breath does',
  'a gift, you just gave yourself',
  'its own answer, silence has',
  'even mountains, rest they must',
  'thirty seconds of truth, that was',
  'here, you were — everything, that is',
];

export function getQuote(totalSessions: number): string {
  const day = new Date().toISOString().slice(8, 10);
  const idx = (totalSessions + day.charCodeAt(0)) % quotes.length;
  return quotes[idx];
}
