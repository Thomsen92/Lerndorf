// Package S2: the private quiz seed, its generated SQL block and the four local clips.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  MIGRATION,
  SEED_FILE,
  clipPlan,
  replaceSeedBlock,
  seedSql,
  validateStarterSeed,
  type StarterSeed,
} from '../../scripts/import-season-starter';

const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url));
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

function seed(): StarterSeed {
  const questions = Array.from({ length: 10 }, (_, i) =>
    i < 6
      ? {
          id: `q-${i}`,
          kind: 'odd',
          type: 'choice' as const,
          prompt: 'P',
          options: ['a', 'b', 'c'],
          solution: 'b',
          hint: 'H',
        }
      : {
          id: `q-${i}`,
          kind: 'listening-meaning',
          type: 'listening' as const,
          mode: 'choice' as const,
          speak: `Say ${i}`,
          prompt: 'Listen',
          options: ['x', 'y', 'z'],
          solution: 'z',
          hint: 'H',
        },
  );
  return {
    seasonId: 's1',
    xpPerSolvedQuestion: 10,
    completionBonusXp: 50,
    totalXp: 150,
    voice: 'en-GB-SoniaNeural',
    rate: '-10%',
    questions,
  };
}

describe('season starter seed', () => {
  it('accepts a valid seed and builds the same SQL twice', () => {
    const s = validateStarterSeed(seed());
    expect(seedSql(s)).toBe(seedSql(s));
    expect(seedSql(s)).toContain("'q-0', 1,");
    expect(clipPlan(s)).toHaveLength(4);
  });

  it('rejects broken seeds with a concrete reason', () => {
    const wrongSolution = seed();
    wrongSolution.questions[0].solution = 'nope';
    expect(() => validateStarterSeed(wrongSolution)).toThrow(/q-0: the solution must be exactly one/);
    const duplicate = seed();
    duplicate.questions[1].id = 'q-0';
    expect(() => validateStarterSeed(duplicate)).toThrow(/duplicate id/);
    const short = seed();
    short.questions.pop();
    expect(() => validateStarterSeed(short)).toThrow(/expected 10 questions/);
    const silent = seed();
    delete silent.questions[9].speak;
    expect(() => validateStarterSeed(silent)).toThrow(/spoken text/);
    const greedy = seed();
    greedy.completionBonusXp = 100;
    expect(() => validateStarterSeed(greedy)).toThrow(/completionBonusXp/);
  });

  it('escapes quotes in the generated SQL', () => {
    const s = seed();
    s.questions[0].options = ["it's", 'b', 'c'];
    expect(seedSql(validateStarterSeed(s))).toContain(`it''s`);
  });

  it.runIf(existsSync(SEED_FILE))(
    'keeps migration 0051 and the public clips in step with the private seed',
    () => {
      const real = validateStarterSeed(JSON.parse(readFileSync(SEED_FILE, 'utf8')));
      const migration = readFileSync(MIGRATION, 'utf8');
      expect(replaceSeedBlock(migration, seedSql(real))).toBe(migration);
      for (const clip of clipPlan(real)) {
        const file = join(PUBLIC, clip.path);
        expect(existsSync(file), clip.path).toBe(true);
        expect(statSync(file).size).toBeGreaterThan(1000);
      }
    },
  );

  it('never ships the private seed to the browser', () => {
    expect(existsSync(join(PUBLIC, 'quiz.private.json'))).toBe(false);
    const hint = 'Children say this when they knock on doors at Halloween.';
    const grep = (dir: string): boolean =>
      readdirSync(dir, { withFileTypes: true }).some((e) =>
        e.isDirectory() ? grep(join(dir, e.name)) : readFileSync(join(dir, e.name), 'utf8').includes(hint),
      );
    expect(grep(SRC)).toBe(false);
  });
});
