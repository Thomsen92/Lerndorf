import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  evaluate,
  isPangram,
  precheck,
  rewardFor,
  shuffled,
  wordHash,
  wordPoints,
} from '../../src/minigames/spellingBee/game';

const letters = ['a', 'g', 'i', 'o', 'r', 't'];
const hash = (w: string) =>
  createHash('sha256').update(`lerndorf-spelling:7:${w}`).digest('hex').slice(0, 16);
const puzzle = { id: 7, center: 'l', letters, hashes: ['tall', 'alligator', 'trail'].map(hash) };

describe('spelling bee rules in the browser', () => {
  it('scores like the server: 3 or 4 letters 1 point, longer 1 per letter, pangram +7', () => {
    expect(wordPoints('tal', puzzle)).toBe(1);
    expect(wordPoints('tall', puzzle)).toBe(1);
    expect(wordPoints('trail', puzzle)).toBe(5);
    expect(isPangram('alligator', puzzle)).toBe(true);
    expect(wordPoints('alligator', puzzle)).toBe(9 + 7);
  });

  it('builds the same salted hash as the database', async () => {
    expect(await wordHash(7, 'trail')).toBe(hash('trail'));
  });

  it('says why a word does not count', async () => {
    expect(precheck('ta', puzzle)).toBe('too-short');
    expect(precheck('tal', puzzle)).toBe(null); // three letters are allowed (USA puzzles)
    expect(precheck('roat', puzzle)).toBe('missing-center');
    expect(precheck('lamp', puzzle)).toBe('bad-letter');
    expect(await evaluate('TRAIL', puzzle, new Set())).toBe('ok');
    expect(await evaluate('trail', puzzle, new Set(['trail']))).toBe('already-found');
    expect(await evaluate('toll', puzzle, new Set())).toBe('not-in-list');
  });

  it('shuffles into a new order and mirrors the reward tiers', () => {
    expect(shuffled(letters, () => 0.999).join('')).not.toBe(letters.join(''));
    expect(shuffled(letters).sort()).toEqual(letters);
    expect([0, 1, 9, 10, 24, 25, 39, 40].map((s) => rewardFor(s).coins)).toEqual([0, 4, 4, 6, 6, 8, 8, 10]);
    expect(rewardFor(40).xp).toBe(30);
  });
});
