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
  hello: "Hello! I'm Sir Byte.",
  welcome: 'Welcome to Lerndorf, your class village!',
  toHouse: "Let's go to your house!",
  ruin: "Oh no, your house is a ruin! Let's fix it.",
  quests: 'Every day there are Daily Quests. They are short English tasks.',
  coins: 'Right answers give you coins. You can buy things for your house.',
  quiz: 'Answer five easy questions. Then you get coins for a new house.',
  buy: 'Well done! Now buy the new house.',
  place: 'Put your new house here.',
  final: "Now let's do your Daily Quests!",
  board: 'Your Daily Quests are on this board!',
  allDone: "That's all for today. See you tomorrow!",
  allDoneMarket: 'You did all your quests today. Splendid!',
  catchUp: "You can still do yesterday's quests.",
} as const;
export type LineKey = keyof typeof LINES;
export const bubbleSeconds = (text: string, clip: number | null): number =>
  clip === null ? Math.min(8, 2.5 + 0.06 * text.length) : clip + 1.5;
