import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { packageToRows, validatePackage, type WeekPackage } from '../../scripts/quests';
function week() {
  return JSON.parse(
    readFileSync(new URL('../fixtures/quests/2026-11-09.json', import.meta.url), 'utf8'),
  ) as Extract<WeekPackage, { days: unknown }>;
}
it.each(['gap', 'listening'] as const)(
  'passes the word bank through for %s, keeping the solution private',
  (type) => {
    const pkg = week(),
      q = pkg.days[0].quests[1];
    Object.assign(q, {
      type,
      mode: 'gap',
      speak: 'Yesterday we went to Brooklyn.',
      bank: ['went', 'go', 'gone'],
    });
    expect(validatePackage(pkg)).toEqual([]);
    const rows = packageToRows(pkg),
      row = rows.quests[1];
    expect(row.data.bank).toEqual(['went', 'go', 'gone']);
    expect(row.data).not.toHaveProperty('solution');
    expect(row.data).not.toHaveProperty('audio');
    expect(rows.solutions[1].solution).toEqual(['went']);
  },
);
it.each(
  [[], ['went'], ['went', 'went'], ['went', ' '], ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 'went'].map(
    (bank) => ({ bank }),
  ),
)('rejects malformed word banks $bank', ({ bank }) => {
  const pkg = week();
  Object.assign(pkg.days[0].quests[1], { bank });
  expect(validatePackage(pkg).join()).toContain('days[0].quests[1].bank');
});
it('requires a word bank for every gap since 28.10.2026 (one tap on tablets)', () => {
  const pkg = week();
  expect(validatePackage(pkg)).toEqual([]);
  expect(packageToRows(pkg).quests[1].data).toEqual({ bank: ['go', 'went', 'gone'] });
  delete (pkg.days[0].quests[1] as { bank?: string[] }).bank;
  expect(validatePackage(pkg).join()).toContain('days[0].quests[1].bank: 2 bis 6 verschiedene Wörter');
});
it('rejects a word bank without a correct answer to tap', () => {
  const pkg = week();
  Object.assign(pkg.days[0].quests[1], { bank: ['go', 'gone', 'goes'] });
  expect(validatePackage(pkg)).toContain('days[0].quests[1].bank: muss eine richtige Lösung enthalten');
  Object.assign(pkg.days[0].quests[1], { bank: ['go', ' Went '] });
  expect(validatePackage(pkg)).toEqual([]);
});
