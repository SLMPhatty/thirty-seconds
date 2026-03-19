const quotes = [
  'the quiet was always there',
  'you chose to pause — that matters',
  'nothing needed to change',
  'thirty seconds, fully yours',
  'the stillness stays with you',
  'that was enough',
  "you don't need to do more",
  'this moment was complete',
  "rest is not a reward — it's a right",
  'the breath knows the way',
  'you just gave yourself a gift',
  'silence has its own answer',
  'even mountains rest',
  'thirty seconds of truth',
  "you were here. that's everything",
];

export function getQuote(totalSessions: number): string {
  const day = new Date().toISOString().slice(8, 10);
  const idx = (totalSessions + day.charCodeAt(0)) % quotes.length;
  return quotes[idx];
}
