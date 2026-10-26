import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  packageToRows,
  shuffleAway,
  validatePackage,
  type WeekPackage,
} from '../../scripts/quests.ts';

const load = (name: string): WeekPackage =>
  JSON.parse(readFileSync(new URL(`../fixtures/quests/${name}`, import.meta.url), 'utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const week = () => load('2026-11-09.json') as Extract<WeekPackage, { days: unknown }>;

/** Applies a mutation to a fresh copy of the valid week and returns the validator errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorsAfter(mutate: (w: any) => void, fileName?: string): string {
  const w = clone(week());
  mutate(w);
  return validatePackage(w, fileName).join('\n');
}

describe('validatePackage', () => {
  it('accepts the valid week and the holiday file', () => {
    expect(validatePackage(load('2026-11-09.json'), '2026-11-09.json')).toEqual([]);
    expect(validatePackage(load('2026-11-02.json'), '2026-11-02.json')).toEqual([]);
  });

  it('rejects broken weeks with the path in the message', () => {
    expect(errorsAfter((w) => (w.week = '2026-11-10'))).toContain('week: muss ein Montag sein');
    expect(errorsAfter((w) => w.days.pop())).toContain('days: genau 7 Tage');
    expect(errorsAfter((w) => (w.days[2].date = '2026-11-12'))).toContain(
      'days[2].date: 2026-11-11 erwartet',
    );
    expect(errorsAfter((w) => w.days[0].quests.pop())).toContain('days[0].quests: 3 bis 4 Aufgaben');
    expect(errorsAfter((w) => (w.days[1].quests[0].id = 'mon-1'))).toContain('kommt doppelt vor');
    expect(errorsAfter((w) => (w.days[0].quests[0].type = 'essay'))).toContain('days[0].quests[0].type');
  });

  it.each([0, 21, 7.5])('rejects reward %s', (reward) => {
    expect(errorsAfter((w) => (w.days[0].quests[0].reward = reward))).toContain(
      'days[0].quests[0].reward',
    );
  });

  it('rejects an empty hint', () => {
    expect(errorsAfter((w) => (w.days[0].quests[0].hint = ' '))).toContain('days[0].quests[0].hint');
  });

  it('rejects type specific mistakes', () => {
    expect(errorsAfter((w) => (w.days[0].quests[0].solution = 'nope'))).toContain(
      'days[0].quests[0].solution: muss in options stehen',
    );
    expect(errorsAfter((w) => (w.days[0].quests[1].prompt = 'No gap here.'))).toContain(
      'days[0].quests[1].prompt: muss ___ enthalten',
    );
    expect(errorsAfter((w) => (w.days[0].quests[2].pairs[1][0] = 'bridge'))).toContain(
      'days[0].quests[2].pairs: doppeltes Wort',
    );
    expect(errorsAfter((w) => (w.days[0].quests[2].pairs[1][1] = 'Brücke'))).toContain(
      'days[0].quests[2].pairs: doppeltes Wort',
    );
    expect(errorsAfter((w) => (w.days[1].quests[0].solution = ['the']))).toContain(
      'days[1].quests[0].solution',
    );
    expect(errorsAfter((w) => delete w.days[1].quests[1].speak)).toContain('days[1].quests[1].speak');
    expect(errorsAfter((w) => (w.days[1].quests[1].mode = 'match'))).toContain(
      'days[1].quests[1].mode',
    );
  });

  it('checks the file name against the week', () => {
    expect(validatePackage(load('2026-11-09.json'), '2026-11-16.json').join()).toContain(
      'Dateiname: 2026-11-09.json erwartet',
    );
  });

  it('rejects a holiday file with days', () => {
    const bad = { ...load('2026-11-02.json'), days: [] };
    expect(validatePackage(bad).join()).toContain('days: Feiertagsdatei darf keine Tage enthalten');
  });
});

describe('packageToRows', () => {
  const { quests, solutions } = packageToRows(load('2026-11-09.json'));

  it('creates 21 quests with unique keys and slots 1-3', () => {
    expect(quests).toHaveLength(21);
    expect(solutions).toHaveLength(21);
    expect(new Set(quests.map((q) => q.key)).size).toBe(21);
    expect(quests.find((q) => q.key === '2026-11-10-tue-2')?.slot).toBe(2);
    for (const q of quests) expect([1, 2, 3]).toContain(q.slot);
    expect(solutions.map((s) => s.quest_key)).toEqual(quests.map((q) => q.key));
  });

  it('keeps solutions out of the public data', () => {
    for (const q of quests) expect(JSON.stringify(q.data)).not.toContain('solution');
    const sol = (key: string) => solutions.find((s) => s.quest_key === key)?.solution;
    expect(sol('2026-11-10-tue-1')).toEqual(['the', 'dog', 'sees', 'the', 'cat']);
    expect(sol('2026-11-10-tue-3')).toBe('apple');
    expect(sol('2026-11-11-wed-1')).toEqual(['the station']);
    expect(sol('2026-11-10-tue-2')).toBe('the station');
    expect(sol('2026-11-09-mon-3')).toEqual([
      ['bridge', 'Brücke'],
      ['street', 'Straße'],
      ['river', 'Fluss'],
    ]);
  });

  it('shuffles order words and match right column away from the solution', () => {
    const order = quests.find((q) => q.type === 'order')!;
    const words = order.data.words as string[];
    const sol = solutions.find((s) => s.quest_key === order.key)!.solution as string[];
    expect([...words].sort()).toEqual([...sol].sort());
    expect(words).not.toEqual(sol);

    const match = quests.find((q) => q.type === 'match')!;
    const pairs = solutions.find((s) => s.quest_key === match.key)!.solution as string[][];
    expect(match.data.left).toEqual(pairs.map((p) => p[0]));
    expect([...(match.data.right as string[])].sort()).toEqual(pairs.map((p) => p[1]).sort());
    expect(match.data.right).not.toEqual(pairs.map((p) => p[1]));
  });

  it('puts listening data in the public row', () => {
    const l = quests.find((q) => q.key === '2026-11-10-tue-2')!;
    expect(l.data).toEqual({
      speak: 'The girl is going to the station.',
      mode: 'choice',
      options: ['the station', 'the school', 'the park'],
    });
  });

  it('is deterministic', () => {
    expect(packageToRows(load('2026-11-09.json'))).toEqual({ quests, solutions });
  });

  it('returns nothing for a holiday', () => {
    expect(packageToRows(load('2026-11-02.json'))).toEqual({ quests: [], solutions: [] });
  });
});

describe('shuffleAway', () => {
  it('is deterministic and never returns the input order', () => {
    const list = ['a', 'b', 'c'];
    expect(shuffleAway(list, 'k')).toEqual(shuffleAway(list, 'k'));
    for (const seed of ['k', 'x', 'y', 'z', '1', '2']) {
      expect(shuffleAway(list, seed)).not.toEqual(list);
      expect([...shuffleAway(list, seed)].sort()).toEqual(list);
    }
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('swaps two elements', () => {
    expect(shuffleAway(['a', 'b'], 'k')).toEqual(['b', 'a']);
  });
});
