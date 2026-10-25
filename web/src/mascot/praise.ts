import { VOICE, type VoicedReaction } from './lines';
export interface Praise {
  text: string;
  reaction: 'celebrate' | 'surprise';
  voice?: VoicedReaction;
}
const PRAISE: readonly Praise[] = [
  { text: VOICE.celebrate.line, reaction: 'celebrate', voice: 'celebrate' },
  { text: "That's right!", reaction: 'celebrate' },
  { text: 'Nice work!', reaction: 'celebrate' },
  { text: VOICE.surprise.line, reaction: 'surprise', voice: 'surprise' },
  { text: 'Well done!', reaction: 'celebrate' },
  { text: 'You got it!', reaction: 'celebrate' },
  { text: 'Brilliant!', reaction: 'surprise' },
  { text: 'Keep it up!', reaction: 'celebrate' },
];
/** Shared across quest windows and the tutorial: closing a window does not restart the same praise. */
export function createPraiseSequence(now: () => number = Date.now): () => Praise {
  let index = 0,
    lastVoice: VoicedReaction | undefined,
    lastSpoken = -Infinity;
  return () => {
    const choice = PRAISE[index++ % PRAISE.length];
    if (!choice.voice || now() - lastSpoken < 20000 || choice.voice === lastVoice)
      return { text: choice.text, reaction: choice.reaction };
    lastVoice = choice.voice;
    lastSpoken = now();
    return { ...choice };
  };
}
export const nextPraise = createPraiseSequence();
