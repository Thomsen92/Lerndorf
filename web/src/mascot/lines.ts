export const VOICE = {
  idle: { file: 'ready', line: 'Ready when you are.' },
  celebrate: { file: 'splendid', line: 'Splendid! Nicely done.' },
  cheeky: { file: 'nearly', line: 'Nearly. Have another go!' },
  support: { file: 'support', line: "Take your time. You've got this." },
  think: { file: 'thinking', line: 'Hmm. Let me think.' },
  surprise: { file: 'surprised', line: 'Oh! Rather impressive.' },
} as const;
export type VoicedReaction = keyof typeof VOICE;
export const LINES = {
  ready: VOICE.idle.line,
  hello:
    "Hello! I'm Sir Byte, your cheeky tutor. At your service... apparently. Welcome to your class village!",
  toHouse: "Let's go to your house!",
  ruin: "Don't worry. Let's build it up again!",
  quests: 'Every day there are new Daily Quests. Just a few short English tasks.',
  coins: 'Right answers earn you coins. Coins buy things for your house.',
  quiz: 'Three little questions. Then you get coins for a new house.',
  buy: 'Splendid! Now buy your new house.',
  place: 'Put it right here. Go on!',
  final: "Now let's do your Daily Quests!",
  board: 'Your Daily Quests are on this board!',
  allDone: "That's all for today. See you tomorrow!",
  allDoneMarket: 'You did all your quests today. Splendid!',
  catchUp: "You can still do yesterday's quests.",
} as const;
export type LineKey = keyof typeof LINES;
/** Recordings of single lines, as file names without folder and extension. */
export const CLIPS: Partial<Record<LineKey, string>> = {
  hello: 'hello',
  ruin: 'ruin',
  quests: 'quests',
  coins: 'coins',
  quiz: 'quiz',
  buy: 'buy',
  place: 'place',
  final: 'final',
  board: 'board',
  catchUp: 'catch-up',
  allDone: 'all-done',
  allDoneMarket: 'all-done-market',
};
export const bubbleSeconds = (text: string, clip: number | null): number =>
  clip === null ? Math.min(8, 2.5 + 0.06 * text.length) : clip + 1.5;
