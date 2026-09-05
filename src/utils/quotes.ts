const quotes = [
  'still.',
  'enough.',
  'that was yours.',
  'the quiet stayed.',
  'nothing else for a moment.',
  'here.',
  'one breath.',
  'that was the whole thing.',
];

export function getQuote(totalSessions: number): string {
  const day = new Date().toISOString().slice(8, 10);
  const idx = (totalSessions + day.charCodeAt(0)) % quotes.length;
  return quotes[idx];
}
