import { it, expect } from 'vitest';
import { listeningPath, LISTENING_VOICE, LISTENING_RATE } from '../../src/quests/listening';
it('uses the agreed voice and rate and stable paths shared by browser and importer', () => {
  expect(LISTENING_VOICE).toBe('en-GB-SoniaNeural');
  expect(LISTENING_RATE).toBe('-10%');
  expect(listeningPath('Hello!')).toMatch(/^assets\/listening\/[0-9a-f]{8}\.mp3$/);
  expect(listeningPath('Hello!')).toBe(listeningPath('Hello!'));
  for (const path of [
    listeningPath('Hello?'),
    listeningPath('Hello!', 'en-GB-RyanNeural'),
    listeningPath('Hello!', undefined, '+0%'),
  ])
    expect(path).not.toBe(listeningPath('Hello!'));
});
